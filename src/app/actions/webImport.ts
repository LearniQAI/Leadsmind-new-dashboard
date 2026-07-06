'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { convert } from 'html-to-text';
import { logger } from '@/shared/logger';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Rewrite google doc links to public export html
function checkAndFormatGoogleDocUrl(url: string): string {
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch) {
    const docId = docMatch[1];
    return `https://docs.google.com/document/d/${docId}/export?format=html`;
  }
  return url;
}

// Convert transcript to structured JSON blog using GPT-4o-mini with South African spelling protocols
async function transformScrapedTextToBlog(scrapedText: string, sourceUrl: string) {
  const prompt = `You are a professional copywriter. A user has imported content from an external source: "${sourceUrl}".
Transform this scraped text into a highly-optimized, beautifully structured SEO blog post of 800 to 1,200 words.
Keep the core message, but make the language highly professional and correct all structural/formatting issues.

Linguistic Requirement: You MUST write using South African / UK spelling protocols.
For example, use words like:
- "colour" (instead of color)
- "organisation" (instead of organization)
- "optimised" (instead of optimized)
- "behaviour" (instead of behavior)
- "centre" (instead of center)
- "programme" (instead of program)

Output MUST be a valid JSON object matching this exact structure:
{
  "title": "An optimised SEO Title matching South African conventions",
  "metaDescription": "A summary preview of the post, maximum 160 characters",
  "introduction": "An engaging introductory section summarizing the key insights",
  "sections": [
    {
      "heading": "Heading Title (H2 level)",
      "content": "Rich, multi-paragraph, detailed body content discussing this topic in depth"
    }
  ],
  "conclusion": "A compelling conclusion section summarizing final highlights"
}

Legal and copyright requirement: Keep the tone informative and educational. Do not plagiarize verbatim unless quoting.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        { role: 'user', content: `${prompt}\n\nScraped Text Content:\n${scrapedText.substring(0, 12000)}` }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ errText, sourceUrl }, 'web_import.openai_generation.request_failed');
    throw new Error('AI blog generation failed.');
  }

  const result = await response.json();
  const parsedBlog = JSON.parse(result.choices[0].message.content);
  
  return parsedBlog;
}

export async function importWebPageAction(url: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const user = await getUser();
    if (!user) return { error: 'Unauthorized administrative access' };

    const supabase = await createServerClient();
    const targetUrl = checkAndFormatGoogleDocUrl(url);

    // Fetch the URL
    logger.info({ targetUrl }, 'web_import.url.fetch_start');
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return { error: `Failed to fetch URL: HTTP ${response.status}` };
    }

    const html = await response.text();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Extract basic page metadata for cover image and title backup
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Imported Web Article';
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || 'Imported web page draft.';

    // Clean up common boilerplate wrappers
    $('nav, header, footer, script, style, iframe, noscript, svg, form, input, button, select, textarea, .sidebar, #sidebar, .nav, #nav, .menu, #menu, .footer, #footer, .header, #header').remove();

    // Target main article structures if possible, otherwise use body
    const mainSelector = $('article').length > 0 ? 'article' : $('main').length > 0 ? 'main' : 'body';
    const cleanHtml = $(mainSelector).html() || html;

    // Convert html to text
    const textContent = convert(cleanHtml, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' }
      ]
    });

    if (!textContent.trim()) {
      return { error: 'Document conversion returned empty content. No readable text could be scraped.' };
    }

    // AI synthesis
    logger.info({ url }, 'web_import.text_to_blog.transform_start');
    const blog = await transformScrapedTextToBlog(textContent, url);

    // Create HTML body
    const postBodyHtml = `
      <p>${blog.introduction || ''}</p>
      ${(blog.sections || []).map((s: any) => `<h2>${s.heading}</h2><p>${s.content}</p>`).join('\n')}
      <h2>Conclusion</h2>
      <p>${blog.conclusion || ''}</p>
    `;

    const postBodyPlain = `${blog.introduction || ''}\n\n${(blog.sections || []).map((s: any) => `${s.heading}\n${s.content}`).join('\n\n')}\n\nConclusion\n${blog.conclusion || ''}`;

    const randomSuffix = Math.floor(Math.random() * 10000);
    const baseSlug = ogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50);
    const slug = `${baseSlug || 'web-import'}-${randomSuffix}`;

    // Write to Supabase blog_posts
    const { data: post, error: pErr } = await supabase.from('blog_posts').insert({
      workspace_id: wsId,
      author_id: user.id,
      title: blog.title || ogTitle,
      slug,
      summary: blog.metaDescription || ogDesc,
      body_html: postBodyHtml,
      body_plain: postBodyPlain,
      cover_image: ogImage,
      cover_image_alt: ogImage ? `Cover image for imported article: ${blog.title || ogTitle}` : null,
      status: 'draft',
      seo_title: blog.title || ogTitle,
      target_keyword: 'optimised'
    }).select().single();

    if (pErr) {
      logger.error({ err: pErr, workspaceId: wsId }, 'web_import.blog_post.save_failed');
      throw new Error('Failed to save imported post.');
    }

    revalidatePath('/blog');
    revalidatePath('/blog/manage');

    return { data: { postId: post.id } };

  } catch (err: any) {
    logger.error({ err, url }, 'web_import.action.failed');
    return { error: 'Web import processing aborted due to internal error.' };
  }
}
