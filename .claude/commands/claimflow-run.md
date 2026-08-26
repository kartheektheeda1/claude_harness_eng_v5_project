---
name: claimflow-run
description: Run an approved ClaimFlow sprint group through spec validation, TDD, review, and independent evaluation.
argument-hint: "<sprint group>"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Skill, Task
---

Invoke the `auto` skill for `$ARGUMENTS`. Stop at the first failed gate, preserve its evidence, and ask for direction only when the missing decision materially changes behavior.
