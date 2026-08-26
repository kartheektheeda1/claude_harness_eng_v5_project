package com.claimflow.api;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class AdminOverrideIntegrationTest {
    // AC-09
    @Test void overrideEvidenceDoesNotReplaceTheAutomaticDecision() {
        UUID claimId = UUID.randomUUID();
        DecisionRecord automatic = new DecisionRecord(claimId, Decision.REJECT, DecisionReasonCode.ZERO_PAYABLE_AMOUNT,
            "zero payable", 3, "system", false);
        DecisionRecord override = new DecisionRecord(claimId, Decision.MANUAL_REVIEW, DecisionReasonCode.ADMIN_EVIDENCE_CORRECTION,
            "Synthetic corrected evidence", 3, "admin", true);
        List<DecisionRecord> history = List.of(automatic, override);
        assertThat(history).hasSize(2);
        assertThat(history.get(0).isAdministrativeOverride()).isFalse();
        assertThat(history.get(1).getActor()).isEqualTo("admin");
    }
}
