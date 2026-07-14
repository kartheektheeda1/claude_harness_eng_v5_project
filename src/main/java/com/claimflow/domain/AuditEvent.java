package com.claimflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Column(nullable = false, length = 80) private String actor;
    @Column(nullable = false, length = 80) private String action;
    @Column(nullable = false, length = 1000) private String detail;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected AuditEvent() {}
    public AuditEvent(UUID claimId, String actor, String action, String detail) { this.id = UUID.randomUUID(); this.claimId = claimId; this.actor = actor; this.action = action; this.detail = detail; this.occurredAt = Instant.now(); }
    @PreUpdate void appendOnly() { throw new IllegalStateException("Audit history is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public String getActor() { return actor; }
    public String getAction() { return action; } public String getDetail() { return detail; } public Instant getOccurredAt() { return occurredAt; }
}
