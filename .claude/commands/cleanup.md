# /cleanup — Remove dead code and fix types

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Clean up the codebase:

1. **Find console.logs:** Search for `console.log`, `console.warn`, `console.error` in `src/`. List them and ask which to remove (some may be intentional).
2. **Find `any` types:** Search for `: any` and `as any` in TypeScript files. Suggest proper types.
3. **Find unused imports:** Run `npm run typecheck` and check for unused import warnings.
4. **Find dead code:** Look for exported functions/components that are never imported anywhere.
5. **Present findings:** Show a list of proposed changes grouped by category. Wait for approval before making changes.
6. **Apply approved changes:** Make the changes, then run `npm run typecheck` and `npm run build` to verify nothing broke.

Do not make changes without approval. Present findings first.
