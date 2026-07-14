package com.claimflow.domain;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class ClaimStateTest {
    @Test void settlementRequiresApproval() {
        Claim c = claim();
        assertThatThrownBy(c::settled).isInstanceOf(IllegalStateException.class);
        c.assessed(new BigDecimal("100.00")); c.decide(Decision.AUTO_APPROVE, "ok"); c.settled();
        assertThat(c.getStatus()).isEqualTo(ClaimStatus.SETTLED);
    }
    @Test void onlyTerminalClaimsCanReopen() { assertThatThrownBy(() -> claim().reopen("new evidence")).isInstanceOf(IllegalStateException.class); }
    @Test void workflowEnforcesPolicyDocumentAndFraudOrder() {
        Claim c = claim();
        assertThatThrownBy(() -> c.documentsVerified(true)).isInstanceOf(IllegalStateException.class);
        c.policyValidated();
        c.documentsVerified(true);
        c.screened(10);
        c.assessed(new BigDecimal("100.005"));
        c.decide(Decision.AUTO_APPROVE, "synthetic approval");
        assertThat(c.getStatus()).isEqualTo(ClaimStatus.APPROVED);
        assertThat(c.getAssessedAmount()).isEqualByComparingTo("100.01");
    }
    @Test void settledClaimCannotBeReprocessed() {
        Claim c = claim();
        c.assessed(new BigDecimal("100.00"));
        c.decide(Decision.AUTO_APPROVE, "synthetic approval");
        c.settled();
        assertThatThrownBy(c::policyValidated)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Settled claims");
    }
    @Test void fraudScoreMustStayWithinPercentageRange() {
        Claim c = claim();
        c.policyValidated();
        c.documentsVerified(true);
        assertThatThrownBy(() -> c.screened(101)).isInstanceOf(IllegalArgumentException.class);
    }
    private Claim claim() { return new Claim(UUID.randomUUID(), "CLM-1", "P-1", "customer", ClaimType.MOTOR, LocalDate.now(), new BigDecimal("100.00"), "A detailed synthetic incident description", Set.of()); }
}
