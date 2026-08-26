---
name: document-checklist-generator
description: Generate AC-03 claim-type checklist policies and append-only assessor verification tests.
---

# Document Checklist Generator

Read `specs/document-verification_spec.md`. Keep the policy pure and deterministic. Generate required metadata identifiers for motor, health, and life; reject unknown identifiers at the API boundary; and append assessor outcomes with a stable reason code. Never process or log real document content.
