# Fraud Screening Specification

## Scope

Fraud screening is deterministic and rule-based. It does not perform machine learning or call an external bureau.

## Acceptance Criteria

### AC-04

**Given** identical claim facts and the same active policy version, **when** screening runs repeatedly, **then** the score and matched reason codes are identical.

**Given** the score meets the policy version's configured review or rejection threshold, **when** the result is recorded, **then** the claim is flagged and the score, policy version, threshold, and rule codes are appended as evidence.

## Required Branches

Tests cover high claim-to-limit ratio, short narrative, reopened claim, missing documents, exact threshold boundaries, and the 100-point cap.
