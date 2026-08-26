# ClaimFlow Flyway guidance

This file supplements the root and backend guidance for database evolution.

- Migrations are forward-only and immutable after merge. Add the next sequential `Vn__description.sql`; never edit or reorder an applied migration.
- Use portable SQL supported by both the production MySQL profile and the H2 verification profile, or document and test any deliberate divergence.
- Encode critical integrity rules in the database where practical: positive scaled money, valid claim types/statuses, unique business identifiers, foreign keys, and append-only evidence protection.
- A migration must be safe on a clean database and on the immediately previous schema version.
- Seed data must be explicitly synthetic, deterministic, non-sensitive, and idempotent within the migration lifecycle.
- Never place credentials, real identities, customer documents, or production endpoints in a migration.

Every migration requires a verification test or startup path that proves ordering, constraints, and clean-schema compatibility.
