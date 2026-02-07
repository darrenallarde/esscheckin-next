---
name: wrapup
description: End-of-session cleanup
user-invocable: true
---

# /wrapup — End-of-session cleanup

Run this at the end of a work session to leave everything tidy.

1. **Clean working tree:** Run `git status`. If there are uncommitted changes, list them and ask whether to commit, stash, or discard.
2. **Unpushed commits:** Run `git log origin/main..HEAD --oneline`. If there are unpushed commits, ask whether to push now.
3. **Merged branches:** Run `git branch --merged main` to find local branches already merged into main. Offer to delete them (local + remote). Never delete `main` itself.
4. **Stale remote branches:** Run `git remote prune origin --dry-run`. If there are stale refs, prune them.
5. **Session summary:** Write a brief summary of what was accomplished this session. Update the memory file at `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/MEMORY.md` with:
   - What was shipped (commits, features, fixes)
   - Any known issues or TODOs for next session
   - Lessons learned (if any)
6. **Final status:** Show current branch, latest commit, and confirm everything is clean.
