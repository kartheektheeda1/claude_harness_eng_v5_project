# Knowledge Deposits

| Observation | Durable control |
|---|---|
| Global Maven availability varies by workstation. | Use the checked-in Maven Wrapper in scripts, CI, and documentation. |
| A passing test count does not prove official acceptance coverage. | Require exact `AC-NN` identifiers and a verification matrix. |
| A generic harness folder is not proof that the Claude Harness plugin is installed. | Lock the foundation repository/commit in `harness-lock.json` and validate its agents, hooks, skills, commands, and evaluator wiring. |
| Currency logic can silently regress through floating-point types. | Payout skill, architecture test, and hook block `double`/`float` money calculations. |
| Reopening a claim by mutating it loses dispute lineage. | State-machine spec requires a linked sub-claim and append-only transition evidence. |
| Browser tests with only mocked APIs do not prove full-stack integration. | Maintain UI contract tests plus a real backend/browser smoke path in CI. |
