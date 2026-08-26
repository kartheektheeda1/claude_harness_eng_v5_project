# ClaimFlow Business Case

## Problem

Insurance claim operations are fragmented across intake, policy checks, document review, fraud screening, assessment, decision, settlement, and disputes. This creates avoidable hand-offs, inconsistent decisions, limited auditability, and slow customer communication. ClaimFlow provides one workflow for motor, health, and life claims while keeping each decision explainable and reviewable.

## Target Users

- Policyholders filing and tracking a first notice of loss.
- Claims assessors verifying document metadata and reviewing risk evidence.
- Claims administrators monitoring queues and performing controlled overrides.
- Audit and operations teams reviewing decision and payout evidence.

## Value Proposition

ClaimFlow reduces repetitive handling through deterministic policy validation and rules while preserving human review for incomplete, high-risk, or disputed cases. The platform exposes the reason code, policy version, assessment, and audit trail behind an outcome rather than presenting an unexplained status.

## Success Metrics

- Every official acceptance criterion has executable test evidence.
- Eligible complete claims can reach a decision and stubbed settlement in one workflow.
- Invalid policies and invalid state transitions persist no partial claim evidence.
- Every screening, assessment, decision, override, transition, and settlement is attributable and queryable.
- Customer reads remain owner-scoped; assessor and administrator boundaries remain distinct.
- Fixed-point payable calculations and architecture gates pass on every CI run.

## Domain Rules

1. FNOL is accepted only for an authenticated owner and an active matching policy version covering the incident date.
2. Document requirements vary by claim type and verification outcomes are append-only.
3. Fraud scoring is deterministic and evaluated against thresholds on the active policy version.
4. Payable amount uses fixed-point arithmetic, is capped by sum insured, and cannot be negative.
5. Decisions use stable reason codes and reference the active policy version.
6. Settlement is unique and immutable and equals the positive assessed amount.
7. A dispute creates a linked sub-claim and preserves the original record.
8. Administrative overrides append evidence with reason code, comment, actor, and time.
9. Invalid transitions fail atomically through a domain exception.
10. Synthetic data is used in every fixture, migration, screenshot, and example.

## Functional Boundary

ClaimFlow implements stubbed document metadata, deterministic fraud rules, and stubbed payout records. OCR, machine-learned fraud detection, real payments, hospital/bureau connections, and production multi-region deployment are intentionally excluded.
