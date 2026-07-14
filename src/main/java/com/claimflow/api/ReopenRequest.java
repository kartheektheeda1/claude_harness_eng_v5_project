package com.claimflow.api;
import jakarta.validation.constraints.*;
public record ReopenRequest(@NotBlank @Size(max = 500) String reason) {}
