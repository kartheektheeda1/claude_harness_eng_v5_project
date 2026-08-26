# ClaimFlow API guidance

This file supplements the root and backend guidance for the HTTP boundary.

- Controllers may validate transport input, read the authenticated principal, call one application service, and map the result. They must not contain claim policy, payout arithmetic, repository queries, or workflow transitions.
- Customer routes stay owner-scoped. Assessor routes stay under `/api/assessor`; administrator routes stay under `/api/admin`. Every privileged route requires server-side role enforcement.
- Use request/response records for transport contracts. Do not serialize persistence entities directly.
- Validate required fields and safe ranges at the boundary, but keep business eligibility rules in the domain/service layer.
- Map domain failures centrally to stable HTTP status codes and safe messages. Never expose stack traces, SQL details, credentials, document content, or internal exception text.
- Preserve the `X-Correlation-ID` contract for every response and keep request narratives and personal data out of logs.

For a changed endpoint, add or update a MockMvc/integration test that proves authentication, authorization, validation, and its mapped `AC-NN` behavior.
