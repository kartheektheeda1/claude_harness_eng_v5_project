package com.claimflow.api;
import java.util.Map;
public record DashboardResponse(long totalClaims, Map<String, Long> byStatus, long openReviews, long settledClaims) {}
