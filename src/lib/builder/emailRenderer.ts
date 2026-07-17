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
    // No sensible universal default — must be generated per-recipient (real
    // email + real workspace_id) via generateUnsubscribeToken. Callers that
    // don't supply one (e.g. the on-screen builder preview) get an empty
    // link rather than a broken shared placeholder.
    unsubscribe_link: additionalVars?.unsubscribe_link || '',
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
/**
 * Compiles a list of layout blocks into a responsive HTML email.
 */
export function renderEmailLayout(
  blocks: EmailBlock[],
  brandKit: BrandKit,
  contact?: any,
  additionalVars?: Record<string, any>,
  preheaderText?: string,
  // When true, returns the compiled layout with {{tokens}} left intact
  // instead of resolving them. Used when saving/deploying a campaign: the
  // stored body_html must stay generic so the dispatch worker can resolve
  // {{first_name}}/{{unsubscribe_link}}/etc. per-recipient at actual send
  // time, rather than baking one recipient's (or, worse, no recipient's)
  // values into the HTML every recipient receives.
  skipPersonalization?: boolean
): string {
  const primaryColor = brandKit.brandColorPrimary || '#2563eb';
  const defaultFont = brandKit.brandFontDefault || 'Inter, Arial, sans-serif';
  const logoUrl = brandKit.logoUrl || '';
  const hiddenPreheader = preheaderText || '';

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
                  <img src="${imageUrl}" alt="${imageAlt}" width="100%" style="width: 100%; max-width: 600px; display: block; border-radius: 12px; border: 0; height: auto;" />
                </td>
              </tr>
            ` : ''}
            <tr>
              <td align="center" style="padding: 10px 0;">
                <h1 style="font-family: ${defaultFont}; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; text-align: center; text-transform: uppercase;">
                  ${headline}
                </h1>
                <p style="font-family: ${defaultFont}; font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; text-align: center;">
                  ${subheadline}
                </p>
                ${buttonText ? `
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                    <tr>
                      <td align="center">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" stroke="f" fillcolor="${primaryColor}">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:${defaultFont};font-size:13px;font-weight:700;text-transform:uppercase;">${buttonText}</center>
                        </v:roundrect>
                        <![endif]-->
                        <a href="${buttonUrl}" target="_blank" style="background:${primaryColor};padding:12px 28px;color:#ffffff;font-family:${defaultFont};font-size:13px;font-weight:700;border-radius:6px;display:inline-block;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;mso-hide:all">
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
          <td class="stack-column" valign="top" style="padding: 10px; width: ${100 / Math.max(1, columns.length)}%; box-sizing: border-box;">
            <h3 style="font-family: ${defaultFont}; font-size: 15px; font-weight: bold; color: ${primaryColor}; margin: 0 0 8px 0;">
              ${col.title || 'Feature Title'}
            </h3>
            <p style="font-family: ${defaultFont}; font-size: 12px; line-height: 1.5; color: #475569; margin: 0;">
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
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 24px;">
                <p style="font-family: ${defaultFont}; font-size: 13.5px; line-height: 1.6; color: #334155; font-style: italic; margin: 0 0 16px 0; text-align: center;">
                  "${quote}"
                </p>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
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
                <div style="font-family: ${defaultFont}; font-size: 10.5px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                  ${label}
                </div>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                  <tr>
                    ${[
                      { value: days, label: 'Days' },
                      { value: hours, label: 'Hrs' },
                      { value: minutes, label: 'Mins' },
                      { value: seconds, label: 'Secs' }
                    ].map(item => `
                      <td style="padding: 0 4px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 50px; height: 50px;">
                          <tr>
                            <td align="center" style="font-family: ${defaultFont}; font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1;">
                              ${item.value}
                              <div style="font-size: 8px; font-weight: normal; color: #64748b; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px;">
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
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" stroke="f" fillcolor="${bg}">
                  <w:anchorlock/>
                  <center style="color:${fg};font-family:${defaultFont};font-size:13px;font-weight:700;text-transform:uppercase;">${text}</center>
                </v:roundrect>
                <![endif]-->
                <a href="${url}" target="_blank" style="background:${bg};padding:12px 28px;color:${fg};font-family:${defaultFont};font-size:13px;font-weight:700;border-radius:6px;display:inline-block;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;mso-hide:all">
                  ${text}
                </a>
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
              <td style="font-family: ${defaultFont}; font-size: 14px; line-height: 1.6; color: #475569;">
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>LeadsMind Broadcast</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .stack-column {
        display: block !important;
        width: 100% !important;
        padding-bottom: 20px !important;
      }
      .responsive-container {
        padding: 20px 10px !important;
      }
    }
  </style>
</head>
<body style="font-family: ${defaultFont}; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0;">
  ${hiddenPreheader ? `
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${hiddenPreheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  ` : ''}
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" class="responsive-container" style="padding: 40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
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
            <td align="center" style="font-family: ${defaultFont}; font-size: 11px; color: #94a3c8; line-height: 1.6; padding-top: 30px; border-top: 1px solid #e2e8f0; margin-top: 30px;">
              Sent automatically by LeadsMind Campaign Engine.<br />
              &copy; ${new Date().getFullYear()} LeadsMind Inc. All rights reserved.<br />
              <a href="{{unsubscribe_link}}" style="color: ${primaryColor}; text-decoration: none;">Unsubscribe</a> from future campaigns.
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
  if (skipPersonalization) {
    return fullHtml;
  }
  return parsePersonalTokens(fullHtml, contact, additionalVars);
}
