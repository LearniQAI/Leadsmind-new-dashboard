import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { SandboxedHtml } from "./SandboxedHtml";

// Security-critical regression guard for the Audio "Embed code" mode + the HTML Code block.
// The whole containment story depends on this exact attribute combination — if a future
// edit adds `allow-same-origin` (or `allow-top-navigation` / `allow-popups` / `allow-forms`
// / `allow-modals`), pasted third-party scripts could reach real user data or the parent
// page. These assertions fail loudly if that happens.

describe("SandboxedHtml", () => {
  const markup = renderToStaticMarkup(<SandboxedHtml html="<p>hi</p>" />);

  it("renders the HTML via srcDoc, never as parent-page innerHTML", () => {
    expect(markup).toContain("<iframe");
    expect(markup).toMatch(/srcdoc|srcDoc/i);
  });

  it('uses exactly sandbox="allow-scripts"', () => {
    expect(markup).toContain('sandbox="allow-scripts"');
  });

  it("never grants allow-same-origin (would let the frame drop its own sandbox)", () => {
    expect(markup).not.toContain("allow-same-origin");
  });

  it("grants no navigation / popup / form / modal / download escape hatches", () => {
    for (const token of [
      "allow-top-navigation",
      "allow-popups",
      "allow-forms",
      "allow-modals",
      "allow-downloads",
      "allow-pointer-lock",
      "allow-presentation",
    ]) {
      expect(markup).not.toContain(token);
    }
  });

  it("sends no referrer to the embedded origin", () => {
    expect(markup).toMatch(/referrerpolicy="no-referrer"/i);
  });

  it("renders nothing for empty / whitespace input", () => {
    expect(renderToStaticMarkup(<SandboxedHtml html="" />)).toBe("");
    expect(renderToStaticMarkup(<SandboxedHtml html={"   \n  \t"} />)).toBe("");
  });
});
