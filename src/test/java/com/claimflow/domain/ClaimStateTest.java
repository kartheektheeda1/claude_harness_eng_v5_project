package com.claimflow.domain;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ClaimStateTest {
    // AC-10
    @Test void aNewClaimStartsFiledAndCanEnterReviewOnlyOnce() {
        Claim claim = claim();
        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.FILED);
        claim.beginReview();
        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.UNDER_REVIEW);
        assertThatThrownBy(claim::beginReview).isInstanceOf(InvalidClaimStateException.class);
    }
    @Test void assessmentCannotBypassUnderReview() {
        assertThatThrownBy(() -> claim().assessed(new BigDecimal("100.00")))
            .isInstanceOf(InvalidClaimStateException.class).hasMessageContaining("UNDER_REVIEW");
    }
    @Test void validAutomaticApprovalCanSettle() {
        Claim claim = reviewed();
        claim.documentsVerified(true); claim.screened(10); claim.assessed(new BigDecimal("100.005"));
        claim.decide(Decision.AUTO_APPROVE, DecisionReasonCode.ELIGIBLE_FOR_AUTOMATIC_APPROVAL, "eligible");
        claim.settled();
        assertThat(claim.getAssessedAmount()).isEqualByComparingTo("100.01");
        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.SETTLED);
    }
    @Test void settlementRejectsNonApprovedAndZeroPayableClaims() {
        assertThatThrownBy(claim()::settled).isInstanceOf(InvalidClaimStateException.class);
        Claim zero = reviewed(); zero.documentsVerified(true); zero.screened(0); zero.assessed(BigDecimal.ZERO);
        zero.decide(Decision.AUTO_APPROVE, DecisionReasonCode.ELIGIBLE_FOR_AUTOMATIC_APPROVAL, "invalid setup");
        assertThatThrownBy(zero::settled).isInstanceOf(InvalidClaimStateException.class).hasMessageContaining("positive");
    }
    @Test void onlySettledOrRejectedClaimsCanReopen() {
        assertThatThrownBy(() -> claim().reopen("new evidence")).isInstanceOf(InvalidClaimStateException.class);
        Claim rejected = reviewed(); rejected.documentsVerified(false); rejected.screened(80); rejected.assessed(new BigDecimal("10"));
        rejected.decide(Decision.REJECT, DecisionReasonCode.FRAUD_THRESHOLD_REJECT, "risk"); rejected.reopen("new evidence");
        assertThat(rejected.getStatus()).isEqualTo(ClaimStatus.REOPENED);
    }
    @Test void blankDisputeReasonIsRejected() {
        Claim rejected = reviewed(); rejected.documentsVerified(false); rejected.screened(80); rejected.assessed(new BigDecimal("10"));
        rejected.decide(Decision.REJECT, DecisionReasonCode.FRAUD_THRESHOLD_REJECT, "risk");
        assertThatThrownBy(() -> rejected.reopen(" ")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void fraudScoreMustStayWithinPercentageRange() {
        Claim claim = reviewed(); claim.documentsVerified(true);
        assertThatThrownBy(() -> claim.screened(101)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void immutableSettlementConstructorRejectsNonPositivePayout() {
        assertThatThrownBy(() -> new Settlement(UUID.randomUUID(), UUID.randomUUID(), "PAY-1", BigDecimal.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
    private Claim reviewed() { Claim claim = claim(); claim.beginReview(); return claim; }
    private Claim claim() { return new Claim(UUID.randomUUID(), "CLM-1", "P-1", 1, null, "customer", ClaimType.MOTOR,
        LocalDate.now(), new BigDecimal("100.00"), "A detailed synthetic incident description", Set.of("POLICE_FIR", "REPAIR_INVOICE")); }
}
