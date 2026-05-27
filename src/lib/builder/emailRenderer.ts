/**
 * emailRenderer — Compiles structural JSON layout blocks into email-client-compatible
 * responsive HTML, performing conditional visibility checks and regex token substitution.
 */

export interface BrandKit {
  logoUrl?: string | null;
  brandColorPrimary?: string;
  brandColorSecondary?: string;
  brandFontDefault?: string;
}

export interface BlockCondition {
  tag?: string;
  visibility?: 'show' | 'hide';
}

export interface EmailBlock {
  id: string;
  type: 'hero' | 'features' | 'testimonial' | 'countdown' | 'cta' | 'text';
  content: any;
  conditions?: BlockCondition;
}

/**
 * Checks whether a block should be visible for a given contact.
 */
export function evaluateBlockVisibility(block: EmailBlock, contact?: any): boolean {
  if (!block.conditions || !block.conditions.tag) {
    return true; // No conditions set, block is visible
  }

  const requiredTag = block.conditions.tag.trim();
  const visibility = block.conditions.visibility || 'show';

  // Retrieve contact tags
  const contactTags: string[] = Array.isArray(contact?.tags)
    ? contact.tags
    : typeof contact?.tags === 'string'
      ? contact.tags.split(',').map((t: string) => t.trim())
      : [];

  const hasTag = contactTags.some((t: string) => t.toLowerCase() === requiredTag.toLowerCase());

  if (visibility === 'show') {
    return hasTag;
  } else {
    return !hasTag;
  }
}

/**
 * Replaces double curly braces tokens like {{first_name}} with contact variables.
 */
export function parsePersonalTokens(html: string, contact?: any, additionalVars?: Record<string, any>): string {
  if (!html) return '';

  const variables = {
    first_name: contact?.first_name || contact?.firstName || 'Valued Customer',
    last_name: contact?.last_name || contact?.lastName || '',
    company: contact?.company || 'your company',
    email: contact?.email || '',
    invoice_amount_zar: additionalVars?.invoice_amount_zar || additionalVars?.invoiceAmountZar || 'R 0.00',
    ...(additionalVars || {})
  };

  return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    const lowerKey = key.toLowerCase();
    
    // Direct case-insensitive match
    const foundKey = Object.keys(variables).find(k => k.toLowerCase() === lowerKey);
    if (foundKey !== undefined && (variables as any)[foundKey] !== undefined) {
      return String((variables as any)[foundKey]);
    }
    
    return '';
  });
}

/**
 * Compiles a list of layout blocks into a responsive HTML email.
 */
export function renderEmailLayout(
  blocks: EmailBlock[],
  brandKit: BrandKit,
  contact?: any,
  additionalVars?: Record<string, any>
): string {
  const primaryColor = brandKit.brandColorPrimary || '#2563eb';
  const secondaryColor = brandKit.brandColorSecondary || '#080f28';
  const defaultFont = brandKit.brandFontDefault || 'Inter, Arial, sans-serif';
  const logoUrl = brandKit.logoUrl || '';

  // Render individual blocks
  let blocksHtml = '';

  for (const block of blocks) {
    // 1. Evaluate conditional visibility
    if (!evaluateBlockVisibility(block, contact)) {
      continue;
    }

    let blockContentHtml = '';

    switch (block.type) {
      case 'hero': {
        const imageUrl = block.content.imageUrl || '';
        const imageAlt = block.content.imageAlt || 'Hero Image';
        const headline = block.content.headline || 'Headline Title';
        const subheadline = block.content.subheadline || 'Subheadline text description.';
        const buttonText = block.content.buttonText || '';
        const buttonUrl = block.content.buttonUrl || '#';

        blockContentHtml = `
          <!-- HERO BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            ${imageUrl ? `
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <img src="${imageUrl}" alt="${imageAlt}" width="100%" style="max-width: 540px; display: block; border-radius: 12px; border: 0;" />
                </td>
              </tr>
            ` : ''}
            <tr>
              <td align="center" style="padding: 10px 0;">
                <h1 style="font-family: ${defaultFont}; font-size: 24px; font-weight: 800; color: #eef2ff; margin: 0 0 10px 0; text-align: center; text-transform: uppercase;">
                  ${headline}
                </h1>
                <p style="font-family: ${defaultFont}; font-size: 14px; line-height: 1.6; color: #94a3c8; margin: 0 0 20px 0; text-align: center;">
                  ${subheadline}
                </p>
                ${buttonText ? `
                  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" bgcolor="${primaryColor}" style="border-radius: 8px;">
                        <a href="${buttonUrl}" target="_blank" style="font-family: ${defaultFont}; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 28px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                ` : ''}
              </td>
            </tr>
          </table>
        `;
        break;
      }

      case 'features': {
        const columns = Array.isArray(block.content.columns) ? block.content.columns : [];
        const colsHtml = columns.map((col: any) => `
          <td valign="top" style="padding: 10px; width: ${100 / Math.max(1, columns.length)}%;">
            <h3 style="font-family: ${defaultFont}; font-size: 15px; font-weight: bold; color: #3b82f6; margin: 0 0 8px 0;">
              ${col.title || 'Feature Title'}
            </h3>
            <p style="font-family: ${defaultFont}; font-size: 12px; line-height: 1.5; color: #94a3c8; margin: 0;">
              ${col.description || 'Feature description.'}
            </p>
          </td>
        `).join('');

        blockContentHtml = `
          <!-- FEATURES BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; table-layout: fixed;">
            <tr>
              ${colsHtml}
            </tr>
          </table>
        `;
        break;
      }

      case 'testimonial': {
        const quote = block.content.quote || 'This platform has transformed our campaign deliverability and workflow automation!';
        const author = block.content.author || 'Jane Doe';
        const avatarUrl = block.content.avatarUrl || '';
        const avatarAlt = block.content.avatarAlt || 'Author Avatar';

        blockContentHtml = `
          <!-- TESTIMONIAL BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 24px;">
                <p style="font-family: ${defaultFont}; font-size: 13.5px; line-height: 1.6; color: #eef2ff; font-style: italic; margin: 0 0 16px 0; text-align: center;">
                  "${quote}"
                </p>
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    ${avatarUrl ? `
                      <td style="padding-right: 10px;">
                        <img src="${avatarUrl}" alt="${avatarAlt}" width="32" height="32" style="border-radius: 16px; display: block; border: 0; width: 32px; height: 32px; object-fit: cover;" />
                      </td>
                    ` : ''}
                    <td valign="middle">
                      <div style="font-family: ${defaultFont}; font-size: 12px; font-weight: bold; color: #3b82f6;">
                        ${author}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
        break;
      }

      case 'countdown': {
        const targetDate = block.content.targetDate || '';
        const label = block.content.label || 'OFFER EXPIRES IN:';
        
        // Calculate remaining time statically
        let days = '00', hours = '00', minutes = '00', seconds = '00';
        if (targetDate) {
          const distance = new Date(targetDate).getTime() - Date.now();
          if (distance > 0) {
            days = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
            hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
          }
        }

        blockContentHtml = `
          <!-- COUNTDOWN BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; text-align: center;">
            <tr>
              <td>
                <div style="font-family: ${defaultFont}; font-size: 10.5px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                  ${label}
                </div>
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    ${[
                      { value: days, label: 'Days' },
                      { value: hours, label: 'Hrs' },
                      { value: minutes, label: 'Mins' },
                      { value: seconds, label: 'Secs' }
                    ].map(item => `
                      <td style="padding: 0 4px;">
                        <table border="0" cellpadding="0" cellspacing="0" style="background-color: #04091a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; width: 50px; height: 50px;">
                          <tr>
                            <td align="center" style="font-family: ${defaultFont}; font-size: 16px; font-weight: 800; color: #eef2ff; line-height: 1;">
                              ${item.value}
                              <div style="font-size: 8px; font-weight: normal; color: #4a5a82; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px;">
                                ${item.label}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    `).join('')}
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
        break;
      }

      case 'cta': {
        const text = block.content.text || 'Click Here';
        const url = block.content.url || '#';
        const align = block.content.align || 'center';
        const bg = block.content.backgroundColor || primaryColor;
        const fg = block.content.textColor || '#ffffff';

        blockContentHtml = `
          <!-- CTA BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
              <td align="${align}">
                <table border="0" cellpadding="0" cellspacing="0" style="display: inline-block;">
                  <tr>
                    <td bgcolor="${bg}" style="border-radius: 8px;">
                      <a href="${url}" target="_blank" style="font-family: ${defaultFont}; font-size: 13px; font-weight: bold; color: ${fg}; text-decoration: none; padding: 12px 28px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${text}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
        break;
      }

      case 'text':
      default: {
        const bodyText = block.content.body || 'Type your content here...';
        blockContentHtml = `
          <!-- TEXT BLOCK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
              <td style="font-family: ${defaultFont}; font-size: 14px; line-height: 1.6; color: #94a3c8;">
                ${bodyText.replace(/\n/g, '<br />')}
              </td>
            </tr>
          </table>
        `;
        break;
      }
    }

    blocksHtml += blockContentHtml;
  }

  // 2. Wrap HTML inside standard dark-navy email responsive container
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeadsMind Broadcast</title>
</head>
<body style="font-family: ${defaultFont}; background-color: #04091a; color: #eef2ff; margin: 0; padding: 40px 20px;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #080f28; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 24px; padding: 40px; box-sizing: border-box;">
          
          <!-- Logo Header -->
          ${logoUrl ? `
            <tr>
              <td align="center" style="padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <img src="${logoUrl}" alt="Logo" height="32" style="border: 0; outline: none; max-height: 32px;" />
              </td>
            </tr>
            <tr><td height="30"></td></tr>
          ` : ''}

          <!-- Blocks Container -->
          <tr>
            <td>
              ${blocksHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="font-family: ${defaultFont}; font-size: 11px; color: #4a5a82; line-height: 1.6; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); margin-top: 30px;">
              Sent automatically by LeadsMind Campaign Engine.<br />
              © ${new Date().getFullYear()} LeadsMind Inc. All rights reserved.<br />
              <a href="{{unsubscribe_link}}" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a> from future campaigns.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // 3. Perform final token replacements on compiled HTML
  return parsePersonalTokens(fullHtml, contact, additionalVars);
}
