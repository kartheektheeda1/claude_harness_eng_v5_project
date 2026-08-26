package com.claimflow.domain;

import jakarta.persistence.*;
import java.math.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_records")
public class AssessmentRecord {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal payableAmount;
    @Column(nullable = false) private int policyVersion;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected AssessmentRecord() {}
    public AssessmentRecord(UUID claimId, BigDecimal amount, int policyVersion) {
        this.id = UUID.randomUUID(); this.claimId = claimId; this.payableAmount = amount.setScale(2, RoundingMode.HALF_UP);
        this.policyVersion = policyVersion; this.occurredAt = Instant.now();
    }
    @PreUpdate @PreRemove void appendOnly() { throw new IllegalStateException("Assessment evidence is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public BigDecimal getPayableAmount() { return payableAmount; }
    public int getPolicyVersion() { return policyVersion; } public Instant getOccurredAt() { return occurredAt; }
}
