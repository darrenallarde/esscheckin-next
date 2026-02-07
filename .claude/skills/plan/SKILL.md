---
name: plan
description: Think before building
user-invocable: true
---

# /plan — Think before building

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Think through an approach before writing code. Argument: `$ARGUMENTS` (what to plan)

1. **Parse the goal:** Understand what `$ARGUMENTS` is asking for.
2. **Research:** Read relevant code, specs, and docs. Don't assume — look at the actual implementation.
3. **Identify constraints:** What existing patterns must be followed? What could break?
4. **Draft approach:** Write a clear plan covering:
   - Files to create/modify
   - Database changes (if any)
   - Key implementation decisions
   - Risks and edge cases
   - Testing approach
5. **Save plan:** Write the plan to `SCRATCHPAD.md` in the project root for reference.
6. **Present:** Show the plan and ask for feedback.

This is planning only — no code changes. Use `/new-feature` to implement after planning.
