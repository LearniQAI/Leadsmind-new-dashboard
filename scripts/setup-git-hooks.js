#!/usr/bin/env node
"use strict";

// Runs automatically via npm's `prepare` lifecycle script (see package.json) after every
// `npm install`, so every clone/checkout gets the repo's tracked hooks in .githooks/ without
// installing husky or any other dependency just for one hook. Idempotent — safe to run every
// install. Silently no-ops outside a git repo (e.g. when installed as a dependency, or in an
// environment with no .git directory) rather than failing the install.

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const repoRoot = path.resolve(__dirname, "..");
const gitDir = path.join(repoRoot, ".git");

if (!fs.existsSync(gitDir)) {
  process.exit(0);
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: repoRoot, stdio: "ignore" });
  console.log("Git hooks path set to .githooks/ (pre-commit: Container display-prop template check).");
} catch (err) {
  // Never fail `npm install` over this — worst case, the pre-commit check simply doesn't run
  // locally and the same check still runs in CI.
  console.warn("Could not configure git hooks path automatically:", err.message);
}
