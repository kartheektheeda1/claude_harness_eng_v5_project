# TDD Receipt: Persistence and Operations Hardening

- Source: official PDF Sections 5.2, 6.2, 7.3, 7.4, and 8.1.
- Red command: `.\mvnw.cmd --batch-mode --no-transfer-progress verify`
- Observed red: `nfr08ClaimAggregateExposesNoPublicPropertySetters` incorrectly matched the valid `settled()` domain command.
- Correction: refine the structural predicate to JavaBean setters only; do not change production behavior to satisfy a faulty test.
- Focused green command: `.\mvnw.cmd --batch-mode --no-transfer-progress "-Dtest=PersistenceInvariantArchitectureTest,FlywayMigrationTest" test`
- Focused green result: 4 tests passed.
- Regression command: `.\mvnw.cmd --batch-mode --no-transfer-progress verify`
- Regression result: 45 tests passed with enforced line and branch coverage.
- Browser command: `npm --prefix frontend run e2e` under Node 22.
- Browser result: 9 tests passed.
