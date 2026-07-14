# ClaimFlow agent guidance

- Use Java 21 and keep currency operations in `BigDecimal` with explicit scale and rounding.
- Preserve append-only audit history and immutable settlement records.
- Route workflow state changes through domain methods on `Claim`.
- Keep customer resource access owner-scoped; admin-only operations belong under `/api/admin`.
- Use only synthetic data in tests, migrations, screenshots, and examples.
- Add a Flyway migration for every persisted schema change; never edit an applied migration.
