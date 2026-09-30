// Client-side gate for the Media vault's image upload. Fails fast with a message that says what
// is wrong, before any bytes are sent. The size limit is enforced here because the bucket itself
// sets none; the type is checked against the file's real leading bytes, not its name or the
// browser-reported MIME (a .txt renamed to .jpg reports image/jpeg on some browsers).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const IMAGE_HINT = 'JPG, PNG, GIF or WebP, up to 5MB';

export type ImageKind = { mime: string; ext: string };

/** The image format the bytes actually are, or null. */
export function sniffImage(head: Uint8Array): ImageKind | null {
  const at = (i: number, ...b: number[]) => b.every((v, k) => head[i + k] === v);
  if (at(0, 0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg' };
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', ext: 'png' };
  if (at(0, 0x47, 0x49, 0x46, 0x38) && (head[4] === 0x37 || head[4] === 0x39) && head[5] === 0x61) return { mime: 'image/gif', ext: 'gif' };
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export type ImageCheck = { ok: true; kind: ImageKind } | { ok: false; error: string };

export async function checkImageFile(file: File): Promise<ImageCheck> {
  if (file.size === 0) return { ok: false, error: 'This file is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `"${file.name}" is ${(file.size / 1048576).toFixed(1)}MB — the limit is 5MB. Choose a smaller image.` };
  }
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const kind = sniffImage(head);
  if (!kind) {
    return { ok: false, error: `"${file.name}" isn't a supported image. Upload a JPG, PNG, GIF or WebP file.` };
  }
  return { ok: true, kind };
}
