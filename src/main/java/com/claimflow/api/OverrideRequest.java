package com.claimflow.api;
import com.claimflow.domain.Decision;
import jakarta.validation.constraints.*;
public record OverrideRequest(@NotNull Decision decision, @NotBlank @Size(max = 500) String reason) {}
