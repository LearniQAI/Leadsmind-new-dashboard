import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
export const dynamic = 'force-dynamic';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function extractAudioFromVideo(videoFile: File): Promise<File> {
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const ext = path.extname(videoFile.name) || '.mp4';
  const inputPath = path.join(tempDir, `vid-${randomSuffix}${ext}`);
  const outputPath = path.join(tempDir, `aud-${randomSuffix}.mp3`);

  // Write video file to temp disk
  const arrayBuffer = await videoFile.arrayBuffer();
  fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

  try {
    // Run FFmpeg to strip video and convert audio to mp3
    const command = `ffmpeg -y -i "${inputPath}" -vn -acodec libmp3lame -q:a 4 "${outputPath}"`;
    console.log(`[FFmpeg Extraction] Executing command: ${command}`);
    await execAsync(command);

    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg processing did not output an MP3 file.');
    }

    // Read the output MP3 file
    const mp3Buffer = fs.readFileSync(outputPath);
    const mp3Blob = new Blob([mp3Buffer]);
    const mp3File = new File([mp3Blob], `${path.basename(videoFile.name, ext)}.mp3`, { type: 'audio/mp3' });

    // Clean up files
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}

    return mp3File;
  } catch (err: any) {
    console.error('[FFmpeg Extraction Failed]:', err);
    // Cleanup input if exists
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
    
    // Fall back to original file if size is under 25MB
    if (videoFile.size <= 25 * 1024 * 1024) {
      console.log('[FFmpeg Fallback] File is under 25MB. Processing video file directly with Whisper.');
      return videoFile;
    }
    
    throw new Error('Video file exceeds 25MB limit and FFmpeg extraction is unavailable or failed.');
  }
}

export async function POST(req: Request) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized administrative access' }, { status: 401 });

    const supabase = await createServerClient();
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file uploaded.' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/') || 
                    /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(file.name);

    let fileToProcess = file;
    if (isVideo) {
      console.log(`[Voice Import] Video file detected: ${file.name} (${file.type}). Extracting audio...`);
      try {
        fileToProcess = await extractAudioFromVideo(file);
      } catch (extractError: any) {
        console.error('[Voice Import] Video extraction failed:', extractError);
        return NextResponse.json({ error: extractError.message || 'Failed to extract audio from video.' }, { status: 400 });
      }
    }

    // 1. Telemetry Log Job Initialisation
    const { data: job, error: jErr } = await supabase.from('blog_social_imports').insert({
      workspace_id: wsId,
      import_type: 'voice',
      status: 'queued'
    }).select().single();

    if (jErr) return NextResponse.json({ error: `Failed to initialize job: ${jErr.message}` }, { status: 500 });

    try {
      await supabase.from('blog_social_imports').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);

      // 2. Universal Speech Processing (Whisper API Ingestion)
      const whisperFormData = new FormData();
      whisperFormData.append('file', fileToProcess);
      whisperFormData.append('model', 'whisper-1');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: whisperFormData
      });

      if (!whisperResponse.ok) {
        const errText = await whisperResponse.text();
        throw new Error(`Whisper transcription failed: ${errText}`);
      }

      const { text: rawTranscript } = await whisperResponse.json();
      if (!rawTranscript.trim()) throw new Error('Speech processing returned an empty transcript.');

      // 3. Article Generation Core (GPT-4o-mini Purging Spoken Filler Words)
      const prompt = `You are a professional editor. The following is a raw verbal transcript captured via microphone recording.
Clean up all spoken filler words (such as "uh", "um", "like", "so", "actually", etc.), correct structural syntax, and transform the spoken ideas into a highly professional, engaging informational article of 800 to 1,200 words.

Linguistic Requirement: You MUST write using South African / UK spelling protocols (e.g. colour, organisation, optimised, centre, behaviour, programme).

Output MUST be a strict, valid JSON object matching this structure:
{
  "title": "An optimised UK/South African styled article title based on transcript concepts",
  "metaDescription": "SEO Meta description preview under 160 characters",
  "introduction": "An engaging, comprehensive introduction paragraph summarizing the spoken ideas",
  "sections": [
    {
      "heading": "Heading Title (H2 level)",
      "content": "Deep, rich, multi-paragraph content discussing this concept in depth"
    }
  ],
  "conclusion": "A compelling conclusion summarizing final highlights"
}

Verbal Transcript:
"${rawTranscript}"`;

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You only output strict JSON based on context.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!gptResponse.ok) {
        const errText = await gptResponse.text();
        throw new Error(`GPT-4o-mini generation failed: ${errText}`);
      }

      const result = await gptResponse.json();
      const blog = JSON.parse(result.choices[0].message.content);

      // Build HTML body
      const postBodyHtml = `
        <p>${blog.introduction || ''}</p>
        ${(blog.sections || []).map((s: any) => `<h2>${s.heading}</h2><p>${s.content}</p>`).join('\n')}
        <h2>Conclusion</h2>
        <p>${blog.conclusion || ''}</p>
      `;

      const postBodyPlain = `${blog.introduction || ''}\n\n${(blog.sections || []).map((s: any) => `${s.heading}\n${s.content}`).join('\n\n')}\n\nConclusion\n${blog.conclusion || ''}`;

      const slug = `voice-${Math.floor(Math.random() * 100000)}`;

      // 4. Create Draft Blog Post in Database
      const { data: post, error: pErr } = await supabase.from('blog_posts').insert({
        workspace_id: wsId,
        author_id: user.id,
        title: blog.title || 'Voice Transcribed Article',
        slug,
        summary: blog.metaDescription || 'Voice transcription draft content.',
        body_html: postBodyHtml,
        body_plain: postBodyPlain,
        status: 'draft',
        seo_title: blog.title || 'Voice Transcribed Article',
        target_keyword: 'optimised'
      }).select().single();

      if (pErr) throw new Error(`Draft saving failed: ${pErr.message}`);

      // Complete job log
      await supabase.from('blog_social_imports').update({
        status: 'completed',
        post_id: post.id,
        updated_at: new Date().toISOString()
      }).eq('id', job.id);

      revalidatePath('/blog');
      revalidatePath('/blog/manage');

      return NextResponse.json({ success: true, postId: post.id });

    } catch (err: any) {
      console.error('[Voice Import Pipeline Failed]:', err);
      await supabase.from('blog_social_imports').update({
        status: 'failed',
        error_message: err.message || 'Voice orchestration pipeline failure.',
        updated_at: new Date().toISOString()
      }).eq('id', job.id);

      return NextResponse.json({ error: err.message || 'Voice ingestion pipeline failed.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server crash during voice ingestion.' }, { status: 500 });
  }
}
