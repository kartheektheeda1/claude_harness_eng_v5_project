# ClaimFlow backend guidance

This file supplements the repository `CLAUDE.md` for `src/**`.

- Keep controllers thin: authenticate/authorize, validate transport input, call an application/domain service, and map the response.
- Put claim transitions on `Claim` domain methods and test both the allowed transition and the rejected transition.
- Never bypass owner scoping in customer queries. Administrative query paths require explicit admin authorization and `/api/admin` routing.
- Use `BigDecimal` for all money, with an explicit scale and `RoundingMode` at domain boundaries. Do not construct money from `double`.
- Audit records are append-only; settlements are immutable after creation. Corrections must be represented as new domain events/records.
- Persisted schema changes require a new, forward-only Flyway migration. Never modify a migration that may have been applied.
- Prefer constructor injection, transactional service boundaries, and deterministic clock/ID seams in tests.
- Keep exception-to-HTTP mapping centralized and avoid leaking internal messages or stack traces.

Before declaring backend work complete, run the targeted test first and then `./mvnw verify` (Windows: `.\\mvnw.cmd verify`).
