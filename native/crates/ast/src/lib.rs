//! AST-aware structural search and rewrite for GSD.
//!
//! Provides `astGrep` (search) and `astEdit` (rewrite) N-API functions
//! powered by ast-grep with tree-sitter grammars for 38+ languages.

#![allow(clippy::needless_pass_by_value)]

pub mod ast;
pub mod glob_util;
pub mod language;
