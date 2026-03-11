/**
 * GSD .gitignore bootstrapper
 *
 * Ensures a baseline .gitignore exists with universally-correct patterns.
 * Idempotent — only appends entries that are missing.
 */

import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Patterns that are always correct regardless of project type.
 * No one ever wants these tracked.
 */
const BASELINE_PATTERNS = [
  // ── GSD runtime (not source artifacts) ──
  ".gsd/activity/",
  ".gsd/runtime/",
  ".gsd/auto.lock",
  ".gsd/metrics.json",
  ".gsd/STATE.md",

  // ── OS junk ──
  ".DS_Store",
  "Thumbs.db",

  // ── Editor / IDE ──
  "*.swp",
  "*.swo",
  "*~",
  ".idea/",
  ".vscode/",
  "*.code-workspace",

  // ── Environment / secrets ──
  ".env",
  ".env.*",
  "!.env.example",

  // ── Node / JS / TS ──
  "node_modules/",
  ".next/",
  "dist/",
  "build/",

  // ── Python ──
  "__pycache__/",
  "*.pyc",
  ".venv/",
  "venv/",

  // ── Rust ──
  "target/",

  // ── Go ──
  "vendor/",

  // ── Misc build artifacts ──
  "*.log",
  "coverage/",
  ".cache/",
  "tmp/",
];

/**
 * Ensure basePath/.gitignore contains all baseline patterns.
 * Creates the file if missing; appends only missing lines if it exists.
 * Returns true if the file was created or modified, false if already complete.
 */
export function ensureGitignore(basePath: string): boolean {
  const gitignorePath = join(basePath, ".gitignore");

  let existing = "";
  if (existsSync(gitignorePath)) {
    existing = readFileSync(gitignorePath, "utf-8");
  }

  // Parse existing lines (trimmed, ignoring comments and blanks)
  const existingLines = new Set(
    existing
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );

  // Find patterns not yet present
  const missing = BASELINE_PATTERNS.filter((p) => !existingLines.has(p));

  if (missing.length === 0) return false;

  // Build the block to append
  const block = [
    "",
    "# ── GSD baseline (auto-generated) ──",
    ...missing,
    "",
  ].join("\n");

  // Ensure existing content ends with a newline before appending
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  writeFileSync(gitignorePath, existing + prefix + block, "utf-8");

  return true;
}
