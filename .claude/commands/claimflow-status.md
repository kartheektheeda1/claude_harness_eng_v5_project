---
name: claimflow-status
description: Show harness/spec health, active TDD phase, recent evidence, and the latest evaluator result without changing files.
argument-hint: ""
allowed-tools: Read, Glob, Grep, Bash
---

Run `node .claude/scripts/status.js`. Summarize harness health, spec health, active story/AC, TDD phase, last recorded test result, and latest evaluator result. Do not repair anything in this command.
