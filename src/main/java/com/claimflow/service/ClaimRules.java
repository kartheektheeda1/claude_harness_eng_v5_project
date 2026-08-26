package com.claimflow.service;

import com.claimflow.domain.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.*;

@Component
public class ClaimRules {
    private final DocumentChecklistPolicy checklists;
    private final FraudScreeningPolicy fraud;
    private final PayoutCalculator payouts;
    private final DecisionPolicy decisions;
    public ClaimRules(DocumentChecklistPolicy checklists, FraudScreeningPolicy fraud, PayoutCalculator payouts, DecisionPolicy decisions) {
        this.checklists = checklists; this.fraud = fraud; this.payouts = payouts; this.decisions = decisions;
    }
    public Set<String> requiredDocuments(ClaimType type) { return checklists.requiredDocuments(type); }
    public int fraudScore(Claim claim, Policy policy) {
        Set<String> missing = new HashSet<>(requiredDocuments(claim.getType()));
        missing.removeAll(claim.getDocumentTypes());
        return fraud.evaluate(claim, policy, missing).score();
    }
    public BigDecimal assess(Claim claim, Policy policy) {
        return payouts.calculate(claim.getClaimedAmount(), policy.getSumInsured(), policy.getDeductible(), policy.getCoPayPercent());
    }
    public Decision decide(Claim claim) {
        return decisions.decide(claim.getVerificationStatus(), claim.getFraudScore(), policyReview(claim), policyReject(claim), claim.getAssessedAmount(), claim.getPolicyVersion()).decision();
    }
    private int policyReview(Claim claim) { return 50; }
    private int policyReject(Claim claim) { return 80; }
}
