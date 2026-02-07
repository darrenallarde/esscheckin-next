---
name: worktree-start
description: Start parallel work session
user-invocable: true
---

# /worktree-start — Start parallel work session

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Create a git worktree for parallel development. Argument: `$ARGUMENTS` (branch name or description)

1. **Parse branch name:** Derive a branch name from `$ARGUMENTS` (e.g., `feature/my-thing` or `fix/bug-name`).
2. **Create worktree:** Run `git worktree add ../esscheckin-next-<branch> -b <branch>`.
3. **Install deps:** Run `npm install` in the new worktree.
4. **Report:** Show the path to the new worktree and instructions:
   - Open a new terminal and `cd` to the worktree path
   - Start a new Claude Code session there
   - Work independently — changes won't affect the main worktree
   - When done, use `/worktree-done` from the main worktree

Note: Both worktrees share the same `.git` — commits on either branch are visible to both.
