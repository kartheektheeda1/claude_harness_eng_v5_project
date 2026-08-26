---
name: claimflow-auto
description: Orchestrate one ClaimFlow sprint group through validated specs, per-AC TDD, read-only review, and independent evaluation with stop-on-failure gates. Use for an approved end-to-end group.
argument-hint: "<sprint-group>"
context: fork
---

# ClaimFlow gated orchestration

Run `$ARGUMENTS` as a sequence of explicit, auditable stages.

1. Validate the harness and specs. Stop on any contract or trace error.
2. Ask `claimflow-planner` to confirm the group is implementation-ready; do not rewrite accepted policy opportunistically.
3. For each AC in contract order, invoke the `tdd` skill in isolation and require red-green evidence plus its mapped checks before moving on.
4. Ask `claimflow-reviewer` for a read-only diff review. Return blocking findings to the implementer and re-run affected checks.
5. Invoke the `evaluate` skill with a fresh evaluator context. Stop on `FAIL`; never self-certify.
6. Report the group, ACs completed, exact checks, evaluator report path, and unresolved risks.

Do not push, deploy, merge, or alter credentials. Those actions require explicit user authorization outside this skill.
