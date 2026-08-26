package com.claimflow.service;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class FraudScreeningPolicyTest {
    private final FraudScreeningPolicy policy = new FraudScreeningPolicy();
    // AC-04
    @Test void highRatioShortNarrativeAndMissingDocumentRulesAreCappedAndStable() {
        Claim claim = claim("short", "900.00", null);
        var result = policy.evaluate(claim, policyVersion(), Set.of("POLICE_FIR"));
        assertThat(result.score()).isEqualTo(65);
        assertThat(policy.evaluate(claim, policyVersion(), Set.of("POLICE_FIR"))).isEqualTo(result);
    }
    @Test void linkedReopenedClaimAddsTheReopenedRule() {
        Claim claim = claim("A sufficiently detailed synthetic narrative for deterministic testing", "100.00", UUID.randomUUID());
        assertThat(policy.evaluate(claim, policyVersion(), Set.of()).ruleCodes()).contains("REOPENED_CLAIM");
    }
    @Test void exactPolicyThresholdIsFlagged() {
        Claim claim = claim("short", "100.00", UUID.randomUUID());
        var result = policy.evaluate(claim, policyVersion(), Set.of("POLICE_FIR"));
        assertThat(result.score()).isEqualTo(55); assertThat(result.flagged()).isTrue();
    }
    private Claim claim(String text, String amount, UUID parent) { return new Claim(UUID.randomUUID(), "CLM-F", "P-F", 9, parent,
        "customer", ClaimType.MOTOR, LocalDate.now(), new BigDecimal(amount), text, Set.of()); }
    private Policy policyVersion() {
        Policy value = new Policy(); ReflectionTestUtils.setField(value, "sumInsured", new BigDecimal("1000.00"));
        ReflectionTestUtils.setField(value, "policyVersion", 9); ReflectionTestUtils.setField(value, "fraudReviewThreshold", 50);
        ReflectionTestUtils.setField(value, "fraudRejectThreshold", 80); return value;
    }
}
