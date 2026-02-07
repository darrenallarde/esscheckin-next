# /guide — Routing advisor

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Help the user figure out which commands to run and in what order. Argument: `$ARGUMENTS` (what they want to accomplish)

This command does NOT design solutions, explore architecture, or write code. It prescribes a path.

## Steps

1. **Read project context:** Read `CLAUDE.md` for current rules, architecture, and mistakes log. Read `MEMORY.md` for session history and known issues.
2. **Understand the request:** Parse `$ARGUMENTS`. If ambiguous, ask one clarifying question — no more.
3. **Assess scope:** Classify the task into one of three tiers:

### Tier 1: Quick Fix (no command needed)

A single-file change, typo, small bug, or config tweak. Just do it directly — no workflow overhead.

- Say: "This is a quick fix. No command needed — I'll just do it."
- Do the fix immediately.

### Tier 2: Standard Feature (one command)

A self-contained feature, bug fix with tests, or database change that fits in one session.

- Prescribe exactly ONE primary command (usually `/new-feature`, `/hotfix`, `/qa`, or `/db-migrate`).
- If the task needs a database change AND frontend work, say so and specify the order: `/db-migrate` first, then `/new-feature`.
- State what to pass as the argument.

### Tier 3: Large Initiative (phased plan)

Touches 3+ areas (database, backend, frontend, edge functions), spans multiple concerns, or has unclear requirements.

- Break into **ordered phases**. Each phase is one command invocation.
- Format each phase as:

  **Phase N: [What it accomplishes]**
  → Run: `/command-name argument to pass`
  ← Done when: [concrete completion criteria]

- Phases should be independently shippable when possible. Each phase should leave the app in a working state.
- Cap at 5 phases. If it needs more, the task is too big — split it into separate initiatives.

4. **Call out blockers:** Before prescribing the path, flag any decisions the user must make first:
   - Schema design choices (new table vs. new columns?)
   - UX decisions (modal vs. page? inline vs. toast?)
   - Scope cuts (MVP vs. full version?)
   - Dependencies (does another feature need to land first?)

   Be specific. Not "think about the UX" — instead "decide: should edit happen in a drawer (like /home) or a full page (like /people)?"

5. **State the next thing to type:** End with a single line the user can copy-paste. Literally the `/command` invocation they should run next, with the argument filled in.

## Rules

- Be opinionated. One path, not options. If two approaches work, pick the better one and say why in one sentence.
- Never prescribe `/plan` AND `/new-feature` for the same work — `/new-feature` already plans first. Use `/plan` only when the task is so complex that planning alone is a full session.
- Never prescribe `/ship` in the middle — it's always the last step after all phases complete.
- If the user describes a bug, check if it matches anything in the CLAUDE.md mistakes log or MEMORY.md known issues before prescribing.
- If the task requires manual steps (env vars, Supabase dashboard changes, third-party config), call those out explicitly — commands can't do them.
