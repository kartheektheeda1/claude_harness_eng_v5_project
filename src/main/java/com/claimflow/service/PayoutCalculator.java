package com.claimflow.service;

import org.springframework.stereotype.Component;
import java.math.*;

@Component
public class PayoutCalculator {
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    public BigDecimal calculate(BigDecimal claimed, BigDecimal sumInsured, BigDecimal deductible, BigDecimal coPayPercent) {
        BigDecimal eligible = claimed.min(sumInsured);
        BigDecimal afterDeductible = eligible.subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal coPay = afterDeductible.multiply(coPayPercent).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        return afterDeductible.subtract(coPay).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
}
