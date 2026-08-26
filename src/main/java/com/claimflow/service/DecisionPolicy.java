package com.claimflow.service;

import com.claimflow.domain.*;
import org.springframework.stereotype.Component;

@Component
public class DecisionPolicy {
    public DecisionResult decide(VerificationStatus documents, int fraudScore, int reviewThreshold, int rejectThreshold,
                                 java.math.BigDecimal payable, int policyVersion) {
        if (payable.signum() == 0)
            return new DecisionResult(Decision.REJECT, DecisionReasonCode.ZERO_PAYABLE_AMOUNT, policyVersion);
        if (fraudScore >= rejectThreshold)
            return new DecisionResult(Decision.REJECT, DecisionReasonCode.FRAUD_THRESHOLD_REJECT, policyVersion);
        if (documents != VerificationStatus.VERIFIED)
            return new DecisionResult(Decision.MANUAL_REVIEW, DecisionReasonCode.DOCUMENTS_REQUIRE_REVIEW, policyVersion);
        if (fraudScore >= reviewThreshold)
            return new DecisionResult(Decision.MANUAL_REVIEW, DecisionReasonCode.FRAUD_THRESHOLD_REVIEW, policyVersion);
        return new DecisionResult(Decision.AUTO_APPROVE, DecisionReasonCode.ELIGIBLE_FOR_AUTOMATIC_APPROVAL, policyVersion);
    }
    public record DecisionResult(Decision decision, DecisionReasonCode reasonCode, int policyVersion) {}
}
