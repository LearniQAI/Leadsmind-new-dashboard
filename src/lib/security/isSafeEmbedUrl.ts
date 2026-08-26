// Shared by the admin embed block editor and the student-side iframe render — only
// http(s) URLs are ever allowed into an iframe src. Rejects javascript:, data:, and any
// other scheme that could execute in the parent page's context.
export function isSafeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
