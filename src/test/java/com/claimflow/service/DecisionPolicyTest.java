package com.claimflow.service;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;

class DecisionPolicyTest {
    private final DecisionPolicy policy = new DecisionPolicy();
    // AC-06
    @Test void automaticApprovalCarriesPolicyVersionAndStableReasonCode() {
        var result = policy.decide(VerificationStatus.VERIFIED, 49, 50, 80, new BigDecimal("1.00"), 12);
        assertThat(result.decision()).isEqualTo(Decision.AUTO_APPROVE);
        assertThat(result.reasonCode()).isEqualTo(DecisionReasonCode.ELIGIBLE_FOR_AUTOMATIC_APPROVAL);
        assertThat(result.policyVersion()).isEqualTo(12);
    }
    @Test void rejectionThresholdWinsAtExactBoundary() {
        var result = policy.decide(VerificationStatus.VERIFIED, 80, 50, 80, new BigDecimal("1.00"), 12);
        assertThat(result.reasonCode()).isEqualTo(DecisionReasonCode.FRAUD_THRESHOLD_REJECT);
    }
}
