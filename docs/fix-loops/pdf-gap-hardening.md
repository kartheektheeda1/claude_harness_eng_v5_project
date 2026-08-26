# PDF Gap Hardening Fix Loop

## Detected gaps

The official brief audit identified four repository-verifiable gaps: no seeded claims, no committed machine-readable coverage artefact, no dedicated persistence-invariant architecture checks, and no separate product, fraud, and payout operations views.

## Reproduction and red result

The new persistence architecture test was run before its predicate was corrected. It failed because the naive `startsWith("set")` setter rule incorrectly classified the valid domain command `settled()` as a property setter. The failure remained visible and the production aggregate was not weakened to satisfy the test.

## Correction

- Restricted the structural setter rule to the JavaBean shape `set[A-Z].*`.
- Added forward-only migration V5 with three synthetic product claims and exact checklist metadata.
- Added explicit append-only lifecycle and financial-schema architecture checks.
- Added administrator product/status filters, fraud alerts, payout audit evidence, and dashboard totals.
- Made Node 22 a deterministic verification prerequisite so Node 24 fails fast instead of stalling Playwright.
- Committed stable JaCoCo XML, CSV, and summary evidence.

## Green evidence

- Targeted migration and persistence architecture tests: 4/4 passed.
- Complete backend gate: 45/45 passed.
- Frontend unit tests: 2/2 passed.
- Browser acceptance and snapshot tests: 9/9 passed on Node 22.

The pull-request reference remains intentionally pending until the feature branch is published and reviewed; this document does not invent repository history.
