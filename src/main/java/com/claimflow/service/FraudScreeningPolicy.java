package com.claimflow.service;

import com.claimflow.domain.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.*;

@Component
public class FraudScreeningPolicy {
    public ScreeningResult evaluate(Claim claim, Policy policy, Set<String> missingDocuments) {
        int score = 0;
        List<String> codes = new ArrayList<>();
        if (claim.getClaimedAmount().compareTo(policy.getSumInsured().multiply(new BigDecimal("0.80"))) > 0) {
            score += 35; codes.add("HIGH_CLAIM_TO_LIMIT_RATIO");
        }
        if (claim.getDescription().trim().length() < 30) { score += 15; codes.add("SHORT_NARRATIVE"); }
        if (claim.getParentClaimId() != null || claim.getReopenCount() > 0) { score += 25; codes.add("REOPENED_CLAIM"); }
        if (!missingDocuments.isEmpty()) { score += 15; codes.add("MISSING_REQUIRED_DOCUMENTS"); }
        return new ScreeningResult(Math.min(score, 100), List.copyOf(codes),
            policy.getFraudReviewThreshold(), policy.getFraudRejectThreshold(), policy.getPolicyVersion());
    }

    public record ScreeningResult(int score, List<String> ruleCodes, int reviewThreshold, int rejectThreshold, int policyVersion) {
        public boolean flagged() { return score >= reviewThreshold; }
    }
}
