package com.claimflow.domain;

public class InvalidClaimStateException extends RuntimeException {
    public InvalidClaimStateException(String message) { super(message); }
}
