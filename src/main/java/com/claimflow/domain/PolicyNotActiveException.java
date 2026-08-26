package com.claimflow.domain;

public class PolicyNotActiveException extends RuntimeException {
    public PolicyNotActiveException(String policyNumber) {
        super("Policy " + policyNumber + " is not active for the incident date");
    }
}
