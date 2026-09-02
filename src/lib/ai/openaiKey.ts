// The exact "is this a usable real key" guard that api/ai/generate-questions/route.ts and
// quizzes.ts::generateExplanationWithLena already apply inline, factored out so new AI call
// sites stay consistent with the established mock-fallback behaviour.
//
// Returns the key string when it looks real, or null when it's absent / a known dev
// placeholder — in which case the caller MUST use its local mock fallback instead of calling
// OpenAI.
export function getUsableOpenAIKey(): string | null {
  const k = process.env.OPENAI_API_KEY;
  if (!k) return null;
  if (k === 'sk_mock_key') return null;
  if (k.includes('PLACEHOLDER')) return null;
  if (k.startsWith('sk-proj-O15jtbs')) return null;
  return k;
}
