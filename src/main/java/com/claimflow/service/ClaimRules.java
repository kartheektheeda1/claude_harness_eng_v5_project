package com.claimflow.service;

import com.claimflow.domain.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

@Component
public class ClaimRules {
    private final int manualReviewThreshold;
    private final int rejectThreshold;
    public ClaimRules(@Value("${claimflow.fraud.manual-review-threshold:50}") int manual, @Value("${claimflow.fraud.reject-threshold:80}") int reject) {
        this.manualReviewThreshold = manual; this.rejectThreshold = reject;
    }
    public Set<String> requiredDocuments(ClaimType type) { return switch (type) {
        case MOTOR -> Set.of("POLICE_REPORT", "DAMAGE_PHOTOS", "DRIVING_LICENSE");
        case HEALTH -> Set.of("MEDICAL_BILLS", "DISCHARGE_SUMMARY", "PRESCRIPTION");
        case LIFE -> Set.of("DEATH_CERTIFICATE", "IDENTITY_PROOF", "NOMINEE_PROOF");
    }; }
    public int fraudScore(Claim claim, Policy policy) {
        int score = 0;
        if (claim.getClaimedAmount().compareTo(policy.getSumInsured().multiply(new BigDecimal("0.80"))) > 0) score += 35;
        if (claim.getIncidentDate().isAfter(LocalDate.now())) score += 100;
        if (claim.getDescription().length() < 30) score += 15;
        if (claim.getReopenCount() > 0) score += 25;
        if (claim.getDocumentTypes().isEmpty()) score += 15;
        return Math.min(score, 100);
    }
    public BigDecimal assess(Claim claim, Policy policy) {
        BigDecimal eligible = claim.getClaimedAmount().min(policy.getSumInsured());
        BigDecimal afterDeductible = eligible.subtract(policy.getDeductible()).max(BigDecimal.ZERO);
        BigDecimal copay = afterDeductible.multiply(policy.getCoPayPercent()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        return afterDeductible.subtract(copay).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
    public Decision decide(Claim claim) {
        if (claim.getFraudScore() >= rejectThreshold || claim.getAssessedAmount().signum() == 0) return Decision.REJECT;
        if (claim.getVerificationStatus() != VerificationStatus.VERIFIED || claim.getFraudScore() >= manualReviewThreshold) return Decision.MANUAL_REVIEW;
        return Decision.AUTO_APPROVE;
    }
}
