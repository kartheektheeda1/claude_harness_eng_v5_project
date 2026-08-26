package com.claimflow.service;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class ClaimRulesTest {
    private final DocumentChecklistPolicy checklists = new DocumentChecklistPolicy();
    private final PayoutCalculator payouts = new PayoutCalculator();
    private final FraudScreeningPolicy fraud = new FraudScreeningPolicy();
    private final DecisionPolicy decisions = new DecisionPolicy();

    // AC-03
    @Test void exactDocumentChecklistsMatchTheBusinessCase() {
        assertThat(checklists.requiredDocuments(ClaimType.MOTOR)).containsExactlyInAnyOrder("POLICE_FIR", "REPAIR_INVOICE");
        assertThat(checklists.requiredDocuments(ClaimType.HEALTH)).containsExactlyInAnyOrder("HOSPITAL_BILL", "DISCHARGE_SUMMARY");
        assertThat(checklists.requiredDocuments(ClaimType.LIFE)).containsExactly("DEATH_CERTIFICATE");
    }

    // AC-05 / NFR-01
    @ParameterizedTest
    @CsvSource({"90000.00,80000.00,5000.00,10.00,67500.00", "1000.00,80000.00,5000.00,0.00,0.00", "100.005,1000.00,0.00,0.00,100.01"})
    void payableUsesCapDeductibleCopayAndExplicitRounding(String claim, String insured, String deductible, String copay, String expected) {
        assertThat(payouts.calculate(bd(claim), bd(insured), bd(deductible), bd(copay))).isEqualByComparingTo(expected);
    }

    // AC-04
    @Test void fraudScreeningIsDeterministicAndVersioned() {
        Claim claim = claim("short", new BigDecimal("900.00"), Set.of());
        Policy policy = policy("1000.00", 7, 40, 75);
        var first = fraud.evaluate(claim, policy, Set.of("POLICE_FIR"));
        var second = fraud.evaluate(claim, policy, Set.of("POLICE_FIR"));
        assertThat(first).isEqualTo(second);
        assertThat(first.score()).isEqualTo(65);
        assertThat(first.policyVersion()).isEqualTo(7);
        assertThat(first.ruleCodes()).contains("HIGH_CLAIM_TO_LIMIT_RATIO", "SHORT_NARRATIVE", "MISSING_REQUIRED_DOCUMENTS");
    }

    // AC-06
    @ParameterizedTest
    @CsvSource({"VERIFIED,49,100.00,AUTO_APPROVE,ELIGIBLE_FOR_AUTOMATIC_APPROVAL", "VERIFIED,50,100.00,MANUAL_REVIEW,FRAUD_THRESHOLD_REVIEW", "VERIFIED,80,100.00,REJECT,FRAUD_THRESHOLD_REJECT", "MISSING_DOCUMENTS,0,100.00,MANUAL_REVIEW,DOCUMENTS_REQUIRE_REVIEW", "VERIFIED,0,0.00,REJECT,ZERO_PAYABLE_AMOUNT"})
    void decisionIsReasonCodedAtExactBoundaries(VerificationStatus verification, int score, String amount, Decision expected, DecisionReasonCode code) {
        var result = decisions.decide(verification, score, 50, 80, bd(amount), 3);
        assertThat(result.decision()).isEqualTo(expected);
        assertThat(result.reasonCode()).isEqualTo(code);
        assertThat(result.policyVersion()).isEqualTo(3);
    }

    private BigDecimal bd(String value) { return new BigDecimal(value); }
    private Claim claim(String description, BigDecimal amount, Set<String> docs) {
        return new Claim(UUID.randomUUID(), "CLM-RULE", "P-RULE", 7, null, "customer", ClaimType.MOTOR,
            LocalDate.now(), amount, description, docs);
    }
    private Policy policy(String insured, int version, int review, int reject) {
        Policy policy = new Policy();
        ReflectionTestUtils.setField(policy, "sumInsured", bd(insured));
        ReflectionTestUtils.setField(policy, "policyVersion", version);
        ReflectionTestUtils.setField(policy, "fraudReviewThreshold", review);
        ReflectionTestUtils.setField(policy, "fraudRejectThreshold", reject);
        return policy;
    }
}
