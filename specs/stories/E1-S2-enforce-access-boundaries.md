# E1-S2 — Enforce access boundaries

As a customer or claims administrator, I want every claim resource authorized at the server boundary so that customer data stays owner-scoped and privileged operations remain administrative.

The normative criteria are `E1-S2-AC1` through `E1-S2-AC4` in `stories.json`. Authentication is HTTP Basic for local synthetic demonstration only. Customer resources live under `/api/claims`; cross-customer operations live under `/api/admin` and require `ROLE_ADMIN`.

Production identity federation, password lifecycle, and external authorization policy are explicitly out of scope.
