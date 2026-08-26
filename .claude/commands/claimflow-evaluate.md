---
name: claimflow-evaluate
description: Independently evaluate a ClaimFlow sprint group and produce a reproducible pass/fail report.
argument-hint: "<sprint group> [--e2e]"
allowed-tools: Read, Glob, Grep, Write, Bash, Skill, Task
---

Invoke the `evaluate` skill for `$ARGUMENTS`. Do not edit application code, tests, stories, or contracts during this pass.
