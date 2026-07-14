package com.claimflow.api;

import com.claimflow.domain.ClaimType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public record ClaimRequest(
    @NotBlank String policyNumber,
    @NotNull ClaimType type,
    @NotNull @PastOrPresent LocalDate incidentDate,
    @NotNull @DecimalMin("1.00") @Digits(integer = 13, fraction = 2) BigDecimal claimedAmount,
    @NotBlank @Size(max = 1000) String description,
    Set<@NotBlank String> documentTypes
) { public ClaimRequest { documentTypes = documentTypes == null ? Set.of() : Set.copyOf(documentTypes); } }
