---
name: worktree-start
description: Start parallel work session
user-invocable: true
---

# /worktree-start — Start parallel work session

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Create a git worktree for parallel development. Argument: `$ARGUMENTS` (branch name or description)

## Steps

1. **Check existing worktrees:** Run `git worktree list`. Show the user what already exists.
2. **Parse branch name:** Derive a branch name from `$ARGUMENTS` (e.g., `feature/my-thing` or `fix/bug-name`).
3. **Create worktree:** Run `git worktree add ../esscheckin-next-<short-name> -b <branch>` from the latest main.
4. **Install deps:** Run `npm install` in the new worktree.
5. **Update recollection.md:** Add to the "Other Active Worktrees" section:
   ```
   - `<branch>` → `<path>` — this session, created <date>, purpose: <description>
   ```
6. **Report:** Show the path to the new worktree and instructions:
   - Open a new terminal and `cd` to the worktree path
   - Start a new Claude Code session there
   - Work independently — changes won't affect the main worktree
   - When done, use `/worktree-done` from WITHIN that worktree (not from main)

Note: Both worktrees share the same `.git` — commits on either branch are visible to both.
