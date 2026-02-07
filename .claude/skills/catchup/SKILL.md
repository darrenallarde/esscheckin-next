---
name: catchup
description: Session orientation
user-invocable: true
---

# /catchup — Session orientation

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Start-of-session catchup to understand current project state. This is read-only.

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
