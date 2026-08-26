---
name: claimflow-tdd
description: Implement one approved ClaimFlow acceptance criterion with recorded red-green-refactor evidence and the verification-matrix layers. Use when application behavior must change.
argument-hint: "<acceptance-criterion-id>"
context: fork
agent: claimflow-implementer
---

# ClaimFlow TDD workflow

Implement `$ARGUMENTS` only after it exists in the validated spec.

1. Run `node .claude/scripts/validate-specs.js` and retrieve the AC plus verification trace.
2. Create the narrowest meaningful test, then start a receipt:
   `node .claude/scripts/tdd-cycle.js start --story <story-id> --ac <ac-id> --test <test-path>`
3. Run the new test through:
   `node .claude/scripts/tdd-cycle.js red --reason "expected behavior is absent" -- <test-command>`
   Confirm the failure demonstrates the missing behavior, not a syntax or environment failure.
4. Make the smallest production change. Hooks reject production edits without the recorded red phase.
5. Record green with `node .claude/scripts/tdd-cycle.js green -- <same-test-command>`.
6. Run `refactor`, improve structure without changing behavior, and repeat green.
7. Run all layers required by the AC's verification-matrix row and hand evidence to the evaluator.

Never weaken a test, bypass an owner/admin check, or edit an applied migration to get green.
