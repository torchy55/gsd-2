# S06 — Research

**Date:** 2026-03-23

## Summary

S06 is the cleanup slice that removes parser code from the production runtime path. All 16+ callers were migrated to DB-primary with lazy `createRequire` parser fallback in S04–S05. S06 removes those lazy fallback paths entirely, making callers DB-only with graceful degradation when DB is unavailable. The parser functions themselves (`parseRoadmap`, `parsePlan`, `parseRoadmapSlices`) are relocated to a `parsers-legacy.ts` module used only by `md-importer.ts` (pre-M002 migration), `state.ts` `_deriveStateImpl()` (pre-migration fallback), `detectStaleRenders()` (intentional disk-vs-DB comparison), and `commands-maintenance.ts` (cold-path branch cleanup).

This is straightforward mechanical work — the pattern is established, the callers are known, and the verification is simple: grep for imports, run the test suite. The main risk is breaking a fallback path that's hard to test in normal CI (the `isDbAvailable() === false` branch).

## Recommendation

Three-task decomposition:

1. **Create `parsers-legacy.ts`** — Move `parseRoadmap()`, `_parseRoadmapImpl()`, `parsePlan()`, `_parsePlanImpl()` from `files.ts` into a new `parsers-legacy.ts` file. Move `parseRoadmapSlices()`, `expandDependencies()`, and all helper functions from `roadmap-slices.ts` into the same file (or have `parsers-legacy.ts` import from `roadmap-slices.ts` — either works). Update `md-importer.ts`, `state.ts`, `commands-maintenance.ts`, and `markdown-renderer.ts` `detectStaleRenders()` to import from the new location. Update test files that test parsers directly.

2. **Remove all lazy fallback paths from callers** — Strip the `createRequire` lazy parser singletons and the `else` branches from all 16 migrated callers. Each caller's `if (isDbAvailable()) { ... } else { /* parser fallback */ }` becomes just the DB path with graceful skip/empty-return when DB is unavailable. This is the bulk of the line reduction.

3. **Final cleanup + verification** — Remove `parseRoadmap`/`parsePlan` exports from `files.ts` (they now live in `parsers-legacy.ts`). Clean up the `roadmap-slices.ts` → `files.ts` import chain. Remove parser counters from `debug-logger.ts` (or keep them — they're still valid if the legacy parsers use them). Run full test suite. Grep verification for zero dispatch-loop parser references.

## Implementation Landscape

### Key Files

- **`src/resources/extensions/gsd/roadmap-slices.ts`** (271 lines) — Contains `parseRoadmapSlices()` with 12 prose variant patterns, `expandDependencies()`, table parser, checkbox parser, prose header parser. The entire file is the removal target. Either absorbed into `parsers-legacy.ts` or kept as-is and only imported by `parsers-legacy.ts`.
- **`src/resources/extensions/gsd/files.ts`** (1170 lines) — Contains `parseRoadmap()` (lines 122–211, ~90 lines), `parsePlan()` (lines 317–443, ~125 lines), and their cached-parse wrappers. These move to `parsers-legacy.ts`. Also imports `parseRoadmapSlices` from `roadmap-slices.js` at line 24 and `nativeParseRoadmap`/`nativeParsePlanFile` from `native-parser-bridge.js` at line 25 — both imports move with the parser functions.
- **`src/resources/extensions/gsd/dispatch-guard.ts`** (106 lines) — Hot path. Has `lazyParseRoadmapSlices()` fallback at lines 13–23. Remove the fallback function and the `else` branch at line 88. When DB unavailable, return `null` (no blocker info available).
- **`src/resources/extensions/gsd/auto-dispatch.ts`** (656 lines) — Hot path. Has `_lazyParseRoadmap` singleton at lines 19–29. Three `if (isDbAvailable())` blocks at lines 192, 532, 600. Remove fallback branches.
- **`src/resources/extensions/gsd/auto-verification.ts`** (233 lines) — Hot path. Has disk fallback at lines 71–83. Remove.
- **`src/resources/extensions/gsd/parallel-eligibility.ts`** — Hot path. Has fallback at lines 42+. Remove.
- **`src/resources/extensions/gsd/doctor.ts`** — Warm path. Has `_lazyParsers` singleton. Remove fallback, keep DB path.
- **`src/resources/extensions/gsd/doctor-checks.ts`** — Warm path. Has `_lazyParseRoadmap`. Remove fallback.
- **`src/resources/extensions/gsd/visualizer-data.ts`** — Warm path. Has `_lazyParsers`. Remove fallback.
- **`src/resources/extensions/gsd/workspace-index.ts`** — Warm path. Has `_lazyParsers`. Note: `titleFromRoadmapHeader` at line 80 is parser-only with no DB path — needs special handling (either add DB path or remove feature when DB unavailable).
- **`src/resources/extensions/gsd/dashboard-overlay.ts`** — Warm path. Has `_lazyParsers`. Remove fallback.
- **`src/resources/extensions/gsd/auto-dashboard.ts`** — Warm path. Has `_lazyParsers`. Remove fallback.
- **`src/resources/extensions/gsd/guided-flow.ts`** — Warm path. Has `_lazyParseRoadmap`. Remove fallback.
- **`src/resources/extensions/gsd/auto-prompts.ts`** — Warm path. Has async `lazyParseRoadmap`/`lazyParsePlan` helpers (6 call sites). Remove fallback branches.
- **`src/resources/extensions/gsd/auto-recovery.ts`** — Warm path. Has 2 inline `createRequire` fallbacks. Remove.
- **`src/resources/extensions/gsd/auto-direct-dispatch.ts`** — Warm path. Has 2 inline `createRequire` fallbacks. Remove.
- **`src/resources/extensions/gsd/auto-worktree.ts`** — Warm path. Has 1 inline `createRequire` fallback. Remove.
- **`src/resources/extensions/gsd/reactive-graph.ts`** — Warm path. Has 1 inline `createRequire` fallback. Remove.
- **`src/resources/extensions/gsd/markdown-renderer.ts`** — `detectStaleRenders()` at line 780 uses lazy parser — keep this one, but change import source to `parsers-legacy.ts`.
- **`src/resources/extensions/gsd/state.ts`** — `_deriveStateImpl()` uses `parseRoadmap`/`parsePlan` at module-level import from `files.js`. Change import source to `parsers-legacy.ts`.
- **`src/resources/extensions/gsd/md-importer.ts`** — Module-level import of `parseRoadmap`/`parsePlan` from `files.js` at line 32. Change import source to `parsers-legacy.ts`.
- **`src/resources/extensions/gsd/commands-maintenance.ts`** — Dynamic import of `parseRoadmap` from `files.js` at line 47. Change import source to `parsers-legacy.ts` or migrate to DB query (cold path, either approach works).
- **`src/resources/extensions/gsd/debug-logger.ts`** — Has `parseRoadmapCalls`/`parsePlanCalls` counters at lines 22–25 and summary output at lines 162–166. Keep — the legacy parsers still call `debugCount()`.
- **`src/resources/extensions/gsd/native-parser-bridge.ts`** — Provides `nativeParseRoadmap()`/`nativeParsePlanFile()` called by `_parseRoadmapImpl()`/`_parsePlanImpl()`. Moves with the parser functions to `parsers-legacy.ts` imports.

### Callers to Strip (16 files, all have `isDbAvailable()` + lazy fallback pattern)

| File | Lazy singleton / import to remove | DB function used |
|------|-----------------------------------|------------------|
| `dispatch-guard.ts` | `lazyParseRoadmapSlices()` | `getMilestoneSlices()` |
| `auto-dispatch.ts` | `_lazyParseRoadmap` | `getMilestoneSlices()` |
| `auto-verification.ts` | inline `createRequire` for `parsePlan` | `getTask()` |
| `parallel-eligibility.ts` | inline `createRequire` for `parseRoadmap`/`parsePlan` | `getMilestoneSlices()`/`getSliceTasks()` |
| `doctor.ts` | `_lazyParsers` | `getMilestoneSlices()`/`getSliceTasks()` |
| `doctor-checks.ts` | `_lazyParseRoadmap` | `getMilestoneSlices()` |
| `visualizer-data.ts` | `_lazyParsers` | `getMilestoneSlices()`/`getSliceTasks()` |
| `workspace-index.ts` | `_lazyParsers` | `getMilestoneSlices()`/`getSliceTasks()` |
| `dashboard-overlay.ts` | `_lazyParsers` | `getMilestoneSlices()`/`getSliceTasks()` |
| `auto-dashboard.ts` | `_lazyParsers` | `getMilestoneSlices()`/`getSliceTasks()` |
| `guided-flow.ts` | `_lazyParseRoadmap` | `getMilestoneSlices()` |
| `auto-prompts.ts` | `lazyParseRoadmap()`/`lazyParsePlan()` | `getMilestoneSlices()`/`getSliceTasks()` |
| `auto-recovery.ts` | 2× inline `createRequire` | DB queries |
| `auto-direct-dispatch.ts` | 2× inline `createRequire` | `getMilestoneSlices()` |
| `auto-worktree.ts` | 1× inline `createRequire` | `getMilestoneSlices()` |
| `reactive-graph.ts` | 1× inline `createRequire` | `getSliceTasks()` |

### Build Order

1. **T01: Create `parsers-legacy.ts` + relocate parsers** — Move `parseRoadmap()`, `parsePlan()`, supporting functions, and `roadmap-slices.ts` content into `parsers-legacy.ts`. Update the 4 legitimate consumers (`md-importer.ts`, `state.ts`, `commands-maintenance.ts`, `markdown-renderer.ts detectStaleRenders()`) to import from new location. Update test files. Run parser tests + cross-validation tests to confirm nothing broke. This must go first because T02 removes the `files.ts` exports that callers currently fall back to.

2. **T02: Strip lazy fallback paths from all 16 callers** — Remove `createRequire` imports, lazy parser singletons, and `else` branches from all migrated callers. Each `if (isDbAvailable())` check either becomes: (a) just the DB path with early return/skip when DB unavailable, or (b) the `if` guard is removed entirely if the caller is only reached when DB is active (like hot-path dispatch functions). Remove the `import { createRequire }` from files that no longer need it. Run the full test suite.

3. **T03: Final cleanup + verification** — Remove `parseRoadmap`/`parsePlan` from `files.ts` exports. Remove `import { parseRoadmapSlices }` from `files.ts`. Clean up `roadmap-slices.ts` (either delete if fully absorbed, or mark as legacy-only). Update `files.ts` to remove the `native-parser-bridge` imports that only the parser functions used. Final grep verification: zero `parseRoadmap`/`parsePlan`/`parseRoadmapSlices` references in dispatch loop files. Run full test suite.

### Verification Approach

1. **Grep verification (primary):**
   ```bash
   # Zero parser references in dispatch loop (excluding comments):
   grep -rn 'parseRoadmap\|parsePlan\|parseRoadmapSlices' \
     src/resources/extensions/gsd/dispatch-guard.ts \
     src/resources/extensions/gsd/auto-dispatch.ts \
     src/resources/extensions/gsd/auto-verification.ts \
     src/resources/extensions/gsd/parallel-eligibility.ts

   # Zero createRequire in callers that had fallbacks removed:
   grep -rn 'createRequire' src/resources/extensions/gsd/{doctor,doctor-checks,visualizer-data,workspace-index,dashboard-overlay,auto-dashboard,guided-flow,auto-prompts,auto-recovery,auto-direct-dispatch,auto-worktree,reactive-graph,dispatch-guard,auto-dispatch,auto-verification,parallel-eligibility}.ts

   # Parser functions only exist in parsers-legacy.ts, md-importer.ts, and test files:
   grep -rn 'parseRoadmap\|parsePlan\|parseRoadmapSlices' src/resources/extensions/gsd/*.ts \
     | grep -v '/tests/' | grep -v 'parsers-legacy' | grep -v 'md-importer' \
     | grep -v 'debug-logger' | grep -v 'native-parser-bridge' \
     | grep -v 'state.ts' | grep -v 'commands-maintenance' | grep -v 'markdown-renderer'
   # Should return zero lines
   ```

2. **Test suite verification:**
   - `parsers.test.ts` — all existing parser tests pass (import path updated)
   - `roadmap-slices.test.ts` — 16 tests pass (import path updated)
   - `planning-crossval.test.ts` — 65 tests pass (import path updated)
   - `markdown-renderer.test.ts` — 106 tests pass
   - `doctor.test.ts` — 55 tests pass
   - `auto-dashboard.test.ts` — 24 tests pass
   - `auto-recovery.test.ts` — 33 tests pass
   - `derive-state-db.test.ts` — 105 tests pass
   - `derive-state-crossval.test.ts` — 189 tests pass
   - `gsd-recover.test.ts` — 65 tests pass
   - `flag-file-db.test.ts` — 14 tests pass

3. **`roadmap-slices.ts` line reduction:** Confirm the file is either deleted or reduced to re-export only.

## Constraints

- **`_deriveStateImpl()` in `state.ts` MUST keep working** — it's the pre-migration fallback for projects without DB hierarchy data. It imports `parseRoadmap` and `parsePlan` at module level. These imports change from `./files.js` to `./parsers-legacy.js`.
- **`detectStaleRenders()` in `markdown-renderer.ts` intentionally compares disk-parsed vs DB state** — this is by design (S05 decision). It must keep using parsers. Import changes from lazy `createRequire` of `files.ts` to lazy `createRequire` of `parsers-legacy.ts`.
- **`md-importer.ts` is the canonical migration path** — it must keep its `parseRoadmap`/`parsePlan` imports. Import source changes.
- **`commands-maintenance.ts` has a dynamic `await import("./files.js")` for `parseRoadmap`** — this is a cold-path branch-cleanup command. Either migrate to DB query or update import to `parsers-legacy.ts`.
- **`workspace-index.ts` `titleFromRoadmapHeader` uses parser-only path** (line 80) — no DB equivalent was added in S05. Either add a DB path or accept this feature degrades when DB is unavailable.
- **Test files that import parsers** (`parsers.test.ts`, `roadmap-slices.test.ts`, `planning-crossval.test.ts`, `markdown-renderer.test.ts`, `auto-recovery.test.ts`, `complete-milestone.test.ts`, `migrate-writer.test.ts`, `migrate-writer-integration.test.ts`) — import paths must be updated.
- **`native-parser-bridge.ts`** is consumed by `_parseRoadmapImpl()` and `_parsePlanImpl()` in `files.ts` today. When those functions move to `parsers-legacy.ts`, the import follows. `native-parser-bridge.ts` itself stays unchanged — it's also used by `forensics.ts`, `paths.ts`, `session-forensics.ts`, `state.ts` for non-parser functions.

## Common Pitfalls

- **Missing a caller** — There are 16+ files with lazy fallbacks. Use the grep verification commands above to confirm zero stragglers. The `commands-maintenance.ts` dynamic import was NOT migrated in S05 and must be handled here.
- **Breaking `_deriveStateImpl()`** — If `parseRoadmap`/`parsePlan` are deleted from `files.ts` without updating `state.ts` imports, the pre-migration fallback path breaks silently (only triggered when DB is empty).
- **Test import path drift** — Many test files import `parseRoadmap`/`parsePlan` from `../files.ts`. If these exports are removed from `files.ts`, every test that imports them breaks. Update test imports to `../parsers-legacy.ts`.
- **`cachedParse()` and `clearParseCache()`** — These are in `files.ts` and used by the parser functions. They need to move with the parsers or be importable from `files.ts` by `parsers-legacy.ts`. `clearParseCache()` is also imported by `cache.ts` and `db-writer.ts` — keep it exported from `files.ts` and have `parsers-legacy.ts` import it.
- **`extractSection()`, `parseBullets()`, `extractBoldField()`** — Utility functions in `files.ts` used by both the parser functions AND other non-parser code (`parseSummary`, `parseContinue`, `parseSecretsManifest`, etc.). These MUST stay in `files.ts`. `parsers-legacy.ts` imports them.
- **`splitFrontmatter`/`parseFrontmatterMap`** — Re-exported from `files.ts`, also used by parser functions. `parsers-legacy.ts` can import from `../shared/frontmatter.js` directly.
