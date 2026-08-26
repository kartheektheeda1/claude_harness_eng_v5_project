package com.claimflow.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "claims")
public class Claim {
    @Id private UUID id;
    @Column(nullable = false, unique = true, length = 30) private String claimNumber;
    @Column(nullable = false, length = 30) private String policyNumber;
    @Column(nullable = false) private int policyVersion;
    @Column private UUID parentClaimId;
    @Column(nullable = false, length = 80) private String customerUsername;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ClaimType type;
    @Column(nullable = false) private LocalDate incidentDate;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal claimedAmount;
    @Column(nullable = false, length = 1000) private String description;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "claim_documents", joinColumns = @JoinColumn(name = "claim_id"))
    @Column(name = "document_type", length = 50) private Set<String> documentTypes = new LinkedHashSet<>();
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private VerificationStatus verificationStatus;
    @Column(nullable = false) private int fraudScore;
    @Column(precision = 15, scale = 2) private BigDecimal assessedAmount;
    @Enumerated(EnumType.STRING) @Column(length = 30) private Decision decision;
    @Column(length = 500) private String decisionReason;
    @Enumerated(EnumType.STRING) @Column(length = 80) private DecisionReasonCode decisionReasonCode;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private ClaimStatus status;
    @Column(nullable = false) private int reopenCount;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @Version private long version;

    protected Claim() {}
    public Claim(UUID id, String number, String policyNumber, String user, ClaimType type, LocalDate incidentDate, BigDecimal amount, String description, Set<String> documents) {
        this(id, number, policyNumber, 1, null, user, type, incidentDate, amount, description, documents);
    }
    public Claim(UUID id, String number, String policyNumber, int policyVersion, UUID parentClaimId, String user, ClaimType type, LocalDate incidentDate, BigDecimal amount, String description, Set<String> documents) {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(amount, "claimed amount is required");
        this.id = id; this.claimNumber = number; this.policyNumber = policyNumber; this.policyVersion = policyVersion;
        this.parentClaimId = parentClaimId; this.customerUsername = user;
        this.type = type; this.incidentDate = incidentDate; this.claimedAmount = money(amount); this.description = description;
        this.documentTypes.addAll(documents == null ? Set.of() : documents); this.verificationStatus = VerificationStatus.PENDING; this.status = ClaimStatus.FILED;
        this.createdAt = Instant.now(); this.updatedAt = createdAt;
    }
    @PreUpdate void touch() { updatedAt = Instant.now(); }
    public void beginReview() {
        requireStatus(ClaimStatus.FILED);
        status = ClaimStatus.UNDER_REVIEW;
    }
    public void documentsVerified(boolean complete) {
        requireStatus(ClaimStatus.UNDER_REVIEW);
        verificationStatus = complete ? VerificationStatus.VERIFIED : VerificationStatus.MISSING_DOCUMENTS;
    }
    /** Compatibility alias retained for generated clients; the domain transition is still enforced here. */
    public void policyValidated() { beginReview(); }
    public void screened(int score) {
        requireStatus(ClaimStatus.UNDER_REVIEW);
        if (score < 0 || score > 100) throw new IllegalArgumentException("Fraud score must be between 0 and 100");
        fraudScore = score;
    }
    public void assessed(BigDecimal amount) {
        requireStatus(ClaimStatus.UNDER_REVIEW);
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("Assessed amount cannot be negative");
        }
        assessedAmount = money(amount);
    }
    public void decide(Decision value, DecisionReasonCode reasonCode, String reason) {
        Objects.requireNonNull(value, "decision is required");
        Objects.requireNonNull(reasonCode, "reason code is required");
        if (!EnumSet.of(ClaimStatus.UNDER_REVIEW, ClaimStatus.MANUAL_REVIEW, ClaimStatus.APPROVED, ClaimStatus.REJECTED).contains(status))
            throw new InvalidClaimStateException("Claim cannot be decided from " + status);
        decision = value; decisionReasonCode = reasonCode; decisionReason = reason;
        status = switch (value) { case AUTO_APPROVE -> ClaimStatus.APPROVED; case MANUAL_REVIEW -> ClaimStatus.MANUAL_REVIEW; case REJECT -> ClaimStatus.REJECTED; };
    }
    public void decide(Decision value, String reason) { decide(value, defaultReason(value), reason); }
    public void settled() {
        if (status != ClaimStatus.APPROVED || decision != Decision.AUTO_APPROVE)
            throw new InvalidClaimStateException("Only an approved claim can settle");
        if (assessedAmount == null || assessedAmount.signum() <= 0)
            throw new InvalidClaimStateException("Settlement requires a positive assessed amount");
        status = ClaimStatus.SETTLED;
    }
    public void reopen(String reason) {
        if (status != ClaimStatus.SETTLED && status != ClaimStatus.REJECTED)
            throw new InvalidClaimStateException("Only settled or rejected claims can be reopened");
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Dispute reason is required");
        reopenCount++; status = ClaimStatus.REOPENED; decisionReason = reason;
    }
    private static DecisionReasonCode defaultReason(Decision value) { return switch (value) {
        case AUTO_APPROVE -> DecisionReasonCode.ELIGIBLE_FOR_AUTOMATIC_APPROVAL;
        case MANUAL_REVIEW -> DecisionReasonCode.FRAUD_THRESHOLD_REVIEW;
        case REJECT -> DecisionReasonCode.FRAUD_THRESHOLD_REJECT;
    }; }
    private void requireStatus(ClaimStatus expected) { if (status != expected) throw new InvalidClaimStateException("Expected claim status " + expected + " but was " + status); }
    private static BigDecimal money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
    public UUID getId() { return id; } public String getClaimNumber() { return claimNumber; } public String getPolicyNumber() { return policyNumber; }
    public int getPolicyVersion() { return policyVersion; } public UUID getParentClaimId() { return parentClaimId; }
    public String getCustomerUsername() { return customerUsername; } public ClaimType getType() { return type; } public LocalDate getIncidentDate() { return incidentDate; }
    public BigDecimal getClaimedAmount() { return claimedAmount; } public String getDescription() { return description; } public Set<String> getDocumentTypes() { return Collections.unmodifiableSet(documentTypes); }
    public VerificationStatus getVerificationStatus() { return verificationStatus; } public int getFraudScore() { return fraudScore; } public BigDecimal getAssessedAmount() { return assessedAmount; }
    public Decision getDecision() { return decision; } public DecisionReasonCode getDecisionReasonCode() { return decisionReasonCode; } public String getDecisionReason() { return decisionReason; } public ClaimStatus getStatus() { return status; }
    public int getReopenCount() { return reopenCount; } public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
}
