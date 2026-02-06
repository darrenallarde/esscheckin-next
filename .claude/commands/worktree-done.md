# /worktree-done — Clean up finished worktree

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Clean up a completed git worktree and optionally merge. Argument: `$ARGUMENTS` (branch name)

1. **List worktrees:** Run `git worktree list` to show all active worktrees.
2. **Identify target:** Match `$ARGUMENTS` to a worktree branch.
3. **Check status:** Verify the worktree has no uncommitted changes. If it does, warn and ask how to proceed.
4. **Ask about merge:** Ask if the branch should be merged into the current branch first.
5. **Merge (if approved):** `git merge <branch> --no-ff`
6. **Remove worktree:** `git worktree remove ../esscheckin-next-<branch>`
7. **Delete branch (if approved):** `git branch -d <branch>`

Always confirm before removing the worktree or deleting the branch.
