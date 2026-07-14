package com.claimflow.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "settlements")
public class Settlement {
    @Id private UUID id;
    @Column(nullable = false) private UUID claimId;
    @Column(nullable = false, unique = true, length = 40) private String payoutReference;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal amount;
    @Column(nullable = false, length = 30) private String paymentStatus;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    protected Settlement() {}
    public Settlement(UUID id, UUID claimId, String reference, BigDecimal amount) { this.id = id; this.claimId = claimId; this.payoutReference = reference; this.amount = amount.setScale(2, RoundingMode.HALF_UP); this.paymentStatus = "PAYMENT_STUB_CREATED"; this.createdAt = Instant.now(); }
    @PreUpdate void immutable() { throw new IllegalStateException("Settlement records are immutable"); }
    public UUID getId() { return id; } public UUID getClaimId() { return claimId; } public String getPayoutReference() { return payoutReference; }
    public BigDecimal getAmount() { return amount; } public String getPaymentStatus() { return paymentStatus; } public Instant getCreatedAt() { return createdAt; }
}
