package com.claimflow.api;

import com.claimflow.domain.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public record ClaimResponse(UUID id, String claimNumber, String policyNumber, String customerUsername, ClaimType type,
    LocalDate incidentDate, BigDecimal claimedAmount, String description, Set<String> documentTypes,
    VerificationStatus verificationStatus, int fraudScore, BigDecimal assessedAmount, Decision decision,
    String decisionReason, ClaimStatus status, int reopenCount, Instant createdAt, Instant updatedAt,
    Settlement settlement, List<AuditEvent> auditTrail) {
    public static ClaimResponse from(Claim c, Settlement settlement, List<AuditEvent> audit) {
        return new ClaimResponse(c.getId(), c.getClaimNumber(), c.getPolicyNumber(), c.getCustomerUsername(), c.getType(),
            c.getIncidentDate(), c.getClaimedAmount(), c.getDescription(), c.getDocumentTypes(), c.getVerificationStatus(),
            c.getFraudScore(), c.getAssessedAmount(), c.getDecision(), c.getDecisionReason(), c.getStatus(), c.getReopenCount(),
            c.getCreatedAt(), c.getUpdatedAt(), settlement, audit);
    }
}
