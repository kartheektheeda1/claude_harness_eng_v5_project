package com.claimflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fraud_screening_records")
public class FraudScreeningRecord {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Column(nullable = false) private int score;
    @Column(nullable = false) private int reviewThreshold;
    @Column(nullable = false) private int rejectThreshold;
    @Column(nullable = false) private int policyVersion;
    @Column(nullable = false, length = 500) private String matchedRuleCodes;
    @Column(nullable = false) private boolean flagged;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected FraudScreeningRecord() {}
    public FraudScreeningRecord(UUID claimId, int score, int review, int reject, int policyVersion, String rules) {
        this.id = UUID.randomUUID(); this.claimId = claimId; this.score = score; this.reviewThreshold = review;
        this.rejectThreshold = reject; this.policyVersion = policyVersion; this.matchedRuleCodes = rules;
        this.flagged = score >= review; this.occurredAt = Instant.now();
    }
    @PreUpdate @PreRemove void appendOnly() { throw new IllegalStateException("Fraud evidence is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public int getScore() { return score; }
    public int getReviewThreshold() { return reviewThreshold; } public int getRejectThreshold() { return rejectThreshold; }
    public int getPolicyVersion() { return policyVersion; } public String getMatchedRuleCodes() { return matchedRuleCodes; }
    public boolean isFlagged() { return flagged; } public Instant getOccurredAt() { return occurredAt; }
}
