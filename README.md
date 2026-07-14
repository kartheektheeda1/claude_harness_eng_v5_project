# ClaimFlow

ClaimFlow is a full-stack insurance claims intake, assessment, decision, and settlement platform for motor, health, and life insurance. It implements the BC-AINE-005 workflow with a Java 21 Spring Boot backend, React frontend, MySQL persistence, and automated tests.

All bundled users, policies, examples, and test records are synthetic.

## Main features

- Customer First Notice of Loss (FNOL) submission
- Policy ownership, policy type, active-period, and incident-date validation
- Claim-specific document verification
- Configurable deterministic fraud scoring
- BigDecimal assessment with explicit two-decimal HALF_UP rounding
- AUTO_APPROVE, MANUAL_REVIEW, and REJECT decisions
- Immutable settlement records and append-only audit events
- Customer-owned claim access and controlled claim reopening
- Admin dashboard, processing queue, reprocessing, and decision override
- Flyway-managed MySQL schema
- JUnit, MockMvc, Vitest, Playwright, and JaCoCo verification

## Architecture

~~~text
React and Vite frontend
          |
Spring Boot REST API
          |
Claim workflow and domain rules
          |
Spring Data JPA and Flyway
          |
MySQL
~~~

Backend source is in src/main/java/com/claimflow. Frontend source is in frontend. The existing harness source is preserved in Claude_harness_v5/symphony_clone.

## Prerequisites

Use either Docker quick start or native development.

### Docker

- Docker Desktop
- Docker Compose v2+

### Native development

- Java JDK 21
- Maven 3.9+
- MySQL 8
- Node.js 20 or 22
- npm

Verify:

~~~bash
java -version
mvn -version
node --version
npm --version
~~~

Maven must report Java 21.

## Quick start with Docker

From the project root:

~~~bash
docker compose up --build
~~~

Open:

- Application: http://localhost:5173
- API health: http://localhost:8080/actuator/health

Stop with Ctrl+C and then:

~~~bash
docker compose down
~~~

Use docker compose down -v only when the local database volume should also be deleted.

## Run without Docker

### 1. Prepare MySQL

~~~sql
CREATE DATABASE IF NOT EXISTS claimflow;
CREATE USER IF NOT EXISTS 'claimflow'@'localhost' IDENTIFIED BY 'claimflow';
GRANT ALL PRIVILEGES ON claimflow.* TO 'claimflow'@'localhost';
FLUSH PRIVILEGES;
~~~

Default backend connection:

~~~text
URL: jdbc:mysql://localhost:3306/claimflow
Username: claimflow
Password: claimflow
~~~

Flyway creates and validates the schema when the backend starts.

### 2. Start the backend

From the project root:

~~~bash
mvn spring-boot:run
~~~

Wait for Started ClaimFlowApplication and verify http://localhost:8080/actuator/health.

Optional environment overrides:

~~~text
DB_URL=jdbc:mysql://localhost:3306/claimflow
DB_USER=claimflow
DB_PASSWORD=claimflow
PORT=8080
~~~

Windows CMD example:

~~~cmd
set "DB_URL=jdbc:mysql://localhost:3306/claimflow"
set "DB_USER=claimflow"
set "DB_PASSWORD=claimflow"
mvn spring-boot:run
~~~

### 3. Start the frontend

Open a second terminal:

~~~bash
cd frontend
npm ci
npm run dev
~~~

Open http://localhost:5173. Vite proxies /api to http://localhost:8080.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Customer | customer | customer123 |
| Administrator | admin | admin123 |

Synthetic customer policies:

| Policy | Type |
|---|---|
| MTR-2026-001 | Motor |
| HLT-2026-001 | Health |
| LIF-2026-001 | Life |

## Build and test

Backend tests use H2 in MySQL compatibility mode. Docker and MySQL are not required for backend automated tests.

### Backend tests and coverage

~~~bash
mvn verify
~~~

Verified baseline:

~~~text
Tests: 15 passed
Failures: 0
Errors: 0
Skipped: 0
JaCoCo line coverage: 80.9%
~~~

Coverage report: target/site/jacoco/index.html

### Frontend unit tests

~~~bash
cd frontend
npm ci
npm test
~~~

Verified baseline: 2 tests passed.

### Production build

~~~bash
npm run build
~~~

Output is written to frontend/dist.

### Playwright browser test

Install Chromium once:

~~~bash
npx playwright install chromium
~~~

Run:

~~~bash
npm run e2e
~~~

Verified baseline: 1 test passed. The test starts its own Vite server and uses a synthetic mocked API response.

### Complete verified result

~~~text
Backend JUnit and MockMvc: 15 passed
Frontend Vitest:           2 passed
Playwright E2E:            1 passed
Total:                    18 passed
Production build:          successful
Production npm audit:      0 vulnerabilities
~~~

## API reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /api/claims | Customer | Submit FNOL and execute workflow |
| GET | /api/claims | Customer | List the signed-in customer's claims |
| GET | /api/claims/{id} | Owner or admin | View claim, settlement, and audit details |
| POST | /api/claims/{id}/reopen | Owner or admin | Reopen a settled or rejected claim |
| GET | /api/admin/dashboard | Admin | View claim totals |
| GET | /api/admin/claims | Admin | View all claims |
| POST | /api/admin/claims/{id}/process | Admin | Re-run an eligible workflow |
| PATCH | /api/admin/claims/{id}/decision | Admin | Override a decision with a reason |
| GET | /actuator/health | Public | Health check |

## Design guarantees

- Monetary values use BigDecimal with explicit scale and rounding.
- Workflow changes go through domain methods on Claim.
- Customer resources are owner-scoped.
- Admin operations are under /api/admin.
- Settlement records are immutable.
- Audit history is append-only.
- Persisted schema changes use versioned Flyway migrations.
- Tests and examples use synthetic data.

## Troubleshooting

### mvn is not recognized

Install Maven 3.9+ and add its bin directory to PATH. Open a new terminal and run:

~~~cmd
mvn -version
~~~

### Maven reports Java 17

Set JAVA_HOME to JDK 21.

~~~cmd
set "JAVA_HOME=C:Program FilesEclipse Adoptiumjdk-21.0.11.10-hotspot"
set "PATH=%JAVA_HOME%in;%PATH%"
mvn -version
~~~

### Backend cannot connect to MySQL

Confirm that MySQL is running on port 3306 and that the claimflow database and user exist. The Docker quick start is an alternative.

### Port 8080 or 5173 is busy

Stop the process using the port or configure a different port.

### Playwright browser is missing

~~~bash
cd frontend
npx playwright install chromium
npm run e2e
~~~

### Unsupported Node.js version

Use Node.js 20 or 22. With NVM:

~~~bash
nvm use 22
~~~

## Production notes

The included authentication, users, policies, document selections, and payment integration are demonstration components. Before production use, replace them with an identity provider, secret management, TLS, secure file storage, malware scanning, a payment service, monitoring, backups, and reviewed production CORS settings.

## Client ZIP contents

The client delivery ZIP contains application source, tests, migrations, configuration, Docker files, this README, and the existing harness source. It excludes Git metadata, dependency caches, node_modules, compiled output, test reports, temporary logs, local environment files, and secrets.

After extracting, follow Quick start with Docker or Run without Docker.