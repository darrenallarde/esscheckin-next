---
name: worktree-done
description: Clean up finished worktree
user-invocable: true
---

# /worktree-done — Clean up finished worktree

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Clean up YOUR completed worktree. This skill only operates on the branch you are currently on.

## Rules

- **NEVER delete a worktree you are not currently in.**
- **NEVER delete a branch that has an active worktree** (check `git worktree list`).
- **If on `main`, REFUSE.** Tell the user: "Switch to the worktree you want to clean up first. I will not delete worktrees from main."
- The user may have multiple terminals with active worktrees. Assume ANY worktree you're not in belongs to another session.

## Steps

1. **List worktrees:** Run `git worktree list` to show ALL active worktrees.
2. **Check current branch:** Run `git branch --show-current`. If on `main`, STOP and refuse (see rules above).
3. **Identify current worktree:** The worktree to clean up is the one matching your current branch. No argument needed.
4. **Show other worktrees with warning:**
   ```
   Other active worktrees (NOT touching these — they may belong to other sessions):
     - fix/hilo-bugbash → /path/to/worktree
   ```
5. **Check status:** Verify the current worktree has no uncommitted changes. If it does, warn and ask how to proceed.
6. **Ask about merge:** Ask if this branch should be merged into main first.
7. **Merge (if approved):** Switch to main, pull, merge with `--no-ff`, push.
8. **Confirm removal:** Explicitly ask: "Delete worktree at [path] and branch [name]? This cannot be undone."
9. **Remove worktree:** `git worktree remove [path]`
10. **Delete branch:** `git branch -d [branch]` — use lowercase `-d` (safe delete), never `-D` (force).
11. **Update recollection.md:** Remove the cleaned-up worktree from the active worktrees section.
