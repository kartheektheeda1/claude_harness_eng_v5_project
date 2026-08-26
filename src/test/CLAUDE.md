# ClaimFlow backend test guidance

This file supplements the root and backend guidance for `src/test/**`.

- Use only synthetic people, addresses, policies, claim documents, tokens, and account identifiers.
- Include the stable acceptance-criterion ID in the test name or `@DisplayName` when the test proves an AC.
- A behavior change starts with a meaningful red test. Record it with `.claude/scripts/tdd-cycle.js`; a compilation typo is not acceptable red evidence.
- Test domain transitions directly, service authorization boundaries, controller contracts, and persistence behavior at the narrowest useful layer.
- Assert exact money scale/rounding, forbidden cross-owner access, admin restrictions, append-only audit behavior, and settlement immutability where relevant.
- Avoid time, network, random-order, and shared-database dependence. Inject clocks and deterministic identifiers.
- Do not change production behavior merely to make a weak assertion pass. Fix the test if it does not express the acceptance criterion.
