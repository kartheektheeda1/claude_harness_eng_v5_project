package com.claimflow.api;
import java.math.BigDecimal;
import java.util.Map;
public record DashboardResponse(
    long totalClaims,
    Map<String, Long> byStatus,
    Map<String, Long> byProduct,
    long openReviews,
    long fraudAlerts,
    long settledClaims,
    BigDecimal totalSettledPayout
) {}
