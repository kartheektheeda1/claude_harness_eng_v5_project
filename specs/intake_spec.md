# Claim Intake Specification

## Scope

Authenticated customers file FNOL records only against policies they own. The intake boundary performs request, ownership, claim-type, policy-version, and coverage-date validation before creating a claim.

## Acceptance Criteria

### AC-01

**Given** the customer owns an active matching policy and supplies valid FNOL fields and document metadata, **when** the claim endpoint accepts the request, **then** it returns HTTP 201 with one `FILED` claim and an append-only filing event.

### AC-02

**Given** the policy is inactive or outside its coverage period on the incident date, **when** FNOL validation runs, **then** `PolicyNotActiveException` prevents persistence and produces a stable error response.

## Security and Validation

- Customers cannot file against another customer's policy.
- Incident date cannot be in the future.
- Claimed amount is positive and has no more than two decimal places.
- Narratives are accepted by the API but never logged.
