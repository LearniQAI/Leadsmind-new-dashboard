import { NextRequest, NextResponse } from 'next/server';

// Serves the LeadsMind form embed SDK as a JavaScript file
// GET /embed/form.js
export async function GET(_req: NextRequest) {
  // This is the minification-ready embed SDK
  // In production, this would be a compiled/minified bundle from form.ts
  // For now, we serve the SDK source directly as a JS response

  const sdk = `
/* LeadsMind Embed SDK v1.0 */
(function(w,d){'use strict';
  var scripts=d.querySelectorAll('script[data-form-id]');
  var s=scripts[scripts.length-1];
  if(!s)return;
  var formId=s.getAttribute('data-form-id');
  var wsId=s.getAttribute('data-workspace');
  var mode=s.getAttribute('data-mode')||'iframe';
  if(!formId||!wsId){console.warn('[LeadsMind] Missing data-form-id or data-workspace');return;}
  var base=(s.src||'').replace(/\\/embed\\/form\\.js.*/,'');
  if(!base)base='';
  var cId='leadsmind-form-'+formId;
  var c=d.getElementById(cId);
  if(!c){console.warn('[LeadsMind] Container #'+cId+' not found');return;}
  if(c.getAttribute('data-lm-init'))return;
  c.setAttribute('data-lm-init','1');

  if (mode === "iframe" || mode === "inline") {
    mountIframe(c, base, formId);
  }

  function mountIframe(c, base, id) {
    // Initial container state
    c.style.transition = 'all 0.3s ease';
    c.style.position = 'relative';

    var f = d.createElement('iframe');
    f.src = base + '/public/forms/' + id + '?embed=1';
    f.setAttribute('frameborder', '0');
    f.setAttribute('scrolling', 'no');
    f.setAttribute('title', 'LeadsMind Form');
    f.style.cssText = 'width:100%;min-height:400px;border:none;display:block;transition:all 0.3s ease;';
    c.appendChild(f);

    w.addEventListener('message', function(e) {
      if (!e.data) return;
      
      // Auto-resize standard embed
      if (e.data.type === 'lm_resize') {
        var h = parseInt(e.data.height, 10);
        if (!isNaN(h) && h > 0) f.style.height = (h + 24) + 'px';
      }

      // Campaign Orchestration (Sprint 5/6)
      if (e.data.type === 'lm_campaign_open') {
        // Make iframe fullscreen to act as popup overlay
        c.style.position = 'fixed';
        c.style.top = '0';
        c.style.left = '0';
        c.style.width = '100vw';
        c.style.height = '100vh';
        c.style.zIndex = '2147483647';
        f.style.height = '100vh';
      }

      if (e.data.type === 'lm_campaign_close') {
        // Revert iframe to standard embed bounds (or hide if purely a popup campaign)
        c.style.position = 'relative';
        c.style.width = 'auto';
        c.style.height = 'auto';
        c.style.zIndex = 'auto';
        f.style.height = 'auto'; // Will trigger a resize message shortly
      }
    });
  }
})(window, document);`;

  return new NextResponse(sdk, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
