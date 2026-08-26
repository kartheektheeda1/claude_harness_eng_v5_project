# Settlement and Override Specification

## Scope

Settlement is a stubbed payment record. It is immutable, unique per approved claim lineage, and fully auditable.

## Acceptance Criteria

### AC-07

**Given** an approved claim with positive assessed amount, **when** settlement is created, **then** its payout equals the assessment and no update or delete operation can mutate the record.

### AC-09

**Given** an auto-approved or rejected decision, **when** an administrator supplies a valid override reason code and comment, **then** the override is appended with actor and timestamp while the prior decision remains available.

## Invariants

- A zero or negative payout cannot be settled.
- A retry cannot create a duplicate payout.
- Override comments and claim narratives are never logged.
