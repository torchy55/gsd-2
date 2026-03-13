//! N-API bindings for the AST module.
//!
//! Forces the linker to include `gsd_ast` so napi-rs ctor registrations
//! for `astGrep` and `astEdit` are linked into the cdylib.

use gsd_ast as _;
