# ClaimFlow domain guidance

This file supplements the root and backend guidance for aggregates and domain records.

- `Claim` owns lifecycle transitions. A caller requests an action; the aggregate validates the current state and records the resulting state.
- Do not add public state setters. Construct valid objects and expose intention-revealing methods for transitions.
- Use `BigDecimal` for money, with explicit scale and `RoundingMode`. Never construct monetary values from `double`.
- Decision reason codes, verification outcomes, fraud results, transitions, audit events, and settlements are evidence. Existing evidence is never updated or deleted; corrections append new evidence.
- A settlement is created only from an eligible approved claim and remains immutable after persistence.
- Domain policy is deterministic. Time, identifiers, and external outcomes must arrive as inputs or injected seams.
- Domain types must not depend on API, service, repository, or configuration packages.

Every new transition or invariant requires a direct unit test for both the allowed path and at least one rejected path.
