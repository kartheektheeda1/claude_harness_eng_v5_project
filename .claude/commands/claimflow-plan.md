---
name: claimflow-plan
description: Turn a ClaimFlow feature or sprint group into validated stories, ACs, traces, and verification coverage.
argument-hint: "<feature or sprint group>"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Skill
---

Invoke the `spec` skill for `$ARGUMENTS`. Show any unresolved business decision and do not begin implementation until `node .claude/scripts/validate-specs.js` passes.
