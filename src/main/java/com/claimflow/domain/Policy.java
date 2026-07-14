package com.claimflow.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "policies")
public class Policy {
    @Id @Column(length = 30) private String policyNumber;
    @Column(nullable = false, length = 80) private String customerUsername;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ClaimType type;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal sumInsured;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal deductible;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal coPayPercent;
    @Column(nullable = false) private LocalDate validFrom;
    @Column(nullable = false) private LocalDate validTo;
    @Column(nullable = false) private boolean active;

    public Policy() {}
    public String getPolicyNumber() { return policyNumber; }
    public String getCustomerUsername() { return customerUsername; }
    public ClaimType getType() { return type; }
    public BigDecimal getSumInsured() { return sumInsured; }
    public BigDecimal getDeductible() { return deductible; }
    public BigDecimal getCoPayPercent() { return coPayPercent; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public boolean isActive() { return active; }
    public boolean covers(LocalDate date) { return active && !date.isBefore(validFrom) && !date.isAfter(validTo); }
}
