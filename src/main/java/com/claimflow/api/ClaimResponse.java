package com.claimflow.api;

import com.claimflow.domain.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public record ClaimResponse(UUID id, String claimNumber, String policyNumber, int policyVersion, UUID parentClaimId, String customerUsername, ClaimType type,
    LocalDate incidentDate, BigDecimal claimedAmount, String description, Set<String> documentTypes,
    VerificationStatus verificationStatus, int fraudScore, BigDecimal assessedAmount, Decision decision,
    DecisionReasonCode decisionReasonCode, String decisionReason, ClaimStatus status, int reopenCount, Instant createdAt, Instant updatedAt,
    SettlementResponse settlement, List<AuditEventResponse> auditTrail,
    List<EvidenceResponse.Document> documentEvidence, List<EvidenceResponse.Fraud> fraudEvidence,
    List<EvidenceResponse.Assessment> assessmentEvidence, List<EvidenceResponse.DecisionEvidence> decisionEvidence,
    List<EvidenceResponse.Transition> transitionHistory) {
    public static ClaimResponse from(Claim c, Settlement settlement, List<AuditEvent> audit,
                                     List<DocumentVerificationRecord> documents, List<FraudScreeningRecord> fraud,
                                     List<AssessmentRecord> assessments, List<DecisionRecord> decisions,
                                     List<ClaimTransitionRecord> transitions) {
        return new ClaimResponse(c.getId(), c.getClaimNumber(), c.getPolicyNumber(), c.getPolicyVersion(), c.getParentClaimId(), c.getCustomerUsername(), c.getType(),
            c.getIncidentDate(), c.getClaimedAmount(), c.getDescription(), c.getDocumentTypes(), c.getVerificationStatus(),
            c.getFraudScore(), c.getAssessedAmount(), c.getDecision(), c.getDecisionReasonCode(), c.getDecisionReason(), c.getStatus(), c.getReopenCount(),
            c.getCreatedAt(), c.getUpdatedAt(), SettlementResponse.from(settlement),
            audit.stream().map(AuditEventResponse::from).toList(), documents.stream().map(EvidenceResponse.Document::from).toList(),
            fraud.stream().map(EvidenceResponse.Fraud::from).toList(), assessments.stream().map(EvidenceResponse.Assessment::from).toList(),
            decisions.stream().map(EvidenceResponse.DecisionEvidence::from).toList(), transitions.stream().map(EvidenceResponse.Transition::from).toList());
    }
}
