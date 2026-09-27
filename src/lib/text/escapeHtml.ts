/** Escapes a plain string for safe interpolation into HTML markup (text content or an attribute
 * value). Shared by every hand-built email template (campaign renderer, automation email,
 * workflow email) — these interpolate workspace-controlled free text (a From name, a postal
 * address, a contact field) directly into a string of HTML, so unescaped input can break the
 * surrounding markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
