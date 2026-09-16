#!/usr/bin/env node
"use strict";

// Guards against a real, previously-shipped bug (confirmed live across Velocity, Mentor, and
// Ascent — see the Button-background audit this script came out of): shadcn's <Button>
// (components/ui/button.tsx) falls back to its `default` variant whenever no `variant` prop is
// passed, which carries the Tailwind class `bg-primary`. BrandingProvider (mounted globally in
// app/layout.tsx) injects `.bg-primary { background-color: ... !important; }` for any
// authenticated user whose workspace has white-label branding configured — and `!important` in
// an author stylesheet always beats a non-important inline `style`, so any canvas-content
// component that renders <Button> with its own inline backgroundColor/color (to reflect a
// template's configured color) gets silently overridden by the workspace's unrelated admin
// brand color. Invisible in any test that isn't authenticated with real branding data, which is
// exactly why this went unnoticed until a live audit caught it.
//
// The fix for an affected component is `variant="unstyled"` (see that variant's own comment in
// components/ui/button.tsx) — an empty-class variant that never puts a themed bg-*/text-* class
// in the DOM for BrandingProvider's rule to latch onto, leaving the component's own inline style
// fully in control.
//
// This script flags any <Button ...> JSX usage in builder/user/*.tsx that has no explicit
// `variant=` attribute at all — it does not try to auto-fix, and it does not judge which variant
// is correct (a component that intentionally wants shadcn's real default look is legitimate and
// should just say `variant="default"` to make that explicit and grep-proof). It only catches the
// "forgot to think about it" case that caused this bug three separate times in one session.
//
// This is a plain text/regex scan over the TSX source, not an AST check — the thing being
// verified (a specific JSX attribute on a specific imported component) is simple enough that a
// bracket-depth-aware tag scanner is far less code than wiring up a TS/JSX parser, at the cost of
// being a heuristic rather than a real parse (see extractButtonTags below for its limits).
//
// This is the third instance of the same recurring bug family this cycle (see
// docs/builder-component-footguns.md): a shared/base component's hardcoded style or
// unset-prop fallback silently overriding what a template explicitly configured.
//
// Usage: node scripts/validate-button-variant.js
// Exit code 0 = clean, 1 = violations found.

const fs = require("fs");
const path = require("path");

const USER_DIR = path.resolve(__dirname, "..", "src", "components", "builder", "user");

/**
 * Finds every `<Button ...>` (or `<Button ... />`) opening-tag JSX usage in `source` and returns
 * its full text. Tracks `{}` depth so a multi-line `style={{ ... }}` or `onClick={() => {...}}`
 * containing `>` (e.g. an arrow function, or a JSX comparison) doesn't prematurely end the tag —
 * the scan only treats an unescaped `>` at brace-depth 0 as the tag's real end. This is a
 * heuristic, not a real JSX parse: it does not handle a `>` character sitting inside a plain
 * string literal attribute value (e.g. `title="a > b"`), which does not occur anywhere in this
 * directory today. If a future file trips that edge case, this will misparse that one tag —
 * acceptable for a flag-only lint script whose false negatives are caught by the existing "the
 * bug reproduces live" audit process, not something to add a full parser for.
 */
function extractButtonTags(source) {
  const tags = [];
  const openRe = /<Button\b/g;
  let match;
  while ((match = openRe.exec(source))) {
    let i = match.index;
    let depth = 0;
    let end = -1;
    for (let j = i; j < source.length; j++) {
      const ch = source[j];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) {
        end = j + 1;
        break;
      }
    }
    if (end === -1) continue; // unterminated — skip rather than guess
    tags.push(source.slice(i, end));
    openRe.lastIndex = end;
  }
  return tags;
}

function main() {
  const files = fs
    .readdirSync(USER_DIR)
    .filter((f) => f.endsWith(".tsx"));

  const violations = [];
  let scannedCount = 0;

  for (const file of files) {
    const fullPath = path.join(USER_DIR, file);
    const source = fs.readFileSync(fullPath, "utf8");

    // Only files that actually import shadcn's Button are in scope — a component named
    // "Button" that means something else entirely (there are none today, but don't assume).
    if (!/from ['"]@\/components\/ui\/button['"]/.test(source)) continue;
    scannedCount++;

    const fileLabel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
    const tags = extractButtonTags(source);
    for (const tag of tags) {
      if (!/\bvariant\s*=/.test(tag)) {
        const lineNumber = source.slice(0, source.indexOf(tag)).split("\n").length;
        violations.push({ file: fileLabel, line: lineNumber, snippet: tag.split("\n")[0].trim() });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `\n✖ Button variant footgun: ${violations.length} <Button> usage(s) have no explicit ` +
        `\`variant\` prop, so they silently fall back to shadcn's \`default\` variant (bg-primary) ` +
        `— vulnerable to BrandingProvider's global \`.bg-primary { ... !important }\` white-label ` +
        `override hijacking any inline background/text color this button sets for itself.\n`
    );
    for (const v of violations) {
      console.error(
        `  ${v.file}:${v.line}\n` +
          `    ${v.snippet}\n` +
          `    Fix: add an explicit \`variant="unstyled"\` (if this button owns its own color via ` +
          `inline style) or \`variant="default"\` (if shadcn's real default look is actually wanted).\n`
      );
    }
    console.error(
      "See the 'unstyled' variant's comment in components/ui/button.tsx for the full root-cause explanation.\n"
    );
    process.exitCode = 1;
  } else {
    console.log(`✓ Button variant check passed — ${scannedCount} file(s) scanned, 0 violations.`);
  }
}

main();
