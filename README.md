# ClaimFlow

ClaimFlow is a full-stack insurance claim workflow for motor, health, and life products. It implements the official capstone acceptance criteria for FNOL filing, policy validation, document review, deterministic fraud screening, fixed-point assessment, reason-coded decisions, immutable settlement, dispute sub-claims, administrative override, and an enforced claim state machine.

All bundled identities, policies, claims, documents, screenshots, and test data are synthetic.

## What is implemented

- Customer-owned FNOL filing against an active policy version
- Exact motor, health, and life document checklists
- Separate assessor queue with append-only document outcomes
- Deterministic, versioned fraud evidence and threshold decisions
- `BigDecimal` payout calculation with explicit two-decimal `HALF_UP` rounding
- Reason-coded `AUTO_APPROVE`, `MANUAL_REVIEW`, and `REJECT` evidence
- Explicit, idempotent, positive, and immutable settlement creation
- Reopen-as-linked-sub-claim without overwriting the original claim
- Audited administrator overrides that preserve the previous decision
- Administrator product/status filters, fraud-alert queue, and payout audit trail
- Customer, assessor, and administrator authorization boundaries
- Correlation IDs, structured console logging, Flyway migrations, health endpoint, and architecture rules
- Claude Harness V5 foundation locked to its July 10, 2026 commit, with project agents, skills, commands, hooks, MCP servers, Agent SDK runner, sprint contracts, and evaluator

## Architecture

```text
React/Vite portals: Customer | Assessor | Administrator
                         |
                 Spring Boot REST API
                         |
     Claim aggregate + versioned rule policies/services
                         |
  Append-only evidence repositories + current-state projection
                         |
                Flyway-managed database
```

See [docs/architecture.md](docs/architecture.md), [specs/app_spec.md](specs/app_spec.md), and [specs/test_artefacts/verification-matrix.json](specs/test_artefacts/verification-matrix.json) for the detailed design and traceability.

## Prerequisites

- Java JDK 21
- Node.js 22 and npm

The Maven Wrapper is included, so a separate Maven installation is not required.

Verify the tools:

```powershell
java -version
node --version
npm --version
```

## Native quick start

Install dependencies once from the project root:

```powershell
npm ci
npm --prefix frontend ci
```

Start the complete demonstration with one runtime command:

```powershell
npm run dev
```

This starts an in-memory H2 demonstration database, the Java API, and the Vite UI. Open:

- UI: http://127.0.0.1:5173
- Health: http://127.0.0.1:8080/actuator/health

Press `Ctrl+C` to stop both processes. Docker is not required for local testing or the native demonstration.

## Synthetic demonstration accounts

| Workspace | Username | Password |
|---|---|---|
| Customer | `customer` | `customer123` |
| Assessor | `assessor` | `assessor123` |
| Administrator | `admin` | `admin123` |

| Policy | Product |
|---|---|
| `MTR-2026-001` | Motor |
| `HLT-2026-001` | Health |
| `LIF-2026-001` | Life |

The demo database also starts with one complete synthetic `FILED` claim for each product:

| Claim | Product |
|---|---|
| `CLM-2026-DEMO-MOTOR` | Motor |
| `CLM-2026-DEMO-HEALTH` | Health |
| `CLM-2026-DEMO-LIFE` | Life |

## Verification commands

Run the backend, migrations, architecture rules, packaging, and enforced coverage gates:

```powershell
.\mvnw.cmd verify
```

Run frontend unit tests and production build:

```powershell
npm --prefix frontend test
npm --prefix frontend run build
```

Install Chromium once and run browser acceptance plus visual snapshot tests:

```powershell
npm --prefix frontend exec playwright install chromium
npm --prefix frontend run e2e
```

Validate the Claude engineering substrate:

```powershell
npm run validate:harness
npm run test:harness
npm run test:orchestrator
```

Run the unified non-browser verification gate:

```powershell
npm run check
```

Include Playwright in the unified gate:

```powershell
nvm use 22
npm run check:all
# or: pnpm run check:all
```

The unified gate intentionally stops immediately with a clear message on any Node.js major other than 22, preventing the Windows Playwright startup stall caused by Node 24.

### Verified baseline

| Gate | Result |
|---|---:|
| Backend JUnit/MockMvc/ArchUnit/Flyway | 45/45 passed |
| JaCoCo instruction coverage | 88.72% |
| JaCoCo line coverage | 88.63% |
| JaCoCo branch coverage | 70.07% |
| Frontend Vitest | 2/2 passed |
| Playwright acceptance and snapshots | 9/9 passed |
| ClaimFlow harness contracts | 10/10 passed |
| Harness orchestrator | 133/133 passed |
| Frontend production build | Passed |

The committed coverage evidence includes [the human-readable summary](docs/coverage/backend-summary.md), [JaCoCo XML](docs/coverage/jacoco.xml), and [JaCoCo CSV](docs/coverage/jacoco.csv). CI also publishes Surefire and Playwright reports as build artifacts.

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/claims` | Customer | File one `FILED` FNOL |
| `GET` | `/api/claims` | Customer | List the signed-in owner's claims and sub-claims |
| `GET` | `/api/claims/{id}` | Owner/Admin | Read claim and complete evidence history |
| `POST` | `/api/claims/{id}/reopen` | Owner/Admin | Reopen the original and create a linked `FILED` sub-claim |
| `GET` | `/api/assessor/queue` | Assessor/Admin | Read the assessor work queue |
| `POST` | `/api/assessor/claims/{id}/documents/{type}/verification` | Assessor/Admin | Append a verified/rejected document outcome |
| `POST` | `/api/assessor/claims/{id}/evaluate` | Assessor/Admin | Run deterministic evidence, assessment, and decision policies |
| `GET` | `/api/admin/claims` | Admin | Read all claims |
| `GET` | `/api/admin/dashboard` | Admin | Read status/product totals, fraud alerts, and payout totals |
| `POST` | `/api/admin/claims/{id}/process` | Admin | Evaluate an eligible filed/under-review claim |
| `PATCH` | `/api/admin/claims/{id}/decision` | Admin | Append a reason-coded decision override |
| `POST` | `/api/admin/claims/{id}/settlement` | Admin | Create or return the unique settlement |
| `GET` | `/actuator/health` | Public | Health check with response correlation ID |

## Claude Harness and Agent SDK

The project substrate is under `.claude/`. `harness-lock.json` records the exact July 10 V5 foundation commit. The project includes specialized ClaimFlow agents, four domain skills, commands, domain-specific safety hooks, two MCP servers, sprint contracts, evaluator output support, and an official Claude Agent SDK dependency.

Preview an Agent SDK task without making changes:

```powershell
npm run agent:claimflow -- --ac AC-05 --mode plan
```

Execution is opt-in and requires an authenticated Claude Code environment:

```powershell
npm run agent:claimflow -- --ac AC-05 --mode evaluate --execute
```

## Production database profile

The default profile uses MySQL. Configure it with environment variables before starting the backend:

```text
DB_URL=jdbc:mysql://localhost:3306/claimflow?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
DB_USER=claimflow
DB_PASSWORD=claimflow
```

Then run:

```powershell
.\mvnw.cmd spring-boot:run
```

The optional Docker files remain available for container packaging and CI image validation, but Docker is not the required development or test path.

## Troubleshooting

- If `mvn` is not recognized, use the included `.\mvnw.cmd` command.
- If Maven uses the wrong JDK, set `JAVA_HOME` to a Java 21 installation and reopen the terminal.
- If Playwright reports a missing browser, run `npm --prefix frontend exec playwright install chromium`.
- If Node 24 causes Playwright process issues, switch to Node 22 (`nvm use 22`).
- If port 8080 or 5173 is occupied, stop the existing local process before running the demonstration.

This project is a capstone demonstration. Before production use, replace in-memory users, document metadata stubs, and payment stubs with reviewed identity, secure object storage, malware scanning, production payment, secret management, TLS, monitoring, backup, and privacy controls.
