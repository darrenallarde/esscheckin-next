# /new-feature — Plan and build a new feature

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Use this when starting work on a new feature. Argument: `$ARGUMENTS` (feature description)

## Phase 1: Plan
1. **Understand the request:** Parse `$ARGUMENTS` for the feature description.
2. **Research:** Read relevant existing code, specs in `specs/`, and docs in `docs/`. Understand the current architecture.
3. **Write a plan:** Outline the approach — files to create/modify, database changes needed, components involved. Save to SCRATCHPAD.md if complex.
4. **Get approval:** Present the plan and wait for user confirmation before writing any code.

## Phase 2: Build
5. **Create branch:** `git checkout -b feature/<short-name>`
6. **Database first:** If the feature needs schema changes, use `/db-migrate` workflow.
7. **Implement:** Follow `/qa` workflow: write tests first, then implement. If unsure what to test, ask me.
8. **Typecheck + build:** Run `npm run typecheck` and `npm run build` — both must pass.
9. **Review:** Show a summary of all changes made.
10. **Commit:** Commit with a clear message describing the feature.

Do not push — user decides when to ship with `/ship` or `/deploy`.
