package com.claimflow.api;

import com.claimflow.domain.AuditEvent;
import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(
    UUID id,
    UUID claimId,
    String actor,
    String action,
    String detail,
    Instant occurredAt
) {
    static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(
            event.getId(),
            event.getClaimId(),
            event.getActor(),
            event.getAction(),
            event.getDetail(),
            event.getOccurredAt()
        );
    }
}
