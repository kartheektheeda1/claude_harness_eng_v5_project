package com.claimflow.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;

class PayoutCalculatorTest {
    private final PayoutCalculator calculator = new PayoutCalculator();
    // AC-05 / NFR-01
    @Test void insuredCapIsAppliedBeforeDeductibleAndCopay() { assertThat(calculate("120000", "80000", "5000", "10")).isEqualByComparingTo("67500.00"); }
    @Test void deductibleCannotCreateANegativePayout() { assertThat(calculate("1000", "80000", "5000", "0")).isEqualByComparingTo("0.00"); }
    @Test void midpointUsesExplicitHalfUpRounding() { assertThat(calculate("100.005", "1000", "0", "0")).isEqualByComparingTo("100.01"); }
    private BigDecimal calculate(String a, String b, String c, String d) { return calculator.calculate(new BigDecimal(a), new BigDecimal(b), new BigDecimal(c), new BigDecimal(d)); }
}
