(global as any).WebSocket = class {};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const STOP_WORDS = new Set(['how', 'to', 'a', 'the', 'for', 'with', 'and', 'is', 'in', 'on', 'at', 'by', 'of', 'an', 'this', 'that', 'it', 'you', 'your', 'my']);

function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzySearch(articles: any[], query: string): any[] {
  const cleanQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  if (!cleanQuery) return [];

  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (queryWords.length === 0) return [];

  const scored = articles.map(art => {
    let score = 0;
    const titleLower = (art.title || '').toLowerCase();
    const categoryLower = (art.category || '').toLowerCase();
    const bodyLower = (art.body_plain || '').toLowerCase();
    const slugLower = (art.slug || '').toLowerCase().replace(/-/g, ' ');
    const contentStr = art.content_json ? JSON.stringify(art.content_json).toLowerCase() : '';
    const faqStr = art.faq_json ? JSON.stringify(art.faq_json).toLowerCase() : '';

    // Exact matches
    if (titleLower === cleanQuery) score += 100;
    if (categoryLower === cleanQuery) score += 80;

    let matchedWordsCount = 0;

    queryWords.forEach(word => {
      const qWord = (word.endsWith('s') && word.length > 3) ? word.slice(0, -1) : word;
      let wordMatched = false;

      // 1. Title match
      if (titleLower.includes(qWord) || titleLower.includes(word)) {
        score += 20;
        wordMatched = true;
        if (titleLower.startsWith(qWord) || titleLower.startsWith(word)) score += 10;
      }
      // 2. Category match
      if (categoryLower.includes(qWord) || categoryLower.includes(word)) {
        score += 30;
        wordMatched = true;
      }
      // 3. Slug match
      if (slugLower.includes(qWord) || slugLower.includes(word)) {
        score += 15;
        wordMatched = true;
      }
      // 4. Body match
      if (bodyLower.includes(qWord) || bodyLower.includes(word)) {
        score += 5;
        wordMatched = true;
      }
      // 5. Content match
      if (contentStr.includes(qWord) || contentStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }
      // 6. FAQ match
      if (faqStr.includes(qWord) || faqStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }

      // 7. Typo tolerance (edit distance <= 1 for words of length >= 4)
      if (qWord.length >= 4) {
        const titleWords = titleLower.split(/\s+/).filter(w => w.length >= 4);
        const categoryWords = categoryLower.split(/\s+/).filter(w => w.length >= 4);
        const slugWords = slugLower.split(/\s+/).filter(w => w.length >= 4);

        let typoMatched = false;
        const checkTypo = (targetWords: string[], weight: number) => {
          for (const tWord of targetWords) {
            if (getEditDistance(qWord, tWord) <= 1 || getEditDistance(word, tWord) <= 1) {
              score += weight;
              typoMatched = true;
              break;
            }
          }
        };

        checkTypo(titleWords, 15);
        checkTypo(categoryWords, 20);
        checkTypo(slugWords, 10);

        if (typoMatched) wordMatched = true;
      }

      if (wordMatched) {
        matchedWordsCount++;
      }
    });

    // Normalize score by query coverage ratio
    if (queryWords.length > 0) {
      const coverageRatio = matchedWordsCount / queryWords.length;
      score = score * coverageRatio;
    }

    return { ...art, score };
  });

  return scored
    .filter(art => art.score >= 15)
    .sort((a, b) => b.score - a.score);
}

async function main() {
  const { data } = await supabase
    .from('help_articles')
    .select('id, slug, title, body_plain, category, content_json, faq_json');
  
  const query = "setup sales team assignment rotation";
  const matched = fuzzySearch(data || [], query);
  
  console.log(`Matched count: ${matched.length}`);
  matched.forEach(art => {
    console.log(`- Slug: ${art.slug} | Title: "${art.title}" | Score: ${art.score} | Mapped Similarity: ${Math.min(0.99, art.score / 100)}`);
  });
}

main();
