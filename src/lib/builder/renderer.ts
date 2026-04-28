import { CraftContent, CraftNode } from '@/types/builder.types';

export function renderCraftToHtml(contentJson: any, pageId?: string, workspaceId?: string): string {
  // 1. Defensively parse the content if it's a string
  let content: CraftContent;
  try {
    content = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
  } catch (e) {
    console.error('Renderer Error: Failed to parse content JSON', e);
    return '';
  }

  const rootNode = content['ROOT'];
  if (!rootNode) {
    console.error('Renderer Error: No ROOT node found in content');
    return '';
  }

  const html = renderNode(rootNode, content);
  
  // Inject form handler script if needed
  const submissionScript = `
    <script>
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Submitting...';
            btn.disabled = true;

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const config = JSON.parse(e.target.getAttribute('data-config') || '{}');

            try {
                const res = await fetch('/api/builder/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        formData: data, 
                        pageId: '${pageId}', 
                        workspaceId: '${workspaceId}' 
                    })
                });
                
                const result = await res.json();
                if (result.success) {
                    if (config.onSuccess === 'redirect' && config.redirectUrl) {
                        window.location.href = config.redirectUrl;
                    } else {
                        alert(config.successMessage || 'Submission successful!');
                        e.target.reset();
                    }
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (err) {
                alert('Submission failed. Please try again.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    });
    </script>
  `;

  return html + submissionScript;
}


function renderNode(node: CraftNode, allNodes: CraftContent): string {
  if (!node) return '';
  const { type, props, nodes, linkedNodes } = node;
  
  // Identify the component
  const name = type?.resolvedName || (node as any).data?.name || (node as any).data?.displayName;

  // Render all children recursively
  const childrenHtml = (nodes || []).map(id => {
      const childNode = allNodes[id];
      if (!childNode) return '';
      return renderNode(childNode, allNodes);
  }).join('');
  
  // Render any linked nodes
  const linkedHtml = Object.values(linkedNodes || {}).map(id => {
      const linkedNode = allNodes[id];
      if (!linkedNode) return '';
      return renderNode(linkedNode, allNodes);
  }).join('');

  const fullChildren = childrenHtml + linkedHtml;

  // Map components to HTML
  switch (name) {
    case 'Section':
      return `<section style="width: 100%; position: relative; padding-top: ${props.paddingTop}px; padding-bottom: ${props.paddingBottom}px; padding-left: ${props.paddingLeft}px; padding-right: ${props.paddingRight}px; background-color: ${props.backgroundColor || 'transparent'}; ${mapPropsToStyle(props)}">${fullChildren}</section>`;

    case 'Container':
      const bgColor = props.backgroundColor || (props.style?.backgroundColor) || 'transparent';
      const maxWidthStyle = props.layoutType === 'fixed' ? `max-width: ${props.maxWidth || '1200px'}; margin-left: auto; margin-right: auto;` : 'width: 100%;';
      return `<div class="${props.className || ''}" style="${maxWidthStyle} padding: ${props.padding}px; background-color: ${bgColor}; ${mapPropsToStyle(props)}">${fullChildren}</div>`;
      
    case 'Columns':
      let gridTemplate = 'grid-template-columns: repeat(1, minmax(0, 1fr));';
      if (props.layout === '2') gridTemplate = 'grid-template-columns: repeat(2, minmax(0, 1fr));';
      if (props.layout === '3') gridTemplate = 'grid-template-columns: repeat(3, minmax(0, 1fr));';
      if (props.layout === '4') gridTemplate = 'grid-template-columns: repeat(4, minmax(0, 1fr));';
      if (props.layout === '1/3-2/3') gridTemplate = 'grid-template-columns: 1fr 2fr;';
      if (props.layout === '2/3-1/3') gridTemplate = 'grid-template-columns: 2fr 1fr;';
      
      // Inline CSS grid fallback logic for simple rendering without full tailwind media queries, but standard enough
      return `<div class="${props.className || ''}" style="display: grid; gap: ${props.gap}px; padding: ${props.padding}px; ${gridTemplate} ${mapPropsToStyle(props)}">${fullChildren}</div>`;

    case 'Spacer':
      return `<div style="width: 100%; height: ${props.height}px;"></div>`;

    case 'Divider':
      let alignStyle = 'margin: 0 auto;';
      if (props.alignment === 'left') alignStyle = 'margin-left: 0; margin-right: auto;';
      if (props.alignment === 'right') alignStyle = 'margin-left: auto; margin-right: 0;';
      
      return `<div style="width: 100%; padding-top: ${props.paddingTop}px; padding-bottom: ${props.paddingBottom}px;"><div style="height: ${props.weight}px; background-color: ${props.color}; width: ${props.width}; ${alignStyle}"></div></div>`;
    
    case 'Heading':
      const headingTag = props.level || 'h2';
      const weightClass = props.fontWeight || 'bold';
      let weightStyle = 'font-weight: 700;';
      if (weightClass === 'normal') weightStyle = 'font-weight: 400;';
      if (weightClass === 'medium') weightStyle = 'font-weight: 500;';
      if (weightClass === 'semibold') weightStyle = 'font-weight: 600;';
      if (weightClass === 'black') weightStyle = 'font-weight: 900;';
      return `<${headingTag} class="${props.className || ''}" style="${weightStyle} text-align: ${props.textAlign || 'left'}; color: ${props.color || 'inherit'}; ${props.fontSize ? `font-size: ${props.fontSize}px;` : ''} ${mapPropsToStyle(props)}">${props.text || ''}</${headingTag}>`;

    case 'Paragraph':
      return `<p class="${props.className || ''}" style="font-size: ${props.fontSize || 16}px; text-align: ${props.textAlign || 'left'}; color: ${props.color || 'inherit'}; ${props.lineHeight === 'tight' ? 'line-height: 1.25;' : props.lineHeight === 'loose' ? 'line-height: 2;' : 'line-height: 1.625;'} ${mapPropsToStyle(props)}">${props.text || ''}</p>`;

    case 'Image':
      const isCircle = props.shape === 'circle';
      const shapeStyles = isCircle ? `border-radius: 50%; aspect-ratio: 1 / 1; object-fit: ${props.objectFit || 'cover'};` : `border-radius: ${props.borderRadius || 0}px; object-fit: ${props.objectFit || 'cover'};`;
      
      return `<div class="${props.className || ''}" style="width: ${props.width || '100%'}; height: ${isCircle ? (props.width || '100%') : (props.height || 'auto')}; display: flex; justify-content: center; ${mapPropsToStyle(props)}"><img src="${props.src || ''}" alt="${props.alt || ''}" style="width: 100%; height: 100%; ${shapeStyles} display: block;" /></div>`;

    case 'Video':
      let embedUrl = props.url || '';
      if (props.provider === 'youtube') embedUrl = `https://www.youtube.com/embed/${embedUrl.split('v=')[1]?.split('&')[0] || embedUrl.split('/').pop()}?autoplay=${props.autoPlay ? 1 : 0}&controls=${props.controls ? 1 : 0}&loop=${props.loop ? 1 : 0}&mute=${props.muted ? 1 : 0}`;
      else if (props.provider === 'vimeo') embedUrl = `https://player.vimeo.com/video/${embedUrl.split('/').pop()}?autoplay=${props.autoPlay ? 1 : 0}&loop=${props.loop ? 1 : 0}&muted=${props.muted ? 1 : 0}`;
      
      if (props.provider === 'custom') {
        return `<div class="${props.className || ''}" style="width: 100%; position: relative; padding-top: 56.25%; overflow: hidden; border-radius: ${props.borderRadius || 0}px; ${mapPropsToStyle(props)}"><video src="${props.url}" ${props.autoPlay ? 'autoplay' : ''} ${props.controls ? 'controls' : ''} ${props.loop ? 'loop' : ''} ${props.muted ? 'muted' : ''} style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" /></div>`;
      }
      return `<div class="${props.className || ''}" style="width: 100%; position: relative; padding-top: 56.25%; overflow: hidden; border-radius: ${props.borderRadius || 0}px; ${mapPropsToStyle(props)}"><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;

    case 'Icon':
      // Basic static fallback for Icons since they rely on dynamic Lucide rendering at runtime.
      return `<div class="${props.className || ''}" style="display: inline-flex; color: ${props.color || 'inherit'}; ${mapPropsToStyle(props)}"><svg width="${props.size || 24}" height="${props.size || 24}" viewBox="0 0 24 24" fill="${props.fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${props.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" class="lucide"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></div>`;

    case 'Text':
      return `<div style="font-size: ${props.fontSize}px; text-align: ${props.textAlign || 'left'}; color: ${props.color || 'inherit'}; ${mapPropsToStyle(props)}">${props.text || ''}</div>`;
    
    case 'Form':
      const formFields = (props.fields || []).map((f: any) => {
        let fieldHtml = '';
        const commonStyle = `width: 100%; border: 1px solid ${props.inputBorderColor || '#ddd'}; padding: 10px; border-radius: 8px; background: ${props.inputBg || '#fff'}; color: ${props.inputTextColor || '#000'}; margin-bottom: ${props.gap || 16}px;`;
        const fieldName = f.mapping === 'custom' ? f.id : f.mapping;
        
        if (f.type === 'textarea') {
            fieldHtml = `<textarea name="${fieldName}" style="${commonStyle} min-height: 100px;" placeholder="${f.placeholder || ''}"></textarea>`;
        } else if (f.type === 'select') {
            const opts = (f.options || ['Option 1']).map((o: string) => `<option value="${o}">${o}</option>`).join('');
            fieldHtml = `<select name="${fieldName}" style="${commonStyle}">${opts}</select>`;
        } else if (f.type === 'checkbox') {
            fieldHtml = `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: ${props.gap || 16}px;"><input type="checkbox" name="${fieldName}" /><label style="font-size: 14px; color: ${props.labelColor || '#333'};">${f.label}</label></div>`;
        } else if (f.type === 'radio') {
            const opts = (f.options || ['Option 1']).map((o: string, i: number) => `<div style="display: flex; align-items: center; gap: 8px;"><input type="radio" name="${fieldName}" value="${o}" /><label style="font-size: 14px; color: ${props.labelColor || '#333'};">${o}</label></div>`).join('');
            fieldHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: ${props.gap || 16}px;"><label style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: ${props.labelColor || '#333'};">${f.label}</label>${opts}</div>`;
        } else {
            fieldHtml = `<input type="${f.type}" name="${fieldName}" style="${commonStyle}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} />`;
        }

        if (f.type === 'checkbox' || f.type === 'radio') return fieldHtml;
        
        return `
          <div style="margin-bottom: ${props.gap || 16}px;">
            <label style="display: block; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; color: ${props.labelColor || '#333'};">${f.label}</label>
            ${fieldHtml}
          </div>
        `;
      }).join('');

      const resolveUrl = (link: any) => {
          if (!link) return '';
          if (typeof link === 'string') return link;
          if (link.type === 'url') return link.value;
          if (link.type === 'page') return `/${link.value}`;
          return '';
      };

      const formConfig = JSON.stringify({
          onSuccess: props.onSuccess,
          successMessage: props.successMessage,
          redirectUrl: resolveUrl(props.redirectLink)
      }).replace(/"/g, '&quot;');

      return `
        <div class="${props.className || ''}" style="padding: ${props.padding || 32}px; border-radius: ${props.borderRadius || 12}px; background: ${props.backgroundColor || '#fff'}; ${mapPropsToStyle(props)}">
          <form style="display: flex; flex-direction: column;" data-config="${formConfig}">
            ${formFields}
            <button type="submit" style="width: 100%; background: ${props.buttonBg || '#6c47ff'}; color: ${props.buttonTextColor || '#fff'}; padding: 14px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px;">${props.buttonText || 'Submit'}</button>
          </form>
        </div>
      `;


    case 'PricingTable':
      const plansHtml = (props.plans || []).map((p: any) => `
        <div style="padding: 32px; border-radius: 24px; border: 1px solid #eee; ${p.highlight ? 'background: #6c47ff; color: white;' : 'background: white;'}">
          <h4 style="font-size: 18px; font-weight: bold; margin: 0;">${p.name}</h4>
          <div style="font-size: 36px; font-weight: 900; margin: 16px 0;">${p.price}</div>
          <ul style="list-style: none; padding: 0; margin-bottom: 24px;">
            ${(p.features || []).map((f: string) => `<li style="font-size: 14px; margin-bottom: 8px;">• ${f}</li>`).join('')}
          </ul>
          <button style="width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; border: none; cursor: pointer; ${p.highlight ? 'background: white; color: #6c47ff;' : 'background: #6c47ff; color: white;'}">${p.buttonText}</button>
        </div>
      `).join('');
      return `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 32px;">${plansHtml}</div>`;

    case 'FAQ':
      const faqsHtml = (props.items || []).map((item: any) => `
        <div style="border: 1px solid ${props.borderColor || '#eee'}; border-radius: ${props.borderRadius || 12}px; padding: 24px; margin-bottom: ${props.gap || 16}px; background: ${props.itemBg || '#fff'}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: ${props.questionColor || '#111'}; letter-spacing: -0.01em;">${item.question}</div>
          <div style="color: ${props.answerColor || '#666'}; font-size: 16px; line-height: 1.6; opacity: 0.9;">${item.answer}</div>
        </div>
      `).join('');
      return `<div class="${props.className || ''}" style="max-width: 900px; margin: 0 auto; padding: ${props.padding || 48}px 24px;">${faqsHtml}</div>`;

    case 'Testimonial':
    case 'UserTestimonial':
      return `
        <div style="padding: ${props.padding || 48}px; background: ${props.backgroundColor || '#fff'}; border-radius: ${props.borderRadius || 24}px; text-align: ${props.textAlign || 'center'}; border: 1px solid rgba(0,0,0,0.05); shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
          <div style="margin: 0 auto 24px; width: 80px; height: 80px;">
            <img src="${props.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 2px solid ${props.accentColor || '#6c47ff'};" />
          </div>
          <blockquote style="font-size: 18px; font-style: italic; color: ${props.textColor || '#111'}; margin-bottom: 24px; line-height: 1.6;">"${props.quote}"</blockquote>
          <div style="font-weight: 900; text-transform: uppercase; color: ${props.textColor || '#111'};">${props.author}</div>
          <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: ${props.accentColor || '#6c47ff'}; margin-top: 4px;">${props.title}</div>
        </div>
      `;

    case 'StarRating':
      const stars = [...Array(props.count || 5)].map((_, i) => `<span style="color: ${i < Math.floor(props.rating || 5) ? (props.color || '#fbbf24') : '#e5e7eb'}; font-size: ${props.size || 24}px;">★</span>`).join('');
      return `
        <div style="text-align: ${props.alignment || 'center'}; padding: 16px 0;">
          <div style="display: flex; justify-content: ${props.alignment === 'center' ? 'center' : props.alignment === 'right' ? 'flex-end' : 'flex-start'}; gap: 4px;">${stars}</div>
          ${props.showLabel ? `<div style="font-size: 14px; font-weight: bold; color: ${props.color || '#fbbf24'}; margin-top: 8px; text-transform: uppercase;">${props.labelText}</div>` : ''}
        </div>
      `;

    case 'LogoStrip':
      const logos = (props.logos || []).map((l: any) => `
        <img src="${l.src}" alt="${l.alt}" style="height: ${props.height || 32}px; filter: ${props.grayscale ? 'grayscale(100%)' : 'none'}; opacity: ${(props.opacity || 50) / 100}; object-contain: contain;" />
      `).join('');
      return `
        <div style="background: ${props.backgroundColor || 'transparent'}; padding: ${props.padding || 48}px 0;">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: center; gap: ${props.gap || 64}px; align-items: center;">${logos}</div>
        </div>
      `;

    case 'Hero':
      return `
        <div style="min-height: ${props.minHeight || 80}vh; background-color: ${props.backgroundColor || '#fff'}; background-image: ${props.layout === 'background' ? `url(${props.backgroundImage})` : 'none'}; background-size: cover; background-position: center; padding: ${props.padding || 80}px 24px; position: relative; display: flex; align-items: center; justify-content: center;">
          ${props.layout === 'background' ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,${(props.overlayOpacity || 40) / 100}); z-index: 1;"></div>` : ''}
          <div style="position: relative; z-index: 2; max-width: 1200px; width: 100%; display: flex; flex-direction: ${props.layout === 'split' ? 'row' : 'column'}; align-items: center; gap: ${props.gap || 40}px; text-align: ${props.layout === 'split' ? 'left' : 'center'};">
            <div style="flex: 1;">${fullChildren}</div>
            ${props.layout === 'split' ? `<div style="flex: 1;"><img src="${props.backgroundImage || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop'}" style="width: 100%; border-radius: 24px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);" /></div>` : ''}
          </div>
        </div>
      `;

    case 'Navbar':
      return `
        <div style="background: ${props.backgroundColor || '#0f172a'}; color: ${props.textColor || '#fff'}; padding: ${props.padding || 16}px 24px; position: ${props.sticky ? 'sticky' : 'relative'}; top: 0; z-index: 1000; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${props.logo ? `<img src="${props.logo}" style="height: 32px;" />` : ''}
              <span style="font-weight: 900; font-size: 20px; text-transform: uppercase; letter-spacing: -1px;">${props.brandName || 'Leadsmind'}</span>
            </div>
            <div style="display: flex; gap: 32px; align-items: center;">
              ${(props.links || []).map((l: any) => `<a href="${l.href}" style="text-decoration: none; color: inherit; font-size: 14px; font-weight: bold; text-transform: uppercase; opacity: 0.8;">${l.label}</a>`).join('')}
              ${props.showButton ? `<a href="#" style="background: ${props.buttonBg || '#6c47ff'}; color: ${props.buttonTextColor || '#fff'}; padding: 10px 24px; border-radius: 99px; text-decoration: none; font-weight: bold; font-size: 13px; text-transform: uppercase;">${props.buttonText}</a>` : ''}
            </div>
          </div>
        </div>
      `;

    case 'Footer':
      const cols = (props.columns || []).map((c: any) => `
        <div style="flex: 1; min-width: 200px;">
          <h4 style="color: ${props.accentColor || '#6c47ff'}; font-size: 12px; font-weight: 900; margin-bottom: 24px; text-transform: uppercase;">${c.title}</h4>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${(c.links || []).map((l: any) => `<a href="${l.href}" style="color: ${props.textColor || '#fff'}; text-decoration: none; font-size: 14px; opacity: 0.6;">${l.label}</a>`).join('')}
          </div>
        </div>
      `).join('');
      return `
        <div style="background: ${props.backgroundColor || '#0f172a'}; color: ${props.textColor || '#fff'}; padding: ${props.padding || 80}px 24px;">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 48px;">
            <div style="flex: 1.5; min-width: 280px; margin-right: 48px;">
              <h2 style="color: ${props.accentColor || '#6c47ff'}; font-weight: 900; text-transform: uppercase; font-size: 24px; margin-bottom: 24px;">${props.brandName || 'Leadsmind'}</h2>
              <p style="opacity: 0.6; line-height: 1.6; font-size: 14px;">${props.description || ''}</p>
            </div>
            ${cols}
          </div>
        </div>
      `;

    case 'BlogFeed':
      const items = [...Array(props.count || 3)].map((_, i) => `
        <div style="background: ${props.cardBg || '#fff'}; border-radius: ${props.borderRadius || 24}px; overflow: hidden; border: 1px solid rgba(0,0,0,0.05);">
          <div style="height: 200px; background: #eee; overflow: hidden;"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426" style="width: 100%; h: 100%; object-fit: cover;" /></div>
          <div style="padding: 24px;">
            <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 12px; color: ${props.textColor || '#000'};">Sample Blog Post Title ${i + 1}</h3>
            ${props.showExcerpt ? `<p style="opacity: 0.6; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">Sample post excerpt providing context for the readers...</p>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; color: ${props.accentColor || '#6c47ff'}; text-transform: uppercase;">
              <span>Read More</span>
              ${props.showDate ? `<span style="opacity: 0.5;">Oct 12, 2024</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
      return `
        <div style="padding: 48px 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(${props.columns || 3}, 1fr); gap: 32px;">
          ${items}
        </div>
      `;

    case 'Countdown':
        return `<div style="padding: 24px; text-align: center; border-radius: 12px; border: 1px solid #eee; background: white;"><h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #999; letter-spacing: 0.1em; margin-bottom: 16px;">${props.title}</h3><div style="display: flex; justify-content: center; gap: 8px; font-family: monospace; font-size: 20px;"><span style="background: #f3f4f6; padding: 8px; border-radius: 4px;">00</span>:<span style="background: #f3f4f6; padding: 8px; border-radius: 4px;">00</span>:<span style="background: #f3f4f6; padding: 8px; border-radius: 4px;">00</span>:<span style="background: #f3f4f6; padding: 8px; border-radius: 4px;">00</span></div></div>`;

    default:
      // Try to render children anyway if it's an unknown wrapper
      return `<div data-type="${name || 'unknown'}" style="${mapPropsToStyle(props)}">${fullChildren}</div>`;
  }
}

function mapPropsToStyle(props: any): string {
    const styles: string[] = [];
    if (props.padding) styles.push(`padding: ${props.padding}px`);
    if (props.margin) styles.push(`margin: ${props.margin}px`);
    if (props.flexDirection) styles.push(`display: flex; flex-direction: ${props.flexDirection}`);
    if (props.gap) styles.push(`gap: ${props.gap}px`);
    if (props.alignItems) styles.push(`align-items: ${props.alignItems}`);
    if (props.justifyContent) styles.push(`justify-content: ${props.justifyContent}`);
    return styles.join(';');
}
