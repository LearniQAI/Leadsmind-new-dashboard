import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return new NextResponse('console.error("LeadsMind Support Widget: Missing widget key query parameter.");', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    // Fetch widget settings from DB using service role to bypass RLS since it's a public client
    const { data: settings, error } = await supabaseAdmin
      .from('support_widget_settings')
      .select('*')
      .eq('widget_key', key)
      .single();

    if (error || !settings) {
      return new NextResponse('console.error("LeadsMind Support Widget: Invalid widget key.");', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    const brandColor = settings.brand_color || '#2563eb';
    const welcomeMessage = settings.welcome_message || 'How can we help you today?';

    // Get the request host to dynamically construct iframe URL
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    const widgetUrl = `${protocol}://${host}/widget/iframe?key=${key}`;

    // Generate the JS script
    const jsCode = `
(function() {
  if (window.__leadsmind_widget_loaded) return;
  window.__leadsmind_widget_loaded = true;

  const key = "${key}";
  const brandColor = "${brandColor}";
  const welcomeMessage = "${welcomeMessage}";
  const widgetUrl = "${widgetUrl}";

  // Check if loaded with inline configurations
  const currentScript = document.currentScript;
  const inlineTargetId = currentScript ? currentScript.getAttribute('data-target') : null;
  const isInline = currentScript ? (currentScript.getAttribute('data-inline') === 'true') : false;

  let inlineContainer = null;
  if (inlineTargetId) {
    inlineContainer = document.getElementById(inlineTargetId);
  } else {
    inlineContainer = document.getElementById('leadsmind-support-widget');
  }

  if (isInline || inlineContainer) {
    // Render Full Inline Form
    const container = inlineContainer || document.body;
    const iframe = document.createElement('iframe');
    iframe.src = widgetUrl + "&inline=true";
    iframe.style.width = "100%";
    iframe.style.height = "520px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "14px";
    iframe.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
    iframe.style.background = "transparent";
    container.appendChild(iframe);
  } else {
    // Floating Button Launcher Layout
    const container = document.createElement('div');
    container.id = 'leadsmind-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    // Iframe Panel Container
    const iframeWrapper = document.createElement('div');
    iframeWrapper.style.width = '380px';
    iframeWrapper.style.height = '580px';
    iframeWrapper.style.borderRadius = '16px';
    iframeWrapper.style.boxShadow = '0 10px 40px rgba(0,0,0,0.25)';
    iframeWrapper.style.overflow = 'hidden';
    iframeWrapper.style.marginBottom = '16px';
    iframeWrapper.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    iframeWrapper.style.transform = 'scale(0.85) translateY(24px)';
    iframeWrapper.style.opacity = '0';
    iframeWrapper.style.pointerEvents = 'none';
    iframeWrapper.style.transformOrigin = 'bottom right';
    iframeWrapper.style.display = 'none';

    const iframe = document.createElement('iframe');
    iframe.src = widgetUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = '#04091a';
    iframeWrapper.appendChild(iframe);

    // Floating Button Launcher
    const button = document.createElement('button');
    button.style.width = '56px';
    button.style.height = '56px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = brandColor;
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    button.style.outline = 'none';

    const iconMsg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    const iconClose = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    
    button.innerHTML = iconMsg;

    let isOpen = false;
    button.onclick = function() {
      isOpen = !isOpen;
      if (isOpen) {
        button.innerHTML = iconClose;
        button.style.transform = 'rotate(90deg)';
        iframeWrapper.style.display = 'block';
        setTimeout(() => {
          iframeWrapper.style.transform = 'scale(1) translateY(0)';
          iframeWrapper.style.opacity = '1';
          iframeWrapper.style.pointerEvents = 'auto';
        }, 10);
      } else {
        button.innerHTML = iconMsg;
        button.style.transform = 'rotate(0deg)';
        iframeWrapper.style.transform = 'scale(0.85) translateY(24px)';
        iframeWrapper.style.opacity = '0';
        iframeWrapper.style.pointerEvents = 'none';
        setTimeout(() => {
          iframeWrapper.style.display = 'none';
        }, 250);
      }
    };

    container.appendChild(iframeWrapper);
    container.appendChild(button);
    document.body.appendChild(container);
  }
})();
    `;

    return new NextResponse(jsCode, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err: any) {
    return new NextResponse(`console.error("LeadsMind Support Widget: Error initializing widget: ${err.message}");`, {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}
