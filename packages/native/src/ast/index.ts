/**
 * AST-aware structural search and rewrite via ast-grep.
 *
 * Supports 38+ languages with tree-sitter grammars.
 */

import { native } from "../native.js";
import type {
  AstFindOptions,
  AstFindResult,
  AstReplaceChange,
  AstReplaceFileChange,
  AstReplaceOptions,
  AstReplaceResult,
  AstFindMatch,
} from "./types.js";

export type {
  AstFindMatch,
  AstFindOptions,
  AstFindResult,
  AstReplaceChange,
  AstReplaceFileChange,
  AstReplaceOptions,
  AstReplaceResult,
};

/**
 * Structural code search using ast-grep patterns.
 *
 * Searches files for AST patterns across 38+ languages. Unlike regex,
 * patterns match the syntax tree structure, ignoring whitespace and
 * formatting differences.
 *
 * @example
 * ```ts
 * const result = astGrep({
 *   patterns: ["console.log($$$ARGS)"],
 *   path: "./src",
 *   lang: "typescript",
 * });
 * ```
 */
export function astGrep(options: AstFindOptions): AstFindResult {
  return (native as Record<string, Function>).astGrep(options) as AstFindResult;
}

/**
 * Structural code rewrite using ast-grep patterns.
 *
 * Applies pattern->replacement rewrites across files. Meta-variables
 * ($VAR, $$$ARGS) captured in patterns are substituted in replacements.
 * Defaults to dry-run mode -- set `dryRun: false` to write changes.
 *
 * @example
 * ```ts
 * const result = astEdit({
 *   rewrites: { "console.log($$$ARGS)": "logger.info($$$ARGS)" },
 *   path: "./src",
 *   lang: "typescript",
 *   dryRun: false,
 * });
 * ```
 */
export function astEdit(options: AstReplaceOptions): AstReplaceResult {
  return (native as Record<string, Function>).astEdit(options) as AstReplaceResult;
}
