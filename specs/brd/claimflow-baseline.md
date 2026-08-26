# ClaimFlow business requirements baseline

## Problem

Insurance claim handling becomes slow and difficult to audit when intake, eligibility checks, document review, risk scoring, payable assessment, decisions, and settlement evidence are kept in disconnected steps. ClaimFlow demonstrates one deterministic workflow that keeps those decisions visible to policyholders and claims administrators.

## Users and outcomes

| User | Need | Measurable baseline outcome |
|---|---|---|
| Policyholder | Submit a claim and understand its state | A valid request receives a stable claim number and complete decision/audit response in one API transaction |
| Claims administrator | Find claims requiring attention | Dashboard and queue expose manual-review and settlement counts under admin-only routes |
| QA/reviewer | Prove why a result occurred | Every criterion has a stable ID and a mapped automated check |
| Engineering | Change rules without corrupting money or history | Java 21, `BigDecimal`, domain state transitions, Flyway, immutable settlement, and append-only audit gates remain enforced |

## Scope

- Synthetic MOTOR, HEALTH, and LIFE policies.
- First notice of loss, policy ownership/coverage/type validation, required-document metadata, fraud scoring, payable assessment, decision, settlement stub, reopening, and audit history.
- Customer and administrator browser surfaces.
- Local/native execution as the primary development workflow; containers are optional packaging validation.

## Out of scope

- Real customer identity, production authentication/authorization, binary document storage, external fraud models, insurer policy systems, payment rails, notifications, regulatory filing, production observability backends, and real personal or health information.

## Constraints

- Examples, fixtures, screenshots, and migrations contain synthetic data only.
- Money is fixed-point and explicitly rounded.
- A customer cannot read or mutate another customer's resources.
- Admin operations stay under `/api/admin`.
- Audit events are append-only and settlements are immutable.
- Persisted schema changes require a new Flyway migration.

## Success measures

- All acceptance criteria in `specs/stories/stories.json` have one verification-matrix row.
- Backend line coverage is at least 80% and branch coverage is at least 60%.
- Backend unit/integration, migration, architecture, frontend unit/build, browser acceptance, harness contract, and Symphony tests are repeatable through documented commands and CI.
- No generated build output or secrets are tracked in Git.
