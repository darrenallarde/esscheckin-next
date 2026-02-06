# /status — Quick project status

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Show a quick status overview. This is read-only.

1. **Git branch:** Show current branch name
2. **Uncommitted changes:** Run `git status` — summarize staged/unstaged/untracked files
3. **Recent commits:** Show last 5 commits with `git log --oneline -5`
4. **Build status:** Check if `npm run build` was recently run (check `.next/` dir existence)
5. **Sentry errors:** If Sentry MCP is available, check for recent unresolved errors
6. **Dev server:** Check if port 3000 is in use (`lsof -i :3000` or similar)

Present as a clean summary table.
