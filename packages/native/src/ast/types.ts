/** Options for structural AST search via ast-grep. */
export interface AstFindOptions {
  /** One or more ast-grep patterns to search for. */
  patterns: string[];
  /** Language to parse files as (e.g. "typescript", "python"). Inferred from extension when omitted. */
  lang?: string;
  /** File or directory path to search. Defaults to cwd. */
  path?: string;
  /** Glob filter for filenames (e.g. "**/*.ts"). */
  glob?: string;
  /** AST node kind selector to narrow pattern scope. */
  selector?: string;
  /** Match strictness: "cst", "smart", "ast", "relaxed", "signature". Defaults to "smart". */
  strictness?: string;
  /** Maximum number of matches to return. Defaults to 50. */
  limit?: number;
  /** Number of matches to skip before returning results. */
  offset?: number;
  /** Include meta-variable bindings in results. */
  includeMeta?: boolean;
  /** Lines of context around matches (reserved for future use). */
  context?: number;
}

/** A single structural match from ast-grep search. */
export interface AstFindMatch {
  /** Relative file path. */
  path: string;
  /** Matched source text. */
  text: string;
  /** Byte offset of match start. */
  byteStart: number;
  /** Byte offset of match end. */
  byteEnd: number;
  /** 1-indexed start line. */
  startLine: number;
  /** 1-indexed start column. */
  startColumn: number;
  /** 1-indexed end line. */
  endLine: number;
  /** 1-indexed end column. */
  endColumn: number;
  /** Meta-variable bindings (when includeMeta is true). */
  metaVariables?: Record<string, string>;
}

/** Result of an ast-grep structural search. */
export interface AstFindResult {
  /** Matched nodes (paginated by limit/offset). */
  matches: AstFindMatch[];
  /** Total match count across all files. */
  totalMatches: number;
  /** Number of files containing at least one match. */
  filesWithMatches: number;
  /** Number of files searched. */
  filesSearched: number;
  /** Whether more matches exist beyond the limit. */
  limitReached: boolean;
  /** Parse errors encountered (non-fatal). */
  parseErrors?: string[];
}

/** Options for structural AST rewrite via ast-grep. */
export interface AstReplaceOptions {
  /** Map of pattern -> replacement. Meta-variables ($VAR) in replacements are substituted. */
  rewrites: Record<string, string>;
  /** Language to parse files as. Required when path/glob spans multiple languages. */
  lang?: string;
  /** File or directory path. Defaults to cwd. */
  path?: string;
  /** Glob filter for filenames. */
  glob?: string;
  /** AST node kind selector. */
  selector?: string;
  /** Match strictness. Defaults to "smart". */
  strictness?: string;
  /** Preview changes without writing files. Defaults to true. */
  dryRun?: boolean;
  /** Maximum total replacements. */
  maxReplacements?: number;
  /** Maximum files to modify. */
  maxFiles?: number;
  /** Fail on parse errors instead of skipping. */
  failOnParseError?: boolean;
}

/** A single replacement change from ast-grep rewrite. */
export interface AstReplaceChange {
  /** Relative file path. */
  path: string;
  /** Original source text. */
  before: string;
  /** Replacement text. */
  after: string;
  /** Byte offset of change start. */
  byteStart: number;
  /** Byte offset of change end. */
  byteEnd: number;
  /** Number of bytes deleted. */
  deletedLength: number;
  /** 1-indexed start line. */
  startLine: number;
  /** 1-indexed start column. */
  startColumn: number;
  /** 1-indexed end line. */
  endLine: number;
  /** 1-indexed end column. */
  endColumn: number;
}

/** Per-file change summary. */
export interface AstReplaceFileChange {
  /** Relative file path. */
  path: string;
  /** Number of replacements in this file. */
  count: number;
}

/** Result of an ast-grep structural rewrite. */
export interface AstReplaceResult {
  /** Individual replacement changes. */
  changes: AstReplaceChange[];
  /** Per-file change summaries. */
  fileChanges: AstReplaceFileChange[];
  /** Total number of replacements. */
  totalReplacements: number;
  /** Number of files modified. */
  filesTouched: number;
  /** Number of files searched. */
  filesSearched: number;
  /** Whether changes were written to disk (false when dryRun is true). */
  applied: boolean;
  /** Whether limits stopped processing early. */
  limitReached: boolean;
  /** Parse errors encountered (non-fatal). */
  parseErrors?: string[];
}
