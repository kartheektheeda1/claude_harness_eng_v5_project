# ClaimFlow repository guidance

This file supplements the root and backend guidance for persistence ports.

- Repositories persist and query; they do not make workflow, authorization, fraud, decision, or payout decisions.
- Customer-facing query methods must include owner scope in the query contract. Unscoped lookups are permitted only behind an already-authorized administrative or internal use case.
- Prefer explicit, intention-revealing query names and deterministic ordering for lists exposed to users or tests.
- Do not add update/delete operations for append-only evidence or immutable settlements.
- Avoid native SQL when Spring Data or JPQL expresses the contract safely. Any unavoidable native query requires a focused persistence test.
- Schema changes belong in a new Flyway migration; repository code must remain compatible with the migration order used by clean installations.

Add a repository or integration test when a query controls owner visibility, workflow eligibility, ordering, or financial evidence.
