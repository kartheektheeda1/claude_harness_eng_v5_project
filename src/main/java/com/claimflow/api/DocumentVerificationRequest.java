package com.claimflow.api;
import com.claimflow.domain.DocumentOutcome;
import jakarta.validation.constraints.*;
public record DocumentVerificationRequest(@NotNull DocumentOutcome outcome,
                                          @NotBlank @Size(max = 250) String reason) {}
