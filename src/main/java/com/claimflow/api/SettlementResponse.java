package com.claimflow.api;

import com.claimflow.domain.Settlement;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SettlementResponse(
    UUID id,
    UUID claimId,
    String payoutReference,
    BigDecimal amount,
    String paymentStatus,
    Instant createdAt
) {
    static SettlementResponse from(Settlement settlement) {
        if (settlement == null) {
            return null;
        }
        return new SettlementResponse(
            settlement.getId(),
            settlement.getClaimId(),
            settlement.getPayoutReference(),
            settlement.getAmount(),
            settlement.getPaymentStatus(),
            settlement.getCreatedAt()
        );
    }
}
