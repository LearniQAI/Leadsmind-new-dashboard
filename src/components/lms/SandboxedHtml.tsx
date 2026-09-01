"use client";

import React from "react";

interface SandboxedHtmlProps {
  /** Raw, admin-pasted HTML string (may contain <script>, third-party embeds, etc.). */
  html: string;
  /** Wrapper class — control sizing here (e.g. "aspect-video", "h-[420px]"). */
  className?: string;
  /** Inner <iframe> class — defaults to filling the wrapper. */
  iframeClassName?: string;
  title?: string;
}

/**
 * Shared sandboxed renderer for arbitrary admin-pasted HTML (Audio "Embed code" mode +
 * the HTML Code content block).
 *
 * SECURITY — this is the whole point of the component:
 *  - The HTML is injected via `srcDoc`, never `dangerouslySetInnerHTML`, so nothing from
 *    the pasted string touches the real page DOM.
 *  - `sandbox="allow-scripts"` WITHOUT `allow-same-origin`. That specific combination puts
 *    the iframe content in a unique, opaque origin: embedded scripts can run (so real
 *    audio/podcast players and interactive widgets work), but they have NO access to the
 *    parent page's cookies, localStorage/sessionStorage, or DOM, and cannot act as the
 *    logged-in student/admin. `allow-scripts` + `allow-same-origin` together would let the
 *    frame remove its own sandbox — we deliberately never combine them.
 *  - No `allow-top-navigation`, `allow-popups`, `allow-forms`, `allow-modals`,
 *    `allow-downloads` — kept as tight as possible while still letting a media player load
 *    and play. Add a token here only for a real, specific, reviewed use case.
 *  - `referrerPolicy="no-referrer"` so the embed can't learn the admin/course URL.
 *
 * This is a strictly larger attack surface than the URL-based Embed block (which sandboxes
 * a URL's *destination*); here we sandbox arbitrary pasted *code*, so the containment is
 * intentionally stricter than that block's `src`-iframe.
 */
export function SandboxedHtml({
  html,
  className = "",
  iframeClassName = "h-full w-full border-0",
  title = "Embedded content",
}: SandboxedHtmlProps) {
  if (!html || !html.trim()) return null;

  return (
    <div className={className}>
      <iframe
        // NOTE: intentionally no allow-same-origin — see the security note above.
        sandbox="allow-scripts"
        srcDoc={html}
        className={iframeClassName}
        title={title}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
}
