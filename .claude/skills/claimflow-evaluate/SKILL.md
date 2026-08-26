---
name: claimflow-evaluate
description: Independently verify a ClaimFlow sprint group against specs, traces, TDD receipts, required test layers, and domain/security rules. Use after implementation, never as the implementation agent.
argument-hint: "<sprint-group>"
context: fork
agent: claimflow-evaluator
---

# ClaimFlow independent evaluation

Evaluate `$ARGUMENTS` without changing implementation or tests.

1. Run `node .claude/scripts/validate-harness.js` and `node .claude/scripts/validate-specs.js`.
2. Read the selected contract in `specs/sprint-contracts/`, its stories, traces, verification rows, current diff, and `.claude/state/tdd-evidence.jsonl`.
3. Run `node .claude/scripts/evaluate-contract.js --group <group> --write`; add `--e2e` when the contract requires it.
4. Inspect failures and high-risk invariants directly. Treat skipped or missing required evidence as failure.
5. Ensure the generated evaluator report has per-AC evidence, reproducible commands, blocking findings, and an unambiguous `PASS` or `FAIL`.

Do not fix findings in this pass. Return failures to the planner/implementer with exact evidence.
