# ClaimFlow application-service guidance

This file supplements the root and backend guidance for use-case orchestration.

- Application services coordinate repositories and domain behavior; they do not reimplement rules already owned by `Claim` or a named policy class.
- Every write use case has an explicit `@Transactional` boundary. Read-only queries use `@Transactional(readOnly = true)`.
- Resolve the authenticated owner or privileged role before returning or changing a claim. Never rely on UI filtering for authorization.
- Keep document verification, fraud screening, assessment, decision, override, reopening, and settlement evidence append-only.
- Evaluate the versioned policy attached to the claim; do not silently apply current rules to historical claims.
- Create payout references through the synthetic/stubbed adapter boundary only. Do not add a real payment or document-provider call without a new specification and security review.
- Return API DTOs or projections rather than exposing mutable entities.

For a changed use case, prove authorization, transaction-safe state change, evidence creation, and failure behavior with the narrowest useful test.
