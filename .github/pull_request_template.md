## Summary

- What changed and why?
- Which acceptance criterion does this satisfy?

## Verification

- [ ] Backend verification passes (`./mvnw clean verify`)
- [ ] Frontend unit tests pass (`npm --prefix frontend test`)
- [ ] Frontend production build passes (`npm --prefix frontend run build`)
- [ ] Browser test passes when UI behavior changes (`npm --prefix frontend run e2e`)
- [ ] Claude harness contracts and validators pass
- [ ] Symphony syntax checks and tests pass

## Safety and data

- [ ] Customer access remains owner-scoped; admin-only behavior stays under `/api/admin`
- [ ] Workflow state changes continue to use `Claim` domain methods
- [ ] Currency changes use `BigDecimal` with explicit scale and rounding
- [ ] Persisted schema changes include a new Flyway migration
- [ ] Tests, fixtures, screenshots, and examples contain only synthetic data
- [ ] No generated output, credentials, local environment files, or secrets are committed

## Evidence

Include relevant test output, API examples, or UI screenshots. Link the passing CI run before merge.
