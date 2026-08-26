# Document Verification Specification

## Scope

Document uploads are stubbed as metadata. ClaimFlow still records an explicit checklist and an append-only verification outcome for each item.

## Acceptance Criteria

### AC-03

**Given** the claim type, **when** the checklist is created, **then** the minimum required items are:

- Motor: police FIR and repair invoice.
- Health: hospital bill and discharge summary.
- Life: death certificate.

**Given** a submitted item in an assessor queue, **when** an assessor verifies it, **then** a `VERIFIED` or `REJECTED` outcome with reason, actor, and timestamp is appended without destroying earlier evidence.

## Authorization

Customers can view their checklist. Assessors can verify items. Administrators can audit outcomes but do not impersonate customers.
