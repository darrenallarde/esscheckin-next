---
name: catchup
description: Session orientation
user-invocable: true
---

# /catchup — Session orientation

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Start-of-session orientation. This is read-only — no edits, no commits.

## Step 0: Environment Safety Check (MANDATORY)

1. **Read recollection.md:** Read `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/recollection.md` — this tells you where you were last, what branch you were on, and what you were doing.
2. **Check worktrees:** Run `git worktree list` and `git branch --show-current`.
3. **If worktrees exist AND you're on `main`:** STOP. Tell the user: "I see active worktrees but I'm on main. Context compaction may have reset my location. Which worktree should I be in?" List the worktrees. Do NOT proceed until the user confirms.
4. **If on a feature branch:** Confirm with the user: "I'm on `[branch]` — is that correct?"
5. **If recollection.md says a worktree belongs to another session:** Call it out explicitly: "recollection.md says `fix/hilo-bugbash` belongs to another session — I will not touch it."

Only proceed to the remaining steps after location is confirmed.

## Steps 1-6: Orientation

1. **Read CLAUDE.md:** Refresh on project rules, mistakes log, and standards.
2. **Read MEMORY.md:** Check `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/MEMORY.md` for session history and known issues.
3. **Git status:** Current branch, uncommitted changes, last 10 commits.
4. **Check for open issues:** If Sentry MCP is available, check for unresolved errors.
5. **Review TODO items:** Check MEMORY.md for outstanding TODO items.
6. **Summarize:** Present a concise briefing:
   - What was done last session
   - What's pending/broken
   - Suggested next steps

This helps you (Claude) orient quickly at the start of each session.
