---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T04: Write cross-validation tests proving DB↔rendered↔parsed parity

**Slice:** S04 — Hot-path caller migration + cross-validation tests
**Milestone:** M001

## Description

Create `planning-crossval.test.ts` following the `derive-state-crossval.test.ts` pattern. These tests prove R014: DB state matches rendered-then-parsed state during the transition window. Each test seeds planning data into DB via insert functions, renders markdown via renderers, parses back via existing parsers, and asserts field-by-field parity. This is the slice's highest-value proof artifact.

## Steps

1. Create `src/resources/extensions/gsd/tests/planning-crossval.test.ts`. Import from `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`. Import DB functions: `openDatabase`, `closeDatabase`, `insertMilestone`, `insertSlice`, `insertTask`, `getMilestoneSlices`, `getSliceTasks`, `getTask` from `../gsd-db.ts`. Import renderers: `renderRoadmapFromDb`, `renderPlanFromDb`, `renderTaskPlanFromDb` from `../markdown-renderer.ts`. Import parsers: `parseRoadmapSlices` from `../roadmap-slices.ts`, `parsePlan` from `../files.ts`. Each test creates a temp dir, opens a DB, seeds data, renders, parses, asserts, then cleans up.

2. **Test 1: ROADMAP round-trip parity.** Insert a milestone with 4 slices having varied status (2 complete, 2 pending), depends arrays, risk levels, and demo strings. Call `renderRoadmapFromDb()` to generate ROADMAP.md. Read the rendered file, call `parseRoadmapSlices()`. Assert for each slice: `parsedSlice.id === dbSlice.id`, `parsedSlice.done === (dbSlice.status === 'complete')`, `parsedSlice.depends` deep-equals `dbSlice.depends`, `parsedSlice.risk === dbSlice.risk`, `parsedSlice.title === dbSlice.title`. Assert slice count matches.

3. **Test 2: PLAN round-trip parity.** Insert a milestone, one slice, and 3 tasks with planning fields populated (description, files as JSON arrays, verify commands, estimate). Call `renderPlanFromDb()` to generate S##-PLAN.md. Read the rendered file, call `parsePlan()`. Assert: `parsedPlan.tasks.length === 3`, each task's `id`, `title`, `verify` field matches the DB row. Assert `parsedPlan.filesLikelyTouched` contains all files from all task rows (aggregate). Assert task order matches sequence ordering from DB.

4. **Test 3: Sequence ordering parity.** Insert a milestone with 4 slices having sequence values `[3, 1, 4, 2]` (non-sequential insertion order). Call `renderRoadmapFromDb()`. Parse back via `parseRoadmapSlices()`. Assert the parsed slice order matches sequence order `[1, 2, 3, 4]`, not insertion order. This proves R016 — sequence ordering propagates through render and is preserved by the parser.

## Must-Haves

- [ ] Test 1 passes: ROADMAP DB→render→parse round-trip proves field parity (id, done/status, depends, risk, title)
- [ ] Test 2 passes: PLAN DB→render→parse round-trip proves task field parity (id, title, verify, files)
- [ ] Test 3 passes: Sequence ordering preserved through DB→render→parse round-trip
- [ ] All tests use temp directories and clean up after themselves
- [ ] Tests run under the resolver harness

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/planning-crossval.test.ts`

## Inputs

- `src/resources/extensions/gsd/gsd-db.ts` — `openDatabase`, `closeDatabase`, insert functions, query functions (with sequence ordering from T01)
- `src/resources/extensions/gsd/markdown-renderer.ts` — `renderRoadmapFromDb`, `renderPlanFromDb`, `renderTaskPlanFromDb`
- `src/resources/extensions/gsd/roadmap-slices.ts` — `parseRoadmapSlices`
- `src/resources/extensions/gsd/files.ts` — `parsePlan`
- `src/resources/extensions/gsd/tests/derive-state-crossval.test.ts` — pattern reference for test structure

## Expected Output

- `src/resources/extensions/gsd/tests/planning-crossval.test.ts` — new cross-validation test file with 3 scenarios

## Observability Impact

- **Signals changed:** No runtime signals changed — this is a test-only task.
- **Inspection:** Test output reports pass/fail per field-parity assertion across 3 scenarios (ROADMAP round-trip, PLAN round-trip, sequence ordering). Future agents can run the test to verify DB↔rendered↔parsed parity holds after any renderer or parser change.
- **Failure visibility:** Test failures print `FAIL: <scenario>: <field>` with expected vs actual values, enabling precise field-level diagnosis of parity regressions.
