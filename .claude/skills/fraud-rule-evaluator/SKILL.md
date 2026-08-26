---
name: fraud-rule-evaluator
description: Validate deterministic ClaimFlow fraud rules against an active versioned policy and its exact threshold boundaries.
---

# Fraud Rule Evaluator

1. Read `specs/fraud-screening_spec.md` and the active policy-version model.
2. Enumerate every scoring branch and stable rule code.
3. Add AC-04 tests for repeatability, exact thresholds, reopen weighting, missing evidence, and the 100-point cap.
4. Require append-only screening evidence containing score, rule codes, threshold, and policy version.
5. Run the mapped unit and API tests; report any untested branch as blocking.
