// Pre-send content check for campaign email: flags thin, image-led emails before they go out.
//
// Why: proven 2026-09-27 by real sends to Gmail — the same sender, name and auth landed in Spam
// with ~20 words under a full-width image, and in Inbox once ~80 words of real copy were added.
// This WARNS, never blocks: a short but genuine email is the sender's call.
//
// Pure (no DOM), so it runs identically in the builder and in tests, on the exact compiled HTML
// recipients receive.

/** Below this many words of the sender's own copy, an email reads as thin to spam filters. */
export const MIN_BODY_WORDS = 50;
/** Words of copy each large image needs around it to not look image-led. */
export const WORDS_PER_LARGE_IMAGE = 60;
/** An image at least this wide (px), or width 100%, counts as large. Logos and icons don't. */
const LARGE_IMAGE_MIN_WIDTH = 300;

export type EmailContentWarning = { code: 'low_text' | 'image_heavy'; message: string };

export type EmailContentCheck = {
  words: number;
  images: number;
  largeImages: number;
  warnings: EmailContentWarning[];
};

// The sender's own content only: the layout's logo row, hidden preheader and the fixed
// footer/unsubscribe boilerplate are the same in every email and aren't what a filter weighs as
// "this email has real copy".
function bodyRegion(html: string): string {
  const start = html.indexOf('<!-- Blocks Container -->');
  const end = html.indexOf('<!-- Footer -->');
  if (start !== -1 && end > start) return html.slice(start, end);
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return body ? body[1] : html;
}

function isLargeImage(tag: string): boolean {
  const width = tag.match(/\bwidth\s*=\s*["']?\s*(\d+)(%?)/i);
  if (width && (width[2] === '%' ? Number(width[1]) >= 50 : Number(width[1]) >= LARGE_IMAGE_MIN_WIDTH)) return true;
  const style = tag.match(/\bstyle\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
  const cssWidth = style.match(/(?:^|;)\s*width\s*:\s*(\d+)(%|px)?/i);
  if (!cssWidth) return false;
  return cssWidth[2] === '%' ? Number(cssWidth[1]) >= 50 : Number(cssWidth[1]) >= LARGE_IMAGE_MIN_WIDTH;
}

export function visibleWordCount(html: string): number {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, ' ') // comments, incl. the Outlook-only <!--[if mso]> duplicate buttons
    .replace(/<(style|script|head|title)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, '');
  // A word needs a letter: numbers and stray punctuation don't count. {{first_name}} counts as one.
  return (text.match(/\S+/g) ?? []).filter((w) => /\p{L}/u.test(w)).length;
}

export function checkEmailContent(html: string | null | undefined): EmailContentCheck {
  const region = bodyRegion(html ?? '');
  const imgTags = region.replace(/<!--[\s\S]*?-->/g, ' ').match(/<img\b[^>]*>/gi) ?? [];
  const largeImages = imgTags.filter(isLargeImage).length;
  const words = visibleWordCount(region);

  const warnings: EmailContentWarning[] = [];
  if (words < MIN_BODY_WORDS) {
    warnings.push({
      code: 'low_text',
      message: `Only ${words} word${words === 1 ? '' : 's'} of text. Emails under about ${MIN_BODY_WORDS} words are much more likely to land in spam. Add a few sentences of real copy.`,
    });
  }
  if (largeImages > 0 && words < WORDS_PER_LARGE_IMAGE * largeImages) {
    warnings.push({
      code: 'image_heavy',
      message:
        largeImages === 1
          ? 'This email is mostly one large image. Filters can’t read images, so image-led emails often go to spam. Put your message in text, not inside the image.'
          : `This email is mostly ${largeImages} large images. Filters can’t read images, so image-led emails often go to spam. Put your message in text, not inside the images.`,
    });
  }
  return { words, images: imgTags.length, largeImages, warnings };
}
