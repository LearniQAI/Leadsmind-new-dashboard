'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PlagiarismMatch {
  url: string;
  title: string;
  percentage: number;
  snippet: string;
  offset: number;
  length: number;
  sourceType: 'web' | 'internal';
}

// Layer 1 helper: MinHash Shingling
function shingle(text: string, k = 5): Set<string> {
  // Break text into overlapping 5-word groups
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
    
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

// Jaccard similarity: intersection / union
function calculateJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersectionCount = 0;
  setA.forEach((val) => {
    if (setB.has(val)) {
      intersectionCount++;
    }
  });
  
  const unionSize = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionSize;
}

export async function scanOriginality(documentId: string, text: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    // 1. Credit Check Guard: Retrieve current credits
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('ai_credits')
      .eq('id', wsId)
      .single();

    if (wsErr || !ws) {
      return { error: 'Could not fetch workspace credit balance.' };
    }

    const currentCredits = ws.ai_credits ?? 100;
    if (currentCredits < 5) {
      return { error: `Insufficient AI credits. 5 credits required, but you only have ${currentCredits} remaining.` };
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return {
        data: {
          originalityScore: 100,
          plagiarizedScore: 0,
          matches: [],
          creditsRemaining: currentCredits
        }
      };
    }

    // 2. 24-Hour Cache Check
    if (documentId) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: cachedCheck } = await supabase
        .from('content_plagiarism_checks')
        .select('*')
        .eq('document_id', documentId)
        .gt('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedCheck) {
        return {
          data: {
            originalityScore: cachedCheck.originality_score,
            plagiarizedScore: cachedCheck.plagiarized_score,
            matches: cachedCheck.matched_sources_json || [],
            creditsRemaining: currentCredits
          }
        };
      }
    }

    // Deduct 5 credits for a new scan
    const newCredits = currentCredits - 5;
    const { error: deductErr } = await supabase
      .from('workspaces')
      .update({ ai_credits: newCredits })
      .eq("id", wsId).eq("workspace_id", wsId).eq('workspace_id', wsId);

    if (deductErr) {
      return { error: 'Credit deduction failed. Scan aborted.' };
    }

    const matches: PlagiarismMatch[] = [];

    // --- LAYER 1: Internal Plagiarism Check (MinHash Shingling + Jaccard Similarity) ---
    // Retrieve all other published documents in the workspace
    const { data: publishedDocs } = await supabase
      .from('content_studio_documents')
      .select('id, title, body_plain')
      .eq('workspace_id', wsId)
      .eq('status', 'published');

    const inputShingles = shingle(cleanText, 5);
    let maxJaccard = 0;

    if (publishedDocs && publishedDocs.length > 0) {
      publishedDocs.forEach((doc) => {
        // Skip current document if editing
        if (documentId && doc.id === documentId) return;

        const docText = doc.body_plain || '';
        const docShingles = shingle(docText, 5);
        const jaccard = calculateJaccard(inputShingles, docShingles);
        
        if (jaccard > maxJaccard) {
          maxJaccard = jaccard;
        }

        // If significant overlap (20% or more), flag matching sentences in editor
        if (jaccard >= 0.20) {
          const sentences = cleanText
            .split(/[.!?\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.split(/\s+/).length > 4);

          sentences.forEach((sentence) => {
            const idxInDoc = docText.toLowerCase().indexOf(sentence.toLowerCase());
            if (idxInDoc !== -1) {
              const idxInCurrent = cleanText.toLowerCase().indexOf(sentence.toLowerCase());
              if (idxInCurrent !== -1) {
                matches.push({
                  url: `/content-studio/${doc.id}`,
                  title: doc.title || 'Published Outline',
                  percentage: Math.round(jaccard * 100),
                  snippet: sentence,
                  offset: idxInCurrent,
                  length: sentence.length,
                  sourceType: 'internal',
                });
              }
            }
          });
        }
      });
    }

    const internalScore = Math.max(0, 100 - Math.round(maxJaccard * 100));

    // --- LAYER 2: Web Plagiarism Check (Google Serper.dev API) ---
    const phrasesChecked: string[] = [];
    let webScore = 100;
    let serperCreditsUsed = 0;

    if (process.env.SERPER_API_KEY) {
      // Extract up to 5 distinctive phrases (sentences longer than 6 words / 35 chars) spread evenly
      const candidateSentences = cleanText
        .split(/[.!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.split(/\s+/).length >= 6 && s.length >= 35);

      const phrasesToSearch: string[] = [];
      if (candidateSentences.length > 0) {
        if (candidateSentences.length <= 5) {
          phrasesToSearch.push(...candidateSentences);
        } else {
          // Select 5 evenly spaced sentences
          const step = (candidateSentences.length - 1) / 4;
          for (let i = 0; i < 5; i++) {
            const idx = Math.round(i * step);
            if (candidateSentences[idx] && !phrasesToSearch.includes(candidateSentences[idx])) {
              phrasesToSearch.push(candidateSentences[idx]);
            }
          }
        }
      }

      let webMatchesCount = 0;

      // Query Serper for each phrase
      for (const phrase of phrasesToSearch) {
        phrasesChecked.push(phrase);
        serperCreditsUsed++;
        try {
          const serperRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': process.env.SERPER_API_KEY || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: `"${phrase}"` }),
          });

          if (serperRes.ok) {
            const serperData = await serperRes.json();
            if (serperData.organic && serperData.organic.length > 0) {
              webMatchesCount++;
              const topMatch = serperData.organic[0];
              const idxInCurrent = cleanText.indexOf(phrase);
              
              matches.push({
                url: topMatch.link || '',
                title: topMatch.title || 'Web Search Match',
                percentage: 100,
                snippet: phrase,
                offset: idxInCurrent !== -1 ? idxInCurrent : 0,
                length: phrase.length,
                sourceType: 'web',
              });
            }
          }
        } catch (e) {
          console.error('Serper API check failed for phrase:', phrase, e);
        }
      }

      if (phrasesToSearch.length > 0) {
        webScore = Math.max(0, 100 - Math.round((webMatchesCount / phrasesToSearch.length) * 100));
      }
    } else {
      console.warn('Serper.dev API Key missing. Web plagiarism check bypassed.');
    }

    // Deduplicate matches sharing same offset & length (prefer internal matches over web matches)
    const dedupedMatchesMap = new Map<string, PlagiarismMatch>();
    matches.forEach((m) => {
      const key = `${m.offset}-${m.length}`;
      const existing = dedupedMatchesMap.get(key);
      if (!existing || (existing.sourceType === 'web' && m.sourceType === 'internal')) {
        dedupedMatchesMap.set(key, m);
      }
    });
    const finalMatches = Array.from(dedupedMatchesMap.values());

    // Calculate final scores
    // Merge highlighted ranges to calculate total duplicate character length
    const highlightedRanges: { start: number; end: number }[] = [];
    finalMatches.forEach((m) => {
      highlightedRanges.push({ start: m.offset, end: m.offset + m.length });
    });

    highlightedRanges.sort((a, b) => a.start - b.start);
    const mergedRanges: { start: number; end: number }[] = [];
    if (highlightedRanges.length > 0) {
      let current = highlightedRanges[0];
      for (let i = 1; i < highlightedRanges.length; i++) {
        const next = highlightedRanges[i];
        if (next.start <= current.end) {
          current.end = Math.max(current.end, next.end);
        } else {
          mergedRanges.push(current);
          current = next;
        }
      }
      mergedRanges.push(current);
    }

    const totalMatchedChars = mergedRanges.reduce((acc, r) => acc + (r.end - r.start), 0);
    const plagiarizedScore = Math.min(100, Math.round((totalMatchedChars / cleanText.length) * 100) || 0);
    const originalityScore = 100 - plagiarizedScore;

    let highestMatchUrl = null;
    let highestMatchPercentage = 0;
    if (finalMatches.length > 0) {
      const sorted = [...finalMatches].sort((a, b) => b.percentage - a.percentage);
      highestMatchUrl = sorted[0].url;
      highestMatchPercentage = sorted[0].percentage;
    }

    // 4. Save results to supabase with new columns
    if (documentId) {
      await supabase.from('content_plagiarism_checks').insert({
        workspace_id: wsId,
        document_id: documentId,
        originality_score: originalityScore,
        plagiarized_score: plagiarizedScore,
        matched_sources_json: finalMatches,
        highest_match_url: highestMatchUrl,
        highest_match_percentage: highestMatchPercentage,
        credits_used: 5,
        internal_score: internalScore,
        internal_matches_json: finalMatches.filter((m) => m.sourceType === 'internal'),
        web_score: webScore,
        web_matches_json: finalMatches.filter((m) => m.sourceType === 'web'),
        phrases_checked: phrasesChecked,
        serper_credits_used: serperCreditsUsed,
      });

      // Update parent document columns
      await supabase.from('content_studio_documents').update({
        plagiarism_score: originalityScore,
        plagiarism_checked_at: new Date().toISOString()
      }).eq("id", documentId).eq("workspace_id", wsId).eq('workspace_id', wsId);
    }

    return {
      data: {
        originalityScore,
        plagiarizedScore,
        matches: finalMatches,
        creditsRemaining: newCredits,
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Plagiarism scan failed' };
  }
}

export async function paraphraseText(
  text: string,
  mode: 'standard' | 'formal' | 'simple' | 'creative'
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { error: 'OpenAI API key is missing from server configurations.' };
    }

    let promptGuide = '';
    switch (mode) {
      case 'formal':
        promptGuide = 'Rewrite using professional, formal, and authoritative language. Focus on business clarity.';
        break;
      case 'simple':
        promptGuide = 'Rewrite using highly simple, concise, and easy-to-read terms. Keep sentences short and clear.';
        break;
      case 'creative':
        promptGuide = 'Rewrite using vivid, engaging, and expressive phrasing. Add compelling hooks or analogies.';
        break;
      case 'standard':
      default:
        promptGuide = 'Paraphrase standardly. Maintain original core meaning but change vocabulary and sentence flow.';
        break;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert content rewriter. Paraphrase the user's selected text in a "${mode}" style. Guidance: ${promptGuide}
Return exactly 3 distinct rewrites. You MUST return ONLY a JSON object containing a string array labeled "options" with no additional text or formatting.
Example output format:
{
  "options": [
    "Option 1 text",
    "Option 2 text",
    "Option 3 text"
  ]
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return {
      data: parsed.options || []
    };
  } catch (err: any) {
    return { error: err.message || 'Paraphrase generation failed.' };
  }
}

export async function getWorkspaceCredits() {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No workspace context' };
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('workspaces')
      .select('ai_credits')
      .eq('id', wsId)
      .single();
    return { data: data?.ai_credits ?? 100 };
  } catch (err) {
    return { data: 100 };
  }
}

export async function scanSnippetOriginality(textSnippet: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const matches: PlagiarismMatch[] = [];
    const cleanText = textSnippet.trim();
    if (!cleanText) return { data: { matches: [] } };

    // Check if the snippet matches any published doc in this workspace
    const { data: publishedDocs } = await supabase
      .from('content_studio_documents')
      .select('id, title, body_plain')
      .eq('workspace_id', wsId)
      .eq('status', 'published');

    if (publishedDocs) {
      publishedDocs.forEach(doc => {
        const docText = doc.body_plain || '';
        if (docText.toLowerCase().includes(cleanText.toLowerCase())) {
          matches.push({
            url: `/content-studio/${doc.id}`,
            title: doc.title || 'Published Outline',
            percentage: 100,
            snippet: cleanText,
            offset: 0,
            length: cleanText.length,
            sourceType: 'internal'
          });
        }
      });
    }

    return { data: { matches } };
  } catch (err: any) {
    return { error: err.message || 'Snippet scan failed' };
  }
}
