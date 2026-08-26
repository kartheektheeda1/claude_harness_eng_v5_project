# Reopen and State-Machine Specification

## Scope

A dispute preserves the original claim and creates a new linked sub-claim for reconsideration.

## Acceptance Criteria

### AC-08

**Given** an owner has a settled or rejected claim, **when** the owner submits a non-empty dispute reason, **then** the original moves to `REOPENED`, a new `FILED` sub-claim references it, and both claims and their evidence remain queryable.

### AC-10

**Given** a requested transition, **when** it is not allowed by the state machine, **then** `InvalidClaimStateException` is raised and the transaction rolls back.

## Allowed Lifecycle

`FILED -> UNDER_REVIEW -> APPROVED | MANUAL_REVIEW | REJECTED`

`MANUAL_REVIEW -> APPROVED | REJECTED`

`APPROVED -> SETTLED`

`SETTLED | REJECTED -> REOPENED` while creating a new linked `FILED` sub-claim.
