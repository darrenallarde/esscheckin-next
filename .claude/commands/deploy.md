# /deploy — Merge feature branch to main

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Merge a feature branch to main for deployment:

1. **Branch check:** Confirm we are NOT on `main`. If on main, refuse and explain that `/deploy` is for merging feature branches.
2. **Status check:** Ensure working tree is clean (`git status`). If dirty, ask to commit or stash first.
3. **Show changes:** Run `git log main..HEAD --oneline` to show what commits will be merged. Summarize the changes.
4. **E2E tests:** If `e2e/` has `.spec.ts` files, run `npm run test:e2e`. If failures, STOP.
5. **Switch and merge:** After approval:
   - `git checkout main`
   - `git pull origin main`
   - `git merge <feature-branch> --no-ff`
6. **Push:** Push main to origin (triggers Vercel deploy). Confirm before pushing.
7. **Cleanup:** Ask if the feature branch should be deleted.

Vercel auto-deploys from main. After push, the deploy will be live within ~2 minutes.
