package com.claimflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "decision_records")
public class DecisionRecord {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private Decision decision;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 80) private DecisionReasonCode reasonCode;
    @Column(nullable = false, length = 500) private String comment;
    @Column(nullable = false) private int policyVersion;
    @Column(nullable = false, length = 80) private String actor;
    @Column(nullable = false) private boolean administrativeOverride;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected DecisionRecord() {}
    public DecisionRecord(UUID claimId, Decision decision, DecisionReasonCode reasonCode, String comment, int policyVersion, String actor, boolean override) {
        this.id = UUID.randomUUID(); this.claimId = claimId; this.decision = decision; this.reasonCode = reasonCode;
        this.comment = comment; this.policyVersion = policyVersion; this.actor = actor;
        this.administrativeOverride = override; this.occurredAt = Instant.now();
    }
    @PreUpdate @PreRemove void appendOnly() { throw new IllegalStateException("Decision evidence is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public Decision getDecision() { return decision; }
    public DecisionReasonCode getReasonCode() { return reasonCode; } public String getComment() { return comment; }
    public int getPolicyVersion() { return policyVersion; } public String getActor() { return actor; }
    public boolean isAdministrativeOverride() { return administrativeOverride; } public Instant getOccurredAt() { return occurredAt; }
}
