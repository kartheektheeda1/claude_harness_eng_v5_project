package com.claimflow.service;

import com.claimflow.api.*;
import com.claimflow.domain.*;
import com.claimflow.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ClaimService {
    private final ClaimRepository claims;
    private final PolicyRepository policies;
    private final SettlementRepository settlements;
    private final AuditEventRepository audits;
    private final DocumentVerificationRepository documentEvidence;
    private final FraudScreeningRepository fraudEvidence;
    private final AssessmentRecordRepository assessmentEvidence;
    private final DecisionRecordRepository decisionEvidence;
    private final ClaimTransitionRepository transitions;
    private final DocumentChecklistPolicy checklists;
    private final FraudScreeningPolicy fraudPolicy;
    private final PayoutCalculator payoutCalculator;
    private final DecisionPolicy decisionPolicy;

    public ClaimService(ClaimRepository claims, PolicyRepository policies, SettlementRepository settlements,
                        AuditEventRepository audits, DocumentVerificationRepository documentEvidence,
                        FraudScreeningRepository fraudEvidence, AssessmentRecordRepository assessmentEvidence,
                        DecisionRecordRepository decisionEvidence, ClaimTransitionRepository transitions,
                        DocumentChecklistPolicy checklists, FraudScreeningPolicy fraudPolicy,
                        PayoutCalculator payoutCalculator, DecisionPolicy decisionPolicy) {
        this.claims = claims; this.policies = policies; this.settlements = settlements; this.audits = audits;
        this.documentEvidence = documentEvidence; this.fraudEvidence = fraudEvidence;
        this.assessmentEvidence = assessmentEvidence; this.decisionEvidence = decisionEvidence;
        this.transitions = transitions; this.checklists = checklists; this.fraudPolicy = fraudPolicy;
        this.payoutCalculator = payoutCalculator; this.decisionPolicy = decisionPolicy;
    }

    /** AC-01/AC-02: filing is atomic and does not auto-run downstream decisions. */
    @Transactional
    public ClaimResponse submit(ClaimRequest request, String username) {
        Policy policy = policy(request.policyNumber());
        if (!policy.getCustomerUsername().equals(username))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Policy does not belong to this customer");
        if (policy.getType() != request.type())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Claim type does not match policy");
        if (!policy.covers(request.incidentDate())) throw new PolicyNotActiveException(policy.getPolicyNumber());
        Claim claim = new Claim(UUID.randomUUID(), nextClaimNumber(), request.policyNumber(), policy.getPolicyVersion(), null,
            username, request.type(), request.incidentDate(), request.claimedAmount(), request.description(), request.documentTypes());
        claims.save(claim);
        audit(claim, username, "FNOL_FILED", "Claim filed against policy version " + policy.getPolicyVersion());
        return response(claim);
    }

    /** AC-03..AC-06: records each deterministic stage as append-only evidence. */
    @Transactional
    public ClaimResponse process(UUID id, String actor) {
        Claim claim = claim(id);
        Policy policy = policy(claim.getPolicyNumber());
        if (claim.getStatus() == ClaimStatus.FILED) {
            ClaimStatus from = claim.getStatus();
            claim.beginReview();
            transition(claim, from, claim.getStatus(), actor);
        } else if (claim.getStatus() != ClaimStatus.UNDER_REVIEW) {
            throw new InvalidClaimStateException("Claim cannot be evaluated from " + claim.getStatus());
        }

        Set<String> required = new TreeSet<>(checklists.requiredDocuments(claim.getType()));
        Set<String> missing = new TreeSet<>(required);
        missing.removeAll(claim.getDocumentTypes());
        Map<String, DocumentVerificationRecord> latest = latestDocumentEvidence(claim.getId());
        for (String type : required) {
            if (claim.getDocumentTypes().contains(type) && !latest.containsKey(type)) {
                DocumentVerificationRecord accepted = new DocumentVerificationRecord(claim.getId(), type,
                    DocumentOutcome.VERIFIED, "Submitted metadata passed the configured checklist", actor);
                documentEvidence.save(accepted); latest.put(type, accepted);
            }
            DocumentVerificationRecord record = latest.get(type);
            if (record != null && record.getOutcome() == DocumentOutcome.REJECTED) missing.add(type);
        }
        claim.documentsVerified(missing.isEmpty());

        FraudScreeningPolicy.ScreeningResult screening = fraudPolicy.evaluate(claim, policy, missing);
        claim.screened(screening.score());
        fraudEvidence.save(new FraudScreeningRecord(claim.getId(), screening.score(), screening.reviewThreshold(),
            screening.rejectThreshold(), screening.policyVersion(), String.join(",", screening.ruleCodes())));

        var payable = payoutCalculator.calculate(claim.getClaimedAmount(), policy.getSumInsured(),
            policy.getDeductible(), policy.getCoPayPercent());
        claim.assessed(payable);
        assessmentEvidence.save(new AssessmentRecord(claim.getId(), payable, policy.getPolicyVersion()));

        DecisionPolicy.DecisionResult result = decisionPolicy.decide(claim.getVerificationStatus(), screening.score(),
            screening.reviewThreshold(), screening.rejectThreshold(), payable, policy.getPolicyVersion());
        ClaimStatus beforeDecision = claim.getStatus();
        String comment = decisionComment(result, missing);
        claim.decide(result.decision(), result.reasonCode(), comment);
        decisionEvidence.save(new DecisionRecord(claim.getId(), result.decision(), result.reasonCode(), comment,
            result.policyVersion(), actor, false));
        transition(claim, beforeDecision, claim.getStatus(), actor);
        audit(claim, actor, "WORKFLOW_EVALUATED", "Decision " + result.decision() + " with code " + result.reasonCode());
        return response(claims.save(claim));
    }

    /** AC-03: assessors append outcomes; prior verification evidence remains queryable. */
    @Transactional
    public ClaimResponse verifyDocument(UUID id, String documentType, DocumentVerificationRequest request, String actor) {
        Claim claim = claim(id);
        if (!claim.getDocumentTypes().contains(documentType))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document metadata is not present on this claim");
        if (!checklists.requiredDocuments(claim.getType()).contains(documentType))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is not part of the applicable checklist");
        if (claim.getStatus() == ClaimStatus.FILED) {
            ClaimStatus from = claim.getStatus(); claim.beginReview(); transition(claim, from, claim.getStatus(), actor);
        } else if (claim.getStatus() != ClaimStatus.UNDER_REVIEW) {
            throw new InvalidClaimStateException("Documents cannot be verified from " + claim.getStatus());
        }
        documentEvidence.save(new DocumentVerificationRecord(claim.getId(), documentType, request.outcome(), request.reason(), actor));
        audit(claim, actor, "DOCUMENT_" + request.outcome(), documentType);
        return response(claims.save(claim));
    }

    /** AC-09: an override appends a new reason-coded decision record. */
    @Transactional
    public ClaimResponse override(UUID id, OverrideRequest request, String actor) {
        Claim claim = claim(id);
        if (claim.getStatus() != ClaimStatus.APPROVED && claim.getStatus() != ClaimStatus.REJECTED)
            throw new InvalidClaimStateException("Only an approved or rejected automated decision can be overridden");
        ClaimStatus from = claim.getStatus();
        claim.decide(request.decision(), request.reasonCode(), request.comment());
        decisionEvidence.save(new DecisionRecord(claim.getId(), request.decision(), request.reasonCode(), request.comment(),
            claim.getPolicyVersion(), actor, true));
        transition(claim, from, claim.getStatus(), actor);
        audit(claim, actor, "DECISION_OVERRIDDEN", request.reasonCode().name());
        return response(claims.save(claim));
    }

    /** AC-07: settlement is explicit, idempotent, unique, positive, and immutable. */
    @Transactional
    public ClaimResponse settle(UUID id, String actor) {
        Claim claim = claim(id);
        Optional<Settlement> existing = settlements.findByClaimId(claim.getId());
        if (existing.isPresent()) {
            if (claim.getStatus() != ClaimStatus.SETTLED)
                throw new InvalidClaimStateException("Settlement evidence exists for a non-settled projection");
            return response(claim);
        }
        ClaimStatus from = claim.getStatus();
        claim.settled();
        Settlement settlement = new Settlement(UUID.randomUUID(), claim.getId(),
            "PAY-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(), claim.getAssessedAmount());
        settlements.save(settlement);
        transition(claim, from, claim.getStatus(), actor);
        audit(claim, actor, "SETTLEMENT_CREATED", settlement.getPayoutReference());
        return response(claims.save(claim));
    }

    /** AC-08: the original becomes REOPENED and a separate FILED child carries reconsideration. */
    @Transactional
    public ClaimResponse reopen(UUID id, ReopenRequest request, String actor, boolean admin) {
        Claim original = claim(id); authorize(original, actor, admin);
        ClaimStatus from = original.getStatus();
        original.reopen(request.reason());
        transition(original, from, original.getStatus(), actor);
        claims.save(original);
        Claim child = new Claim(UUID.randomUUID(), nextClaimNumber(), original.getPolicyNumber(), original.getPolicyVersion(),
            original.getId(), original.getCustomerUsername(), original.getType(), original.getIncidentDate(),
            original.getClaimedAmount(), "Dispute sub-claim", original.getDocumentTypes());
        claims.save(child);
        audit(original, actor, "CLAIM_REOPENED", "Linked sub-claim " + child.getClaimNumber());
        audit(child, actor, "SUBCLAIM_FILED", "Parent " + original.getClaimNumber());
        return response(child);
    }

    @Transactional(readOnly = true) public ClaimResponse get(UUID id, String user, boolean admin) { Claim c = claim(id); authorize(c, user, admin); return response(c); }
    @Transactional(readOnly = true) public List<ClaimResponse> mine(String user) { return claims.findByCustomerUsernameOrderByCreatedAtDesc(user).stream().map(this::response).toList(); }
    @Transactional(readOnly = true) public List<ClaimResponse> all() { return claims.findAll().stream().map(this::response).toList(); }
    @Transactional(readOnly = true) public List<ClaimResponse> assessorQueue() {
        return claims.findByStatusInOrderByCreatedAtAsc(List.of(ClaimStatus.FILED, ClaimStatus.UNDER_REVIEW, ClaimStatus.MANUAL_REVIEW)).stream().map(this::response).toList();
    }
    @Transactional(readOnly = true) public DashboardResponse dashboard() {
        List<Claim> allClaims = claims.findAll();
        Map<String,Long> byStatus = new LinkedHashMap<>();
        for (ClaimStatus status : ClaimStatus.values()) {
            byStatus.put(status.name(), allClaims.stream().filter(claim -> claim.getStatus() == status).count());
        }
        Map<String,Long> byProduct = new LinkedHashMap<>();
        for (ClaimType type : ClaimType.values()) {
            byProduct.put(type.name(), allClaims.stream().filter(claim -> claim.getType() == type).count());
        }
        long fraudAlerts = allClaims.stream()
            .filter(claim -> claim.getFraudScore() >= 50 || claim.getStatus() == ClaimStatus.MANUAL_REVIEW)
            .count();
        BigDecimal totalSettledPayout = settlements.findAll().stream()
            .map(Settlement::getAmount)
            .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        return new DashboardResponse(
            allClaims.size(), byStatus, byProduct,
            byStatus.get(ClaimStatus.MANUAL_REVIEW.name()), fraudAlerts,
            byStatus.get(ClaimStatus.SETTLED.name()), totalSettledPayout
        );
    }

    private String decisionComment(DecisionPolicy.DecisionResult result, Set<String> missing) {
        return missing.isEmpty() ? result.reasonCode().name() : result.reasonCode() + ": " + String.join(",", missing);
    }
    private Map<String,DocumentVerificationRecord> latestDocumentEvidence(UUID claimId) {
        Map<String,DocumentVerificationRecord> result = new HashMap<>();
        for (DocumentVerificationRecord record : documentEvidence.findByClaimIdOrderByOccurredAtAsc(claimId)) result.put(record.getDocumentType(), record);
        return result;
    }
    private ClaimResponse response(Claim c) {
        return ClaimResponse.from(c, settlements.findByClaimId(c.getId()).orElse(null), audits.findByClaimIdOrderByOccurredAtAsc(c.getId()),
            documentEvidence.findByClaimIdOrderByOccurredAtAsc(c.getId()), fraudEvidence.findByClaimIdOrderByOccurredAtAsc(c.getId()),
            assessmentEvidence.findByClaimIdOrderByOccurredAtAsc(c.getId()), decisionEvidence.findByClaimIdOrderByOccurredAtAsc(c.getId()),
            transitions.findByClaimIdOrderByOccurredAtAsc(c.getId()));
    }
    private String nextClaimNumber() { return "CLM-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(); }
    private Claim claim(UUID id) { return claims.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found")); }
    private Policy policy(String id) { return policies.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy not found")); }
    private void authorize(Claim c, String user, boolean admin) { if (!admin && !c.getCustomerUsername().equals(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your claim"); }
    private void audit(Claim c, String actor, String action, String detail) { audits.save(new AuditEvent(c.getId(), actor, action, detail)); }
    private void transition(Claim c, ClaimStatus from, ClaimStatus to, String actor) { transitions.save(new ClaimTransitionRecord(c.getId(), from, to, actor)); }
}
