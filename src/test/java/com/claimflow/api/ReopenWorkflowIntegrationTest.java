package com.claimflow.api;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class ReopenWorkflowIntegrationTest {
    // AC-08
    @Test void subclaimHasIndependentIdentityAndExplicitParentLink() {
        Claim original = originalRejected(); original.reopen("Synthetic corrected evidence");
        Claim child = new Claim(UUID.randomUUID(), "CLM-CHILD", original.getPolicyNumber(), original.getPolicyVersion(), original.getId(),
            original.getCustomerUsername(), original.getType(), original.getIncidentDate(), original.getClaimedAmount(), "Dispute sub-claim", original.getDocumentTypes());
        assertThat(original.getStatus()).isEqualTo(ClaimStatus.REOPENED);
        assertThat(child.getStatus()).isEqualTo(ClaimStatus.FILED);
        assertThat(child.getParentClaimId()).isEqualTo(original.getId());
        assertThat(child.getId()).isNotEqualTo(original.getId());
    }
    private Claim originalRejected() {
        Claim value = new Claim(UUID.randomUUID(), "CLM-PARENT", "P-1", 2, null, "customer", ClaimType.MOTOR,
            LocalDate.now(), new BigDecimal("100.00"), "A detailed synthetic incident", Set.of());
        value.beginReview(); value.documentsVerified(false); value.screened(80); value.assessed(new BigDecimal("10"));
        value.decide(Decision.REJECT, DecisionReasonCode.FRAUD_THRESHOLD_REJECT, "risk"); return value;
    }
}
