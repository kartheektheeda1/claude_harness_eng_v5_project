# Claim Assessment Specification

## Scope

Assessment calculates the maximum payable value under the active policy version using fixed-point arithmetic.

## Acceptance Criteria

### AC-05

**Given** a claim amount, sum insured, deductible, and co-pay percentage, **when** assessment runs, **then** it applies the insured cap, subtracts the deductible, applies co-pay, clamps the result at zero, and returns a two-decimal `BigDecimal`.

### AC-06

**Given** verified evidence, a fraud score, and an assessed amount, **when** decision policy runs, **then** it records `AUTO_APPROVE`, `MANUAL_REVIEW`, or `REJECT` with a stable reason code and active policy-version identifier.
