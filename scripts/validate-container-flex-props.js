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
    label: "display",
    classPattern: /\b(?:flex|inline-flex|grid|inline-grid)\b/,
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

function checkNode(fileLabel, nodeId, node, violations) {
  if (node?.type?.resolvedName !== "Container") return;
  const className = node.props?.className;
  if (typeof className !== "string" || className.trim() === "") return;

  for (const rule of RISK_RULES) {
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
          `    Fix: add \`${v.missingProp}\` (matching what the class already intends) to this node's props.\n`
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
    console.log(`✓ Container display-prop check passed — ${files.length} template(s) scanned, 0 violations.`);
  }
}

main().catch((err) => {
  console.error("validate-container-flex-props.js crashed:", err);
  process.exitCode = 1;
});
