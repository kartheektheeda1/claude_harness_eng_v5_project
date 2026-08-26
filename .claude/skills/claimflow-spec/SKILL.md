---
name: claimflow-spec
description: Create or refine ClaimFlow stories, Given/When/Then acceptance criteria, trace links, verification coverage, and sprint contracts before implementation. Use for planning a feature or resolving an ambiguous requirement.
argument-hint: "<feature or group>"
context: fork
agent: claimflow-planner
---

# ClaimFlow specification workflow

Plan `$ARGUMENTS` as an executable ClaimFlow contract.

1. Read `project-manifest.json`, `specs/features.json`, `specs/stories/stories.json`, `specs/stories/story-traces.json`, `specs/test_artefacts/verification-matrix.json`, and related `specs/sprint-contracts/*.json`.
2. Reuse stable IDs; never renumber an existing story or AC.
3. Give every story 3–6 atomic AC objects with `id`, `given`, `when`, and `then`.
4. Add explicit failure/authorization cases and ClaimFlow invariants where the feature touches them.
5. Map every AC to required layers and named test files. A planned test path must be clearly marked until implemented.
6. Validate with `node .claude/scripts/validate-specs.js`.

Do not write implementation code. Return the changed contract, open decisions, and first AC ready for TDD.
