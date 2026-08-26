package com.claimflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_verification_records")
public class DocumentVerificationRecord {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Column(nullable = false, length = 80) private String documentType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private DocumentOutcome outcome;
    @Column(nullable = false, length = 250) private String reason;
    @Column(nullable = false, length = 80) private String actor;
    @Column(nullable = false, updatable = false) private Instant occurredAt;
    protected DocumentVerificationRecord() {}
    public DocumentVerificationRecord(UUID claimId, String documentType, DocumentOutcome outcome, String reason, String actor) {
        this.id = UUID.randomUUID(); this.claimId = claimId; this.documentType = documentType;
        this.outcome = outcome; this.reason = reason; this.actor = actor; this.occurredAt = Instant.now();
    }
    @PreUpdate @PreRemove void appendOnly() { throw new IllegalStateException("Document verification evidence is append-only"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public String getDocumentType() { return documentType; }
    public DocumentOutcome getOutcome() { return outcome; } public String getReason() { return reason; } public String getActor() { return actor; }
    public Instant getOccurredAt() { return occurredAt; }
}
