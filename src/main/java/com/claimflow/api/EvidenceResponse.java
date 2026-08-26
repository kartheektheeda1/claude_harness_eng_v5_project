package com.claimflow.api;
import com.claimflow.domain.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class EvidenceResponse {
    private EvidenceResponse() {}
    public record Document(UUID id, String documentType, DocumentOutcome outcome, String reason, String actor, Instant occurredAt) {
        public static Document from(DocumentVerificationRecord value) { return new Document(value.getId(), value.getDocumentType(), value.getOutcome(), value.getReason(), value.getActor(), value.getOccurredAt()); }
    }
    public record Fraud(UUID id, int score, int reviewThreshold, int rejectThreshold, int policyVersion, String matchedRuleCodes, boolean flagged, Instant occurredAt) {
        public static Fraud from(FraudScreeningRecord value) { return new Fraud(value.getId(), value.getScore(), value.getReviewThreshold(), value.getRejectThreshold(), value.getPolicyVersion(), value.getMatchedRuleCodes(), value.isFlagged(), value.getOccurredAt()); }
    }
    public record Assessment(UUID id, BigDecimal payableAmount, int policyVersion, Instant occurredAt) {
        public static Assessment from(AssessmentRecord value) { return new Assessment(value.getId(), value.getPayableAmount(), value.getPolicyVersion(), value.getOccurredAt()); }
    }
    public record DecisionEvidence(UUID id, Decision decision, DecisionReasonCode reasonCode, String comment, int policyVersion, String actor, boolean administrativeOverride, Instant occurredAt) {
        public static DecisionEvidence from(DecisionRecord value) { return new DecisionEvidence(value.getId(), value.getDecision(), value.getReasonCode(), value.getComment(), value.getPolicyVersion(), value.getActor(), value.isAdministrativeOverride(), value.getOccurredAt()); }
    }
    public record Transition(UUID id, ClaimStatus fromStatus, ClaimStatus toStatus, String actor, Instant occurredAt) {
        public static Transition from(ClaimTransitionRecord value) { return new Transition(value.getId(), value.getFromStatus(), value.getToStatus(), value.getActor(), value.getOccurredAt()); }
    }
}
