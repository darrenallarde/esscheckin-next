---
name: ship
description: Pre-ship checklist
user-invocable: true
---

# /ship — Pre-ship checklist

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Run this checklist before pushing code:

1. **Typecheck:** Run `npm run typecheck` — fix any errors before proceeding
2. **Lint:** Run `npm run lint` — fix any errors
3. **Tests:** Run `npm run test:run` — all tests must pass
4. **Build:** Run `npm run build` — must succeed cleanly
5. **Review changes:** Run `git diff` to show all uncommitted changes. Summarize what changed and why.
6. **Commit:** Stage relevant files and create a commit with a clear message. Do NOT use `git add -A` — be specific about what files to stage.
7. **Branch check:** If on `main`, ask if this should go on a feature branch first. If on a feature branch, proceed.
8. **Push:** Push the current branch to origin. Confirm before pushing.

If any step fails, stop and fix before continuing. Do not skip steps.
