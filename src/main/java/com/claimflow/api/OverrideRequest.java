package com.claimflow.api;
import com.claimflow.domain.Decision;
import com.claimflow.domain.DecisionReasonCode;
import jakarta.validation.constraints.*;
public record OverrideRequest(@NotNull Decision decision, @NotNull DecisionReasonCode reasonCode,
                              @NotBlank @Size(max = 500) String comment) {}
