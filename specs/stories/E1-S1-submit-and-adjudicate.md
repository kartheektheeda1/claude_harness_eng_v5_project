# E1-S1 — Submit and automatically adjudicate an eligible claim

As an authenticated policyholder, I want a claim checked against my active policy and processed through one ordered workflow so that I receive a transparent outcome without disconnected manual steps.

The normative criteria are `E1-S1-AC1` through `E1-S1-AC4` in `stories.json`. They cover the complete settlement path, missing-document manual review, request validation, and policy type/ownership/coverage rejection. Implementation is rooted in `ClaimController`, `ClaimService`, `Claim`, and `ClaimRules`; API evidence is in `ClaimWorkflowIntegrationTest`.

Scope excludes binary document upload and external policy systems. The demo stores only document-type metadata and synthetic policies.
