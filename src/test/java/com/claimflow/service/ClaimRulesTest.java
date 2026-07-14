package com.claimflow.service;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class ClaimRulesTest {
    private final ClaimRules rules = new ClaimRules(50, 80);
    @Test void calculatesPayableUsingFixedPointDeductibleAndCopay() {
        Claim claim = new Claim(UUID.randomUUID(), "CLM-1", "P-1", "customer", ClaimType.HEALTH, LocalDate.now(), new BigDecimal("90000.00"), "A sufficiently detailed synthetic claim description", Set.of());
        Policy policy = new Policy(); ReflectionTestUtils.setField(policy, "sumInsured", new BigDecimal("80000.00")); ReflectionTestUtils.setField(policy, "deductible", new BigDecimal("5000.00")); ReflectionTestUtils.setField(policy, "coPayPercent", new BigDecimal("10.00"));
        assertThat(rules.assess(claim, policy)).isEqualByComparingTo("67500.00");
    }
    @Test void listsClaimSpecificRequiredDocuments() { assertThat(rules.requiredDocuments(ClaimType.MOTOR)).containsExactlyInAnyOrder("POLICE_REPORT", "DAMAGE_PHOTOS", "DRIVING_LICENSE"); }
}
