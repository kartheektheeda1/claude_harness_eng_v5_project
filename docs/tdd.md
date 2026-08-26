# Test-Driven Development Discipline

## Required Cycle

1. Select one official `AC-NN` from `specs/app_spec.md` and its feature spec.
2. Add the smallest public-behavior test bearing that exact identifier.
3. Run it and preserve the meaningful failing result in the sprint evidence.
4. Generate the minimum implementation needed to pass.
5. Run the targeted test and its mapped regression layer.
6. Refactor only while all affected checks remain green.
7. Run an independent evaluator before opening the pull request.

The implementation agent cannot approve its own work. Tests are not weakened, skipped, or deleted to achieve green. External boundaries use deterministic synthetic doubles; business modules are tested through their public interfaces.

## Worked Pattern: Fixed-Point Payout

- **Red:** AC-05 test describes a claim capped at sum insured, deductible subtraction, co-pay, zero clamp, scale 2, and explicit rounding.
- **Green:** The payout policy uses only `BigDecimal` operations and returns the expected value.
- **Refactor:** Boundary examples are parameterized without moving calculation into the test or changing the public result.
- **Gate:** Unit branches, API workflow, settlement equality, JaCoCo threshold, and architecture rules pass.

## Evidence

TDD receipts are stored in `.claude/state/tdd/` and referenced by sprint contracts. Historical evidence is never backfilled or fabricated; only observed red and green executions are recorded.
