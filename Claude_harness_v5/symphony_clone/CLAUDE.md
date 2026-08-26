# Symphony clone guidance

This directory is the local issue-orchestration component. It may coordinate ClaimFlow work, but it may not replace the repository spec, TDD, authorization, audit, or evaluator gates.

- Preserve deterministic issue state transitions and idempotent retries.
- Treat workspace paths, issue text, and process output as untrusted input.
- Never interpolate issue content into a shell command. Use argument arrays and validate every resolved path remains inside its assigned workspace.
- Keep orchestration state separate from application state and make restart/recovery behavior testable.
- Do not include real credentials or customer data in fixtures, logs, prompts, or container examples.
- When changing the orchestrator, run `npm test` and `npm run build` from this directory, plus any affected integration test.
- An orchestrated issue is not complete until the independent ClaimFlow evaluator passes its sprint contract.
