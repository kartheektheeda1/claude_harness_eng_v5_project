# ClaimFlow Application Specification

## Purpose

ClaimFlow is an insurance claims-operations platform for motor, health, and life products. It covers first notice of loss, policy validation, document verification, deterministic fraud screening, fixed-point assessment, a reason-coded decision, settlement, administrative override, and dispute/reopen processing.

This specification is the product source of truth. Feature specifications refine it but may not weaken an acceptance criterion or non-functional requirement defined here.

## Actors

- **Customer** files and tracks claims and opens a dispute on an eligible terminal claim.
- **Assessor** verifies submitted document metadata, reviews fraud evidence, and records a reason-coded recommendation.
- **Administrator** monitors all queues and performs audited overrides.
- **ClaimFlow system** applies the active policy version and creates immutable evidence records.

## Acceptance Criteria

### AC-01 - File FNOL

Given an authenticated customer owns an active policy, when the customer submits the policy number, incident date, claim type, narrative, amount, and stubbed supporting-document metadata, then one claim is filed and returned with a stable claim number.

### AC-02 - Reject inactive policy

Given the linked policy is inactive or does not cover the incident date, when FNOL is submitted, then `PolicyNotActiveException` is raised, no claim is persisted, and the API returns a deterministic client error.

### AC-03 - Claim-type document checklist

Given a motor, health, or life claim, when its checklist is evaluated, then the required items come from the applicable claim-type policy and every submitted item can be marked `VERIFIED` or `REJECTED` with a reason.

### AC-04 - Versioned deterministic fraud screening

Given an active policy version, when fraud rules execute for the same claim facts, then they return the same score and flag the claim when the score meets the threshold recorded on that policy version.

### AC-05 - Fixed-point payable assessment

Given the claim amount, sum insured, deductible, and co-pay percentage, when assessment runs, then payable amount equals `max(0, min(claim amount, sum insured) - deductible - co-pay)` using `BigDecimal`, an explicit two-decimal scale, and explicit rounding.

### AC-06 - Versioned reason-coded decision

Given document, fraud, and assessment evidence, when the decision policy executes, then the result is `AUTO_APPROVE`, `MANUAL_REVIEW`, or `REJECT`, with a reason code and policy-version reference.

### AC-07 - Immutable settlement

Given a claim is approved with a positive assessed amount, when settlement runs, then exactly one immutable payout record is linked to the claim and its payout amount equals the assessed amount.

### AC-08 - Reopen as linked sub-claim

Given a settled or rejected original claim, when its owner opens a dispute with a reason, then the original moves to `REOPENED`, a new filed sub-claim links to the original, and both remain queryable.

### AC-09 - Audited administrative override

Given an automatically approved or rejected decision, when an administrator overrides it with a comment and reason code, then a new decision record is appended with actor and timestamp and the previous decision evidence remains queryable.

### AC-10 - Enforced state machine

Given any claim, when a transition is requested outside the allowed `FILED -> UNDER_REVIEW -> APPROVED | REJECTED -> SETTLED -> REOPENED` lifecycle (including the explicit manual-review path), then `InvalidClaimStateException` is raised and no partial transition is persisted.

## Non-Functional Requirements

- **NFR-01:** All payout, deductible, co-pay, and assessed values use `BigDecimal`; floating-point arithmetic is prohibited.
- **NFR-02:** Fraud screenings, assessments, decisions, audit events, and settlements are append-only evidence. The claim aggregate is a current-state projection over that evidence.
- **NFR-03:** Health data, narratives, document content, credentials, and other PII are never written to application logs.
- **NFR-04:** Controller-level authorization separates customer, assessor, and administrator operations; customer reads remain owner-scoped.
- **NFR-05:** Flyway migrations are append-only. An applied migration is never edited.
- **NFR-06:** Console logs are structured JSON and every HTTP request receives a correlation ID that is returned to the caller.
- **NFR-07:** `/actuator/health` returns HTTP 200 within one second after successful application startup.
- **NFR-08:** Automated architecture and domain tests enforce layering, terminal-state immutability, positive payouts, and domain-method-only transitions.

## Out of Scope

Real OCR, machine-learned fraud detection, production payment rails, hospital or bureau integrations, and production multi-region deployment are outside this capstone.
