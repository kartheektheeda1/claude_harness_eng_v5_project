package com.claimflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "claim_transition_records")
public class ClaimTransitionRecord {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private ClaimStatus fromStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private ClaimStatus toStatus;
    @Column(nullable = false, length = 80) private String actor;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected ClaimTransitionRecord() {}
    public ClaimTransitionRecord(UUID claimId, ClaimStatus from, ClaimStatus to, String actor) {
        this.id = UUID.randomUUID(); this.claimId = claimId; this.fromStatus = from; this.toStatus = to;
        this.actor = actor; this.occurredAt = Instant.now();
    }
    @PreUpdate @PreRemove void appendOnly() { throw new IllegalStateException("Transition history is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public ClaimStatus getFromStatus() { return fromStatus; }
    public ClaimStatus getToStatus() { return toStatus; } public String getActor() { return actor; } public Instant getOccurredAt() { return occurredAt; }
}
