# symphony_clone
# ClaimFlow – Claims Intake, Assessment & Settlement Platform

> AI-Native Engineering Capstone Project (BC-AINE-005)

## Overview

ClaimFlow is an AI-native insurance claims management platform developed as part of the Virtusa AI-Native Engineering Capstone Program. The platform streamlines the complete insurance claim lifecycle—from First Notice of Loss (FNOL) to settlement—using Claude Code agents and the Claude Harness Engine.

Unlike traditional software development, all production code, tests, migrations, and implementation artifacts are generated through AI agents under human supervision. The engineer's responsibility is to design specifications, configure AI agents, validate outputs, and ensure software quality.

---

# Business Domain

**Industry:** Insurance

**Business Case:** BC-AINE-005

The platform supports claim processing for:

- 🚗 Motor Insurance
- 🏥 Health Insurance
- ❤️ Life Insurance

---

# Features

## Customer Features

- File First Notice of Loss (FNOL)
- Upload claim documents (Stub)
- Track claim status
- View assessment results
- View settlement details
- Reopen previously settled claims

---

## Internal Features

### Document Verification

- Claim-specific document validation
- Missing document detection
- Verification status tracking

---

### Fraud Screening

- Rule-based fraud detection
- Configurable fraud threshold
- Fraud score generation

---

### Assessment Engine

- Payable amount calculation

```
Payable Amount =
min(Claim Amount, Sum Insured)
− Deductibles
− Co-Pay
```

---

### Decision Engine

Possible outcomes:

- AUTO_APPROVE
- MANUAL_REVIEW
- REJECT

---

### Settlement Module

- Generate payout records
- Immutable settlement history
- Payment stub integration

---

### Administration

- Override claim decisions
- Audit trail
- Claim monitoring dashboard

---

# Project Architecture

```
Customer

        │

        ▼

 React Frontend

        │

 REST API

        │

 Spring Boot Backend

        │

 ├── Controllers
 ├── Services
 ├── Domain Rules
 ├── Repositories
 ├── Fraud Engine
 ├── Assessment Engine
 └── Settlement Engine

        │

      MySQL
```

---

# Technology Stack

## Frontend

- React
- HTML5
- CSS3
- JavaScript

## Backend

- Java 21
- Spring Boot
- Spring Data JPA
- Spring Validation

## Database

- MySQL

## Testing

- JUnit 5
- Mockito
- Playwright

## CI/CD

- GitLab CI

## AI Engineering

- Claude Code
- Claude Harness Engine
- Playwright MCP

---

# Repository Structure

```
ClaimFlow/

│
├── docs/
│
├── specs/
│
├── src/
│
├── tests/
│
├── .claude/
│   ├── agents/
│   ├── skills/
│   ├── hooks/
│   └── commands/
│
├── scripts/
│
├── plugin.json
├── CLAUDE.md
├── AGENTS.md
├── .mcp.json
├── .gitlab-ci.yml
├── README.md
└── pom.xml
```

---

# Functional Workflow

```
Customer

↓

Submit FNOL

↓

Policy Validation

↓

Document Verification

↓

Fraud Screening

↓

Assessment

↓

Decision

↓

Settlement

↓

Claim Closed

↓

(Optional)

Reopen Claim
```

---

# Acceptance Criteria

The application implements the following core capabilities:

- FNOL Registration
- Policy Validation
- Document Verification
- Fraud Screening
- Claim Assessment
- Decision Management
- Settlement
- Claim Reopening
- Administrative Overrides
- State Transition Validation

---

# Non-Functional Requirements

- Fixed-point monetary calculations (BigDecimal)
- Immutable settlement records
- Append-only audit history
- Structured JSON logging
- Authentication & authorization
- Role-based access
- Architecture validation tests
- Database migration support

---

# AI-Native Engineering

This project follows an AI-native development workflow.

Production code is generated through Claude Code agents.

The engineer is responsible for:

- Writing specifications
- Designing business rules
- Configuring AI agents
- Reviewing generated code
- Maintaining architecture
- Managing pull requests

No handwritten production code is included.

---

# Claude Harness Components

This project extends the Claude Harness Engine with:

- Custom Agents
- Custom Skills
- Custom Hooks
- Custom Commands
- Playwright MCP Integration
- Sprint Contracts
- Evaluator Reports

---

# Testing

The project includes:

- Unit Tests
- Integration Tests
- Architecture Tests
- Playwright UI Tests
- Acceptance Criteria Tests
- Coverage Reports

---

# Running the Project

## Clone Repository

```bash
git clone <repository-url>
```

## Navigate

```bash
cd ClaimFlow
```

## Run Backend

```bash
./mvnw spring-boot:run
```

## Run Frontend

```bash
npm install
npm start
```

---

# Build

```bash
mvn clean install
```

---

# Execute Tests

```bash
mvn test
```

---

# Coverage

```bash
mvn verify
```

Coverage reports are generated automatically.

---

# Git Workflow

Development follows a Pull Request based workflow.

```
Feature Branch

↓

Commit

↓

Pull Request

↓

Claude Review

↓

Merge (--no-ff)

↓

Main Branch
```

Direct commits to `main` are prohibited.

---

# Synthetic Data

Only synthetic (dummy) data is used throughout the application.

No confidential or customer-sensitive information is stored or processed.

---

# Future Enhancements

- OCR-based document extraction
- AI-powered fraud detection
- Payment gateway integration
- Cloud deployment
- Notification services
- Analytics dashboard
- Policy management module

---

# Contributors

**Developer**

AI-Native Engineer (Virtusa Capstone)

---

# License

This project is developed exclusively for educational purposes under the Virtusa AI-Native Engineering Capstone Program.

---

# Acknowledgements

- Virtusa
- Claude Code
- Claude Harness Engine
- Anthropic
- Spring Boot
- React
`symphony_clone` is a standalone Symphony-style orchestrator for Claude Harness story groups.

It runs outside Claude Code. Its job is to watch a tracker (Linear, Jira, or Azure DevOps Boards), claim an eligible dependency group, prepare an isolated Git workspace, and launch Claude Code non-interactively inside that workspace.

```text
Linear issue (Todo + label)
  -> symphony_clone Docker container
  -> /workspaces/<issue-key>
  -> git clone + agent branch
  -> claude --print
  -> Claude Harness /auto --group <group>   (or /lite, /deep, ... — configurable)
  -> result.json + branch/PR
  -> Linear proof comment + Human Review
```

## What It Does

- **Planning (architect stage):** an issue carrying `PLAN_LABEL` (default `agent-plan`) is treated as a **PRD**. Claiming it runs the planning pipeline — `/brd → /spec → /design → /test → /tracker-publish` (plan only, no application code) — which **publishes the per-cluster group issues** the execution path then claims, and advances the PRD issue to `PLANNED_STATE`. This makes the flow genuinely PRD-in → PRs-out with no human grooming.
- **Brownfield change (feature stage):** an issue carrying `FEATURE_LABEL` (default `agent-feature`) is a **brownfield change request**. Symphony runs `/feature "<title>" --auto` against the existing codebase — DeepWiki discovery, seam-confidence gate, machine adherence — commits the branch, and opens one tracker-linked PR. No PRD, no grooming. Low seam-confidence moves the issue to Blocked with the adherence report attached.
- Polls the tracker for group issues in the configured ready state.
- Requires the configured ready label (default `agent-ready`).
- Skips issues that still have unresolved blockers.
- Clones the target repository into `/workspaces/<issue-key>`.
- Creates a branch like `agent/ENG-101`.
- Starts Claude Code with `CLAUDE_COMMAND`, passing a generated harness prompt.
- Reads `.claude/state/tracker-runs/<group>/result.json`.
- Pushes the branch and creates a GitHub PR via `gh`.
- Posts a proof comment back to the tracker and moves the issue to `Human Review` or `Blocked`.
- **Self-heals stuck runs**: if an issue is left in the running state but no orchestrator process is actually running it (crash or restart), the next tick reclaims it back to the ready state and retries.
- **Supports parallel runs**: launches up to `MAX_CONCURRENT_RUNS` group issues concurrently per tick, each in its own isolated workspace.
- Records run state in `STATE_DIR/state.json` and structured logs in `LOG_ROOT/orchestrator.jsonl`.
- Retries failed runs with exponential backoff before moving the work to the blocked state.

By default it does not mark tracker work `Done` — human review and merge stay explicit. Set `AUTO_MERGE=true` for the fully autonomous path: a run that reaches `human_review` (harness gates already passed) enables GitHub's native auto-merge on its PR — GitHub merges only once required checks pass, so a red build never lands — and advances the issue to `DONE_STATE`. See `.env.example`.

## Tracker providers

Select the provider with `TRACKER_PROVIDER` (`linear` | `jira` | `azure`; aliases `ado`, `azure-devops` map to `azure`). All three implement the same adapter contract, so the orchestration loop, eligibility, and PR flow are identical — only the API transport and how "state" and "labels" map to native concepts differ:

| Concept | Linear | Jira Cloud | Azure DevOps Boards |
|---|---|---|---|
| Auth | API key (`LINEAR_API_KEY`) | email + API token, HTTP Basic | Personal Access Token, HTTP Basic |
| Pipeline state (`READY_STATE`, …) | workflow state | status (workflow transition) | work-item `System.State` |
| Label (`READY_LABEL`, `PLAN_LABEL`) | issue label | issue label | work-item tag |
| Blockers | `blocked_by` relations | "Blocks" issue links | Predecessor (Dependency) links |
| Required env | `LINEAR_API_KEY`, `LINEAR_PROJECT_SLUG` | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` | `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PAT` |

The configured state names (`READY_STATE`, `RUNNING_STATE`, `REVIEW_STATE`, `BLOCKED_STATE`, `PLANNED_STATE`, `DONE_STATE`) and labels must exist on your board. For Jira, those names must be reachable workflow **transitions**; for Azure DevOps they must be valid states for the work-item type. The `*_CANDIDATES` fallback lists (e.g. `BLOCKED_STATE_CANDIDATES`) let one `.env` cover boards with slightly different state naming. See `.env.example` for the full per-provider block.

All three authenticate with a long-lived token (no interactive OAuth), so the daemon can run headless. Tokens stay in `.env` / runtime secrets — never in Git.

## Prerequisites

The target repository must already contain the Claude Harness scaffold:

```text
.claude/
specs/stories/
specs/stories/dependency-graph.md
features.json
specs/design/component-map.md
```

The machine running `symphony_clone` needs:

- Docker and Docker Compose
- Tracker credentials (Linear API key, Jira token, or Azure DevOps PAT)
- Git access to the target repository
- Claude Code subscription (Pro/Max/Team/Enterprise) **or** an Anthropic API key
- GitHub Personal Access Token with `repo` scope (PRs and pushes use it)

## Quick Start

### First-time setup

```bash
cp .env.example .env
# edit .env: TRACKER_PROVIDER + its credentials, TARGET_REPO_URL
./scripts/bootstrap.sh
```

`bootstrap.sh` validates `.env`, auto-pulls a `GITHUB_TOKEN` from `gh auth token` if you're signed into the GitHub CLI, builds the image, starts the container, and verifies Claude Code authentication inside the container. If Claude isn't authenticated yet, the script prints the exact `/login` command to run.

### First-time Claude login (one-off, only on a fresh volume)

The container persists Claude's auth tokens in a Docker volume. The first time that volume exists, log in once:

```bash
docker exec -u node -it symphony_clone-symphony-clone-1 claude /login
```

Pick **option 1** (Claude account with subscription) and complete the OAuth flow in your browser. The token lands in the `symphony-claude-home` volume and survives container recreates.

### Tail logs

```bash
docker compose logs -f symphony-clone
```

### Health check Linear

```bash
node scripts/diagnose-linear.js
```

## Configure `.env`

```text
TRACKER_PROVIDER=linear
LINEAR_API_KEY=lin_replace_me
LINEAR_PROJECT_SLUG=replace-with-linear-project-slug
TARGET_REPO_URL=git@github.com:your-org/your-repo.git
WORKSPACE_ROOT=/workspaces

READY_STATE=Ready for Agent
RUNNING_STATE=In Progress
REVIEW_STATE=Human Review
BLOCKED_STATE=Blocked
REVIEW_STATE_CANDIDATES=Human Review,In Review,Review
BLOCKED_STATE_CANDIDATES=Blocked,Canceled,Cancelled
READY_LABEL=agent-ready
TERMINAL_STATES=Done,Closed,Canceled,Cancelled,Duplicate

MAX_CONCURRENT_RUNS=1
POLL_INTERVAL_MS=60000
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY_MS=60000
RETRY_MAX_DELAY_MS=900000
MAX_WALLCLOCK_PER_RUN_MS=7200000
WORKSPACE_RETENTION=delete
STATE_DIR=/workspaces/.symphony
LOG_ROOT=/workspaces/.symphony/logs
STATUS_PORT=0

CLAUDE_COMMAND=claude --print --permission-mode bypassPermissions
HARNESS_COMMAND_TEMPLATE=/auto --group {{group}}

GITHUB_BASE_BRANCH=main
BRANCH_PREFIX=agent
CREATE_PR=true
GITHUB_TOKEN=
```

Environment variables exported in the shell override `.env` values. Do not commit real `.env` files.

### Configurable Harness Command

`HARNESS_COMMAND_TEMPLATE` controls the slash command Claude is told to execute. Two placeholders are substituted at runtime:

- `{{group}}` — the harness group ID (parsed from the tracker issue description)
- `{{issue}}` — the tracker issue key (e.g. `ENG-101`)

Examples:

```text
HARNESS_COMMAND_TEMPLATE=/auto --group {{group}}                    # default — full ratcheting loop
HARNESS_COMMAND_TEMPLATE=/vibe --group {{group}}                    # tiny-effort lane (no sprint contract)
HARNESS_COMMAND_TEMPLATE=/improve --group {{group}} --issue {{issue}}  # narrow improvement on existing code
```

**Important:** `/lite` is a scaffold-time skill that writes `specs/brd/`, `specs/stories/`, and design artifacts from a one-paragraph description. It is **not** an implementation runtime, so `HARNESS_COMMAND_TEMPLATE=/lite` would try to re-scaffold the workspace and fail. Use `/auto` (full ratcheting) or `/vibe` (no-ratchet lane for trivial changes) for implementation.

#### Per-issue mode override via a tracker label

To override the global template on a single issue, add a label of the form `mode-<command>` to that issue. The orchestrator strips the `mode-` prefix and uses the rest as the slash command name. Only commands that operate on an existing workspace (where `--group` means "implement that group") are valid here:

| Label on issue | Command Claude runs |
|----------------|---------------------|
| `mode-auto`    | `/auto --group <id>`    (explicit default) |
| `mode-vibe`    | `/vibe --group <id>`    (skip ratchet) |
| `mode-improve` | `/improve --group <id>` (enhancement on existing code) |

This lets you flag an individual issue without changing global config. Do **not** use `mode-lite`, `mode-brd`, `mode-spec`, `mode-design`, or `mode-brownfield` — those are scaffold/discovery skills that expect a fresh workspace or a description argument, not a group ID.

## Parallel Runs

`MAX_CONCURRENT_RUNS` controls how many group issues the orchestrator runs simultaneously. Each run gets its own workspace directory and Claude process — there is no shared state inside a run.

| Setting | When to use |
|---------|-------------|
| `1` (default) | Conservative; lets you observe one run at a time. |
| `2-3` | Once the workflow is proven. Two independent group issues finish in roughly the wall-clock time of one. |
| `4+` | Watch Anthropic token rate limits and disk usage (each workspace is 100MB+). |

To get genuine parallelism, your project needs **multiple independent groups** in `specs/stories/dependency-graph.md`. A single linear-DAG project still finishes one group at a time even with `MAX_CONCURRENT_RUNS=3`. Use `scripts/create-group-issue.js` to create one Linear issue per group.

## Self-Heal

If a run crashes (orchestrator process killed, container restarted, Docker daemon hiccup) while an issue is in the running state, the next tick detects the orphan and resets it:

1. `listCandidates` returns the issue (still `In Progress` on the tracker).
2. The in-memory `running` set is empty (new process).
3. `reclaimStuck` fires: records the abandonment as a failure in `state.json` (preserving the attempt counter and backoff), comments on the issue, and moves it back to the ready state.
4. The next tick picks it up like any normal ready issue (subject to retry backoff).

Log events:

```text
warn  run_reclaim_started  issueKey=ENG-101 state="In Progress"
info  run_reclaimed        issueKey=ENG-101
```

The reclaim writes a comment so the human reviewer sees that a previous run was abandoned. The attempt counter is bumped — repeated abandonment eventually exhausts `MAX_RETRY_ATTEMPTS` and moves the issue to blocked.

## Operational Tooling

| Script | Purpose |
|--------|---------|
| `scripts/bootstrap.sh` | Validate `.env`, build the image, start the container, verify Claude auth. Idempotent — safe to re-run. |
| `scripts/diagnose-linear.js` | Print Linear project state counts and the configured target states. Useful when issues aren't being picked up. |
| `scripts/create-group-issue.js` | Create a Linear "harness group" issue with the correct labels and description format. Idempotent — refuses to create duplicates for the same group ID. |
| `scripts/sync-to-template.sh` | (Canonical checkout only.) Sync this codebase into the `claude_harness_eng_v5/symphony_clone` template so scaffolded projects inherit fixes. |

### Creating multiple group issues

For a project with three independent groups (A, B, C, where B and C depend on A):

```bash
node scripts/create-group-issue.js --group A --stories "E1-S1,E1-S2" --title "Foundation"
node scripts/create-group-issue.js --group B --stories "E2-S1,E2-S2" --title "Feature B" --depends-on A
node scripts/create-group-issue.js --group C --stories "E3-S1"      --title "Feature C" --depends-on A
```

After Group A finishes, B and C run **in parallel** if `MAX_CONCURRENT_RUNS >= 2`.

## Deploy With Docker

`docker-compose.yml` uses two named volumes plus a read-only SSH mount:

```yaml
volumes:
  - symphony-workspaces:/workspaces           # per-issue git workspaces + state.json
  - symphony-claude-home:/home/node           # Claude config + auth tokens (persists across recreates)
  - ${HOME}/.ssh:/home/node/.ssh:ro           # SSH keys for git operations (read-only)
```

`symphony-claude-home` is a named Docker volume — the container's Claude state is **isolated from your host's own Claude state**. This is intentional: a host's Claude Code may store auth tokens somewhere the container can't reach (e.g. macOS Keychain), while the container's Linux Claude Code stores them under `~/.claude/`. Mixing the two via a bind mount would confuse both.

The container runs as the **non-root `node` user**. Claude Code refuses `--dangerously-skip-permissions` / `bypassPermissions` mode when running as root.

GitHub authentication for git push and PR creation flows through a system-wide credential helper installed at image build time:

```dockerfile
RUN git config --system 'credential.https://github.com.helper' \
  '!f() { test "$1" = "get" && printf "username=x-access-token\npassword=%s\n" "$GITHUB_TOKEN"; }; f'
```

When git needs credentials for any `https://github.com/*` URL, the helper reads `$GITHUB_TOKEN` from the runtime environment and hands it to git.

### Commands

```bash
docker compose up --build              # foreground build + run
docker compose up --build -d           # background
docker compose logs -f symphony-clone  # tail
docker compose down                    # stop, keep volumes (auth persists)
docker compose down -v                 # stop AND wipe volumes (Claude re-login required after)
```

## How Claude Code Is Triggered

`symphony_clone` launches Claude Code as a subprocess in the cloned workspace.

Default command:

```bash
claude --print --permission-mode bypassPermissions
```

The orchestrator runs `CLAUDE_COMMAND` through `${SHELL:-/bin/bash} -lc` and passes the generated task prompt as the final shell-escaped argument. If you need a custom command shape, include `{{prompt}}` in `CLAUDE_COMMAND`; the runner substitutes it with the shell-escaped prompt instead of appending.

The generated prompt tells Claude Code to:

1. Read `.claude/skills/auto/SKILL.md`, `.claude/program.md`, learned rules, `features.json`, and the story files for the group.
2. Execute the resolved harness command (from `HARNESS_COMMAND_TEMPLATE` or a per-issue label override), e.g. `/auto --group A`.
3. Commit the completed changes to the current branch.
4. Write `.claude/state/tracker-runs/<group>/result.json`.

If slash commands are unavailable in non-interactive mode, the prompt instructs Claude Code to follow the corresponding skill file directly.

## Linear Issue Format

Each eligible issue should represent one Claude Harness dependency group.

Minimum body:

```markdown
## Harness Group

- Group: A
- Harness command: /auto --group A
- Stories: E1-S1, E1-S2
- Depends on groups: none
```

The issue must:

- Be in the configured ready state (default `Ready for Agent`).
- Have the configured ready label (default `agent-ready`).
- Have every blocking issue in a terminal state.

Optional labels:

| Label | Effect |
|-------|--------|
| `mode-auto`, `mode-vibe`, `mode-improve` | Override `HARNESS_COMMAND_TEMPLATE` for this issue only. See "Per-issue mode override" above for the full list of valid commands. |

Recommended workflow:

```text
Backlog -> Todo -> In Progress -> Human Review -> Done
                            \-> Blocked / Canceled
```

## Result Contract

Claude Code must write `.claude/state/tracker-runs/<group>/result.json`.

Success example:

```json
{
  "group": "A",
  "status": "human_review",
  "summary": "Implemented group A password reset foundation.",
  "branch": "agent/ENG-101",
  "commit": "abc123",
  "tests": ["npm test: passed", "npm run lint: passed"],
  "reports": ["specs/reviews/evaluator-report.md", "specs/reviews/security-review.md"],
  "features_updated": ["F001", "F002"]
}
```

Blocked example:

```json
{
  "group": "A",
  "status": "blocked",
  "summary": "Could not start evaluator.",
  "blocker": "Missing DATABASE_URL required by project-manifest local verification mode.",
  "tests": [],
  "reports": []
}
```

When status is `human_review`, the orchestrator pushes the branch, opens a PR, posts proof to the tracker, and moves the issue to `Human Review`. When status is `blocked`, the orchestrator posts the blocker and moves the issue to `Blocked`.

## Retry Policy

Every failure (Claude exit code, git push, PR creation, result read, tracker update) records an attempt in `state.json`. Backoff is exponential:

```text
delay = min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2^(attempt - 1))
```

After `MAX_RETRY_ATTEMPTS`, the issue is commented with the final error and moved to the blocked state.

The self-heal flow records reclaim events as failed attempts too — so if a run abandons itself repeatedly (a host that keeps sleeping, say), the system eventually marks the issue blocked instead of looping forever.

## Dashboard and Logs

Set `STATUS_PORT` to enable the lightweight dashboard:

```text
STATUS_PORT=8787
```

Endpoints:

| Route | Response |
|-------|----------|
| `GET /` | HTML status table |
| `GET /health` | `{"ok":true}` |
| `GET /state` | Current `state.json` snapshot |

If `STATUS_PORT=0`, the server is disabled. To expose from Docker, set `STATUS_PORT=8787` and add a port mapping `8787:8787` in your compose override.

Structured JSONL logs are written to `${LOG_ROOT}/orchestrator.jsonl`. Each record includes a timestamp, event name, level, and run context (issue key, group, attempt, PR URL, error message).

## Run Without Docker

For local development:

```bash
node src/index.js
```

Verify:

```bash
npm test        # unit tests (scheduler, prompt-builder, state-store, tracker, runner, etc.)
npm run check   # node --check on every JS file
```

## Testing end-to-end

Validate the orchestrator in three escalating layers (cheapest first). The recipe is the same for every provider — only the board and credentials change.

**1. Unit (no network, no Claude).** `npm test`. Each tracker adapter takes an injectable `fetchImpl`, so adapter logic (issue normalization, state transitions, blocker resolution) is asserted against mocked API responses — see `src/tracker/*.test.js`.

**2. Dry control-plane loop (real tracker, stub Claude).** Point `.env` at a real project and replace the agent with a stub so you exercise polling → claim → state machine → PR plumbing without spending a real build:

```bash
# stub-claude.sh — pretend a group built successfully
mkdir -p .claude/state/tracker-runs/A
printf '{"group":"A","status":"human_review","summary":"stub","branch":"agent/test","commit":"HEAD"}' \
  > .claude/state/tracker-runs/A/result.json
```

Set `CLAUDE_COMMAND=bash /path/to/stub-claude.sh` and `CREATE_PR=false`, create a test issue in `READY_STATE` with the `agent-ready` label, then run `node src/index.js`. Watch it move the issue In Progress → comment → Human Review. This proves eligibility, the state machine, retries, and reclaim logic per provider.

**3. Full live (real tracker, real Claude — full auto).** Use the real `CLAUDE_COMMAND`, set `AUTO_MERGE=true`, and create a **PRD** issue in `READY_STATE` labelled `agent-plan`. The planning lane runs `/brd → /spec → /design → /test → /tracker-publish`, publishes one `agent-ready` issue per cluster, and the execution lane builds each cluster into its own PR, which GitHub auto-merges once checks pass. This is the end-to-end Flow 1.

For Linear specifically, `node scripts/diagnose-linear.js` prints live state/label counts, which is the fastest way to confirm your `.env` states and labels match the board.

## Security Notes

- Keep API tokens in `.env` or runtime secrets, not Git. `.env` should be in `.gitignore`.
- Prefer a dedicated tracker API key and GitHub token for the orchestrator.
- `GITHUB_TOKEN` only needs `repo` scope.
- Use a dedicated SSH deploy key for repository access if cloning over SSH.
- Start with `MAX_CONCURRENT_RUNS=1` and scale up after a clean run.
- Review generated PRs before merge.
- The container runs as a non-root `node` user; do not chown volumes back to root.
- The `bypassPermissions` mode skips Claude Code's per-tool confirmation prompts. Acceptable for headless orchestration; do not run interactive Claude this way.

## Troubleshooting

**No issues are picked up**

- Confirm the issue state equals `READY_STATE`.
- Confirm the issue has `READY_LABEL`.
- Confirm blockers are in terminal states.
- Confirm the project/board identifier in `.env` matches the real project.
- Run `node scripts/diagnose-linear.js` to see actual state counts (Linear).

**`/bin/bash: line 1: claude: command not found`**

- The image was built without Claude Code. Rebuild: `docker compose build --no-cache`.

**`--dangerously-skip-permissions cannot be used with root/sudo privileges`**

- The container is running as root. The included Dockerfile switches to the `node` user — if you customised it, restore `USER node`.

**`Not logged in · Please run /login`**

- The container's Claude state is empty. Run:
  ```bash
  docker exec -u node -it symphony_clone-symphony-clone-1 claude /login
  ```
  Pick option 1. The token persists in the `symphony-claude-home` volume.

**Git push fails: `could not read Username for 'https://github.com'`**

- `GITHUB_TOKEN` is empty or missing. Set it in `.env`:
  ```bash
  echo "GITHUB_TOKEN=$(gh auth token)" >> .env
  docker compose up -d --force-recreate
  ```
- If your remote is SSH (`git@github.com:...`), make sure `~/.ssh/id_*` is registered with your GitHub account; the orchestrator mounts `~/.ssh` read-only.

**Run starts, gets stuck on a single tick for hours**

- A previous run probably crashed and the issue is stuck in the running state. Self-heal should reclaim it within one poll cycle. If not, check `state.json` and the orchestrator logs for `run_reclaim_*` events.

**The tracker shows the issue back in `Todo` even though `run_started` fired**

- Someone may have moved the issue manually. Don't move issues during a run — the orchestrator's `finishRun` overwrites the state when the run completes.

## Retry Preserves Local Commits

When a run fails after Claude has made commits but before the push succeeds (the classic failure mode: `git push` errors because `GITHUB_TOKEN` is missing or the credential helper isn't installed), a naive retry would reset the agent branch to `origin/main` and erase Claude's work.

`workspace-manager.js:prepare()` avoids that on every invocation:

1. Always `git fetch origin <base-branch>` to pull the latest base.
2. If the workspace already exists and the local agent branch has commits ahead of the base, **preserve them**:
   - Create a recovery tag `recovery/<branchName>/attempt-<n>-<timestamp>-<uuid>` pointing at the branch HEAD.
   - `git checkout <branchName>` (no `-B`, no reset).
   - Return `{ resumed: true, commitsAhead, backupRef }`.
3. Only when the branch is missing locally, or has zero commits ahead of the base, does the destructive `git checkout -B branchName origin/<base>` run.

The scheduler logs `workspace_resumed` with the recovery tag whenever a retry resumes mid-flight work. Recovery tags accumulate one per attempt; they are not pruned automatically — clean them up manually with `git tag -d recovery/...` once you're confident a run won't need them.

In short: if a credential, push, or PR-creation step fails after Claude has committed, the retry continues from the existing commits instead of starting Claude over.

## Workspace Retention

`WORKSPACE_RETENTION` controls what happens to `/workspaces/<issue-key>` once a run reaches a terminal state (`human_review` or final `blocked`):

| Value | Behaviour |
|-------|-----------|
| `delete` (default) | The orchestrator removes `/workspaces/<issue-key>` once the issue moves to its terminal tracker state. The branch is already on the remote, so nothing useful is lost. |
| `keep` | The directory stays in place for forensics. Disk usage grows over time; you're responsible for housekeeping. |

Deletion is sandboxed: the orchestrator refuses to delete any path that isn't strictly inside `WORKSPACE_ROOT`.

`MAX_WALLCLOCK_PER_RUN_MS` caps the wall-clock time of a single `claude` subprocess. The default is 2 hours (`7200000`). When the cap is hit, the process group is `SIGTERM`'d and the failure follows the normal retry/blocked path. The legacy `CLAUDE_TURN_TIMEOUT_MS` env var still works as an alias if `MAX_WALLCLOCK_PER_RUN_MS` is unset.

## Current Limitations

- Linear and Jira Cloud are fully implemented, including group-issue creation. Azure DevOps Boards implements the runtime adapter (poll/claim/comment/transition); it doesn't yet have an equivalent of `scripts/create-group-issue.js`.
- No webhook receiver yet; polling only.
- No dynamic workflow reload — `.env` changes require a container recreate.
- The file-based `state.json` is fine for `MAX_CONCURRENT_RUNS <= ~5`; a real database would be needed at larger scale.
- Claude Code runs as a subprocess, not through an app-server protocol.
