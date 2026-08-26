---
name: assessment-settlement-agent
description: Implements AC-05, AC-06, AC-07, and AC-09 fixed-point assessment, decision, settlement, and override invariants.
model: sonnet
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Assessment and Settlement Agent

Use `BigDecimal` with explicit scale and rounding. Append assessment and decision evidence with policy-version and reason-code references. A settlement is unique, positive, equal to the assessment, and immutable. Administrative overrides append evidence and never erase earlier decisions.
