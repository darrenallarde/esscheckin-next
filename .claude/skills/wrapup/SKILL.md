---
name: wrapup
description: End-of-session cleanup
user-invocable: true
---

# /wrapup — End-of-session cleanup

Run this at the end of a work session to leave everything tidy.

1. **Clean working tree:** Run `git status`. If there are uncommitted changes, list them and ask whether to commit, stash, or discard.
2. **Unpushed commits:** Run `git log origin/HEAD..HEAD --oneline`. If there are unpushed commits, ask whether to push now.
3. **Merged branches:** Run `git branch --merged main` to find local branches already merged into main.
   - **Check worktrees first:** Run `git worktree list`. Do NOT offer to delete any branch that has an active worktree — it belongs to another session.
   - Only offer to delete branches that are merged AND have no active worktree.
4. **Stale remote branches:** Run `git remote prune origin --dry-run`. If there are stale refs, prune them.
5. **Update recollection.md:** Write the current session state to `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/recollection.md`:
   - Where you are (directory, branch)
   - What was shipped (commits, features, fixes)
   - What's next / pending
   - Active worktrees and which ones belong to other sessions
   - Files modified but not yet committed
   - Key files you read and understand
6. **Update MEMORY.md:** Update `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/MEMORY.md` with:
   - What was shipped (commits, features, fixes)
   - Any known issues or TODOs for next session
   - Lessons learned (if any)
7. **Final status:** Show current branch, latest commit, and confirm everything is clean.
