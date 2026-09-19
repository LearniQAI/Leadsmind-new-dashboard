#!/usr/bin/env node
"use strict";

// Guards against a real, previously-shipped bug (confirmed live in Velocity + 8 other
// templates): Container.tsx has two parallel, equal-priority ways to control layout — a
// free-text `className` and a set of structured props (`display`, `flexDirection`,
// `justifyContent`, `alignItems`) that Container.tsx's `getResponsiveStyles()` compiles into
// a real injected <style> rule, scoped to that exact node, physically later in the document
// than Tailwind's own stylesheet. When a Container node is authored with a hand-typed
// flex/grid className but no matching structured prop, Container.craft.props' defaults
// (display: 'block', flexDirection: 'row', justifyContent: 'flex-start',
// alignItems: 'stretch') get merged in and WIN the cascade over the className — silently
// collapsing the intended layout to block, with nothing in the JSX/JSON showing anything is
// wrong. This cannot be fixed by changing Container.tsx's own defaults without real risk to
// every existing template (see the audit this script came out of) — so this catches new or
// reintroduced instances of the same authoring mistake instead.
//
// This is a plain Node script, not an ESLint rule, because the thing being checked is each
// template's serialized Craft.js node tree (JSON `content`), not the TypeScript AST — ESLint
// has no visibility into that structure.
//
// This is one instance of a recurring bug family (see docs/builder-component-footguns.md): a
// shared/base component's hardcoded style or unset-prop fallback silently overriding what a
// template explicitly configured.
//
// Usage: node scripts/validate-container-flex-props.js
// Exit code 0 = clean, 1 = violations found (or a template failed to load).

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { execFileSync } = require("child_process");

const TEMPLATES_DIR = path.resolve(__dirname, "..", "src", "lib", "builder", "templates");

// [regex matching a Tailwind token that implies this CSS property, structured prop key(s) that
// must be explicitly set when that token is present]. `props` is an array because a couple of
// checks accept either a base prop or a responsive variant of it (see flexDirection).
const RISK_RULES = [
  {
    // Negative lookahead excludes flex-ITEM sizing utilities (flex-1, flex-auto, flex-none,
    // flex-initial, flex-shrink, flex-grow, flex-basis-*, flex-row/col, grid-cols-*, etc.) —
    // \b alone matches "flex" as a standalone word even inside "flex-1", since "-" is a
    // non-word character and word-boundary regex doesn't look past it. Those utilities size
    // an element AS a flex/grid item (a property of its PARENT's display), they don't set
    // this element's own `display`, so they must not trigger the "add a display prop" fix.
    label: "display",
    classPattern: /\b(?:flex|inline-flex|grid|inline-grid)\b(?!-)/,
    requiredProps: ["display"],
  },
  {
    label: "flexDirection",
    classPattern: /\bflex-(?:row|col)(?:-reverse)?\b/,
    requiredProps: ["flexDirection", "flexDirection_mobile", "flexDirection_tablet"],
  },
  {
    label: "justifyContent",
    classPattern: /\bjustify-(?:start|end|center|between|around|evenly|normal|stretch)\b/,
    requiredProps: ["justifyContent"],
  },
  {
    label: "alignItems",
    classPattern: /\bitems-(?:start|end|center|baseline|stretch)\b/,
    requiredProps: ["alignItems"],
  },
  {
    // Live-verified real bug (Archiste template audit): Container.craft.props defaults
    // `backgroundColor` to 'transparent', which Craft merges in for any node that doesn't set
    // it explicitly — Container.tsx's getResponsiveStyles() then emits a real
    // `.node-<id> { background-color: transparent }` rule in an injected <style> tag, which
    // wins over an equivalent `bg-*` Tailwind class in the same node's className by DOM source
    // order, regardless of equal selector specificity. A hand-typed `bg-white`/`bg-[#f4f2ee]`/
    // `bg-slate-100`/etc. className with no matching `backgroundColor` prop silently renders
    // transparent instead. Deliberately excludes non-color bg-* utilities (bg-cover, bg-center,
    // bg-gradient-to-*, bg-clip-*, bg-no-repeat, etc.) and `bg-transparent` itself (already the
    // default, so not a bug even if it "wins") — only matches bg-* tokens that are actually a
    // Tailwind color name/family, `current`/`inherit`, or an arbitrary color value.
    label: "backgroundColor",
    classPattern: /\bbg-(?:white|black|current|inherit|\[(?:#|rgb|rgba|hsl)|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|primary|secondary|accent|dash-[a-zA-Z]+)(?:-\d{2,3})?)\b/,
    requiredProps: ["backgroundColor", "backgroundGradient"],
  },
];

/**
 * Loads a template module via a real import (handles both `content: "<escaped JSON string>"`
 * and `content: JSON.stringify({...})` authoring styles equally, since both just need to
 * produce a real JSON string at runtime — regex-parsing the source text for two different
 * formats is exactly the kind of fragility that caused this bug in the first place).
 */
async function loadTemplateContent(filePath) {
  const mod = await import(pathToFileURL(filePath).href);
  const tpl = Object.values(mod).find(
    (v) => v && typeof v === "object" && typeof v.content === "string"
  );
  if (!tpl) return null;
  return JSON.parse(tpl.content);
}

// A flex Container with 2+ children and no explicit flexDirection silently lays them out in a ROW:
// Container.craft.props defaults flexDirection to 'row' and Craft merges that default in for any
// node that doesn't set it, so getResponsiveStyles() emits `flex-direction: row`. Found live in the
// funnel-step utility templates (heading and card rendered side by side). Distinct from the
// className-vs-prop rules below: these nodes had no direction class at all, so nothing else fired.
const FLEX_CLASS = /\b(?:flex|inline-flex)\b(?!-)/;
const DIRECTION_PROPS = ["flexDirection", "flexDirection_tablet", "flexDirection_mobile"];

function checkMultiChildFlexDirection(fileLabel, nodeId, node, violations) {
  const props = node.props || {};
  const isFlex =
    ["display", "display_tablet", "display_mobile"].some((k) => /^(?:inline-)?flex$/.test(props[k] ?? "")) ||
    (typeof props.className === "string" && FLEX_CLASS.test(props.className));
  if (!isFlex) return;
  if (!Array.isArray(node.nodes) || node.nodes.length < 2) return;
  if (DIRECTION_PROPS.some((k) => props[k] !== undefined)) return;
  violations.push({
    file: fileLabel,
    nodeId,
    className: props.className ?? "",
    missingProp: "flexDirection",
    matchedToken: `display:flex with ${node.nodes.length} children`,
    hint: "a flex Container with 2+ children and no flexDirection lays them out in a ROW (Container.craft default). Set flexDirection: 'column' (or 'row' if intended).",
  });
}

function checkNode(fileLabel, nodeId, node, violations) {
  if (node?.type?.resolvedName !== "Container") return;
  checkMultiChildFlexDirection(fileLabel, nodeId, node, violations);
  const className = node.props?.className;
  if (typeof className !== "string" || className.trim() === "") return;

  for (const rule of RISK_RULES) {
    // ROOT is special-cased in Container.tsx itself: it strips any `bg-*` class out of its
    // className and always renders `var(--theme-bg)` regardless, so a `bg-*` token there is
    // inert by design, not a bug — only relevant to the backgroundColor rule since ROOT
    // realistically never carries flex/grid classes.
    if (nodeId === "ROOT" && rule.label === "backgroundColor") continue;
    if (!rule.classPattern.test(className)) continue;
    const hasRequiredProp = rule.requiredProps.some(
      (propName) => node.props?.[propName] !== undefined
    );
    if (!hasRequiredProp) {
      violations.push({
        file: fileLabel,
        nodeId,
        className,
        missingProp: rule.requiredProps[0],
        matchedToken: className.match(rule.classPattern)[0],
      });
    }
  }
}

async function main() {
  const files = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts");

  const violations = [];
  const loadErrors = [];

  for (const file of files) {
    const fullPath = path.join(TEMPLATES_DIR, file);
    const fileLabel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
    let content;
    try {
      content = await loadTemplateContent(fullPath);
    } catch (err) {
      loadErrors.push({ file: fileLabel, error: err.message });
      continue;
    }
    if (!content) {
      loadErrors.push({ file: fileLabel, error: "no template export with a `content` string found" });
      continue;
    }
    for (const [nodeId, node] of Object.entries(content)) {
      checkNode(fileLabel, nodeId, node, violations);
    }
  }

  // Blank Slate is defined inline in templates.ts (BLANK_PAGE), one directory up from
  // TEMPLATES_DIR — the directory scan above never sees it, so it was silently unchecked by
  // this script until this was noticed during a coverage review. Checked separately here
  // rather than folded into the loop above, since it's not a `<name>.ts` file exporting a
  // `{ content: "..." }`-shaped template object; it's a bare JSON string constant.
  const templatesTsPath = path.resolve(TEMPLATES_DIR, "..", "templates.ts");
  const blankSlateLabel = path.relative(process.cwd(), templatesTsPath).replace(/\\/g, "/") + " (BLANK_PAGE / blank-slate)";
  try {
    const mod = await import(pathToFileURL(templatesTsPath).href);
    const blankPageJson = mod.BLANK_PAGE;
    if (typeof blankPageJson !== "string") {
      loadErrors.push({ file: blankSlateLabel, error: "no `BLANK_PAGE` string export found" });
    } else {
      const content = JSON.parse(blankPageJson);
      for (const [nodeId, node] of Object.entries(content)) {
        checkNode(blankSlateLabel, nodeId, node, violations);
      }
    }
  } catch (err) {
    loadErrors.push({ file: blankSlateLabel, error: err.message });
  }

  if (loadErrors.length > 0) {
    console.error("\n✖ Could not load the following template files:\n");
    for (const e of loadErrors) {
      console.error(`  ${e.file}\n    ${e.error}`);
    }
  }

  if (violations.length > 0) {
    console.error(
      `\n✖ Container display-prop footgun: ${violations.length} node(s) have a hand-typed Tailwind class ` +
        `implying a CSS property that Container.tsx's structured props will silently override.\n`
    );
    for (const v of violations) {
      console.error(
        `  ${v.file}\n` +
          `    node "${v.nodeId}" — className has "${v.matchedToken}" but no explicit \`${v.missingProp}\` prop is set.\n` +
          `    className: "${v.className}"\n` +
          `    Fix: ${v.hint ?? `add \`${v.missingProp}\` (matching what the class already intends) to this node's props.`}\n`
      );
    }
    console.error(
      "See Container.tsx's craft.props defaults (display/flexDirection/justifyContent/alignItems) — " +
        "those defaults get merged onto every Container node and compiled into a real CSS rule that " +
        "wins over an equivalent Tailwind utility class in the same className.\n"
    );
  }

  if (violations.length > 0 || loadErrors.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`✓ Container display-prop check passed — ${files.length + 1} template(s) scanned (incl. Blank Slate), 0 violations.`);
  }
}

main().catch((err) => {
  console.error("validate-container-flex-props.js crashed:", err);
  process.exitCode = 1;
});
