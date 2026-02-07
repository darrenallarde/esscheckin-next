---
name: hotfix
description: Emergency fix on main
user-invocable: true
---

# /hotfix — Emergency fix on main

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

For urgent production fixes that go directly to main:

1. **Confirm urgency:** Ask the user to describe the issue. Confirm this is truly urgent and can't wait for a feature branch.
2. **Switch to main:** Ensure we're on main and it's up to date (`git checkout main && git pull`).
3. **Minimal fix:** Make the smallest possible change to fix the issue. No refactoring, no cleanup, no "while we're here" changes.
4. **Typecheck:** Run `npm run typecheck` — must pass.
5. **Build:** Run `npm run build` — must succeed.
6. **Commit:** Create a commit with prefix `hotfix:` in the message.
7. **Push:** Push directly to main. Confirm before pushing.

Keep it minimal. You can clean up in a follow-up PR.
