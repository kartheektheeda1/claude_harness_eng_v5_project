# ClaimFlow Claude Code guidance

ClaimFlow is a Java 21 / Spring Boot insurance-claim workflow with a React frontend. Work from a written story and acceptance criterion; do not infer business policy from UI labels or controller behavior.

## Instruction hierarchy

- This file governs the repository.
- `src/CLAUDE.md` adds backend rules.
- `src/main/java/com/claimflow/api/CLAUDE.md` adds HTTP-boundary rules.
- `src/main/java/com/claimflow/domain/CLAUDE.md` adds aggregate and invariant rules.
- `src/main/java/com/claimflow/service/CLAUDE.md` adds application-service rules.
- `src/main/java/com/claimflow/repository/CLAUDE.md` adds persistence-port rules.
- `src/main/resources/db/migration/CLAUDE.md` adds database-evolution rules.
- `src/test/CLAUDE.md` adds backend-test rules.
- `frontend/CLAUDE.md` adds frontend rules.
- `Claude_harness_v5/symphony_clone/CLAUDE.md` adds orchestrator rules.
- The closest file wins only when it is more specific; it may not relax security, audit, money, migration, or synthetic-data rules here.

## Non-negotiable domain rules

- Use Java 21. Represent currency with `BigDecimal`, explicit scale, and explicit rounding.
- Preserve append-only claim audit history and immutable settlement records.
- Route workflow transitions through domain methods on `Claim`; never mutate status directly from controllers or repositories.
- Scope customer resources to the authenticated owner. Put admin-only operations under `/api/admin` and enforce authorization server-side.
- Use only synthetic identities, claims, policies, and documents in tests, fixtures, migrations, screenshots, and examples.
- Add a new Flyway migration for every persisted schema change. Never edit an applied migration.

## Spec-to-proof workflow

1. Select an official `AC-NN` from `specs/app_spec.md` and its feature specification. The existing E-series stories are supporting decomposition, not replacements for the official IDs.
2. Confirm the AC row in `specs/test_artefacts/verification-matrix.json` and the active contract under `sprint-contracts/`.
3. Start a TDD receipt: `node .claude/scripts/tdd-cycle.js start --story AC-01 --ac AC-01 --test <test-file>`.
4. Record the expected failing test: `node .claude/scripts/tdd-cycle.js red --reason "missing acceptance behavior" -- <test-command>`.
5. Make the smallest production change, then record green: `node .claude/scripts/tdd-cycle.js green -- <test-command>`.
6. Refactor only while tests remain green. Run the affected verification-matrix layers.
7. Use a separate evaluator pass. The implementer must not silently mark its own work complete.

Useful gates:

```text
node .claude/scripts/validate-harness.js
node .claude/scripts/validate-specs.js
npm --prefix .claude test
./mvnw verify
npm --prefix frontend test
npm --prefix frontend run build
```

Use `/claimflow-plan`, `/claimflow-run`, `/claimflow-evaluate`, and `/claimflow-status` for the packaged workflow. If a command fails, preserve the evidence and report the failing layer; do not weaken or skip its gate.

## Capstone provenance and operating rules

- The foundation is locked to Claude Harness Engine V5 commit `40b4ae9ac47c398d28e5aeb5e7151ee56739de35` in `harness-lock.json`.
- Production code, tests, and migrations are generated through agents from written specs; hand edits are restricted to specifications and substrate.
- Specs win when implementation and specification disagree. Regenerate behavior from the corrected spec.
- Work is pull-request driven; do not directly commit to `main`.
- Use only synthetic data.
- The canonical acceptance criteria are `AC-01` through `AC-10`; canonical non-functional requirements are `NFR-01` through `NFR-08`.

## Completion contract

A task is complete only when its acceptance criteria are traceable, required tests/builds pass, security and domain invariants remain intact, and the evaluator report contains no blocking finding. Generated build output is not implementation evidence.
