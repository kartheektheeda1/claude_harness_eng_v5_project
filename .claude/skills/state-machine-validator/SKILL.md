---
name: state-machine-validator
description: Verify AC-08/AC-10 ClaimFlow lifecycle and linked sub-claim rules.
---

# State Machine Validator

Build a transition table from `specs/reopen_spec.md`. Test every allowed edge and representative forbidden edges. Require `InvalidClaimStateException`, transactional rollback, domain-method-only mutation, original-to-sub-claim linkage, and queryability of both records. Treat a transition implemented directly in a controller, service field setter, or repository update as blocking.
