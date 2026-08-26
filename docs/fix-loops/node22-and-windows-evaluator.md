# Evaluator Portability Fix Loop

## Observed failure

The unified gate was run under the required Node.js 22 runtime. The first run stopped in the Claude harness contract phase because `.claude/package.json` used the Node 24-only `--test-isolation=none` option. After correcting that command, the independent evaluator exposed a second Windows-specific failure: `.cmd` wrappers were spawned without the system shell, and the Maven Wrapper absolute path was split at the workspace spaces.

A later backend rerun also exposed a Windows file-mapping race while JaCoCo rewrote many HTML files under the already tracked `target/` tree.

## Reproduction

```powershell
nvm use 22
npm run check
node .claude\scripts\evaluate-contract.js --all
```

The failures were environment/runner failures rather than acceptance-test failures. They were kept visible until independently reproduced.

## Corrections

- Replaced the Node 24-only harness option with the portable `node --test` command.
- Routed Windows `.cmd`/`.bat` wrappers directly through `ComSpec` without a nested shell, preserving paths with spaces while preventing child-process pipe handles from stalling the evaluator.
- Invoked `mvnw.cmd` from the project working directory so a workspace path containing spaces is safe.
- Limited JaCoCo output to XML and CSV while retaining enforced line and branch thresholds; the stable coverage summary is committed under `docs/coverage/`.

## Independent verification

- ClaimFlow harness contracts: 10/10 passed on Node 22.
- Backend JUnit/MockMvc/ArchUnit/Flyway: 41/41 passed.
- Full independent evaluator: 10/10 checks passed, including browser acceptance and the Playwright MCP accessibility trace.

The generated evaluator report is `specs/reviews/evaluator-report.json`; it contains executed commands, exit codes, and captured output instead of a manually asserted result.
