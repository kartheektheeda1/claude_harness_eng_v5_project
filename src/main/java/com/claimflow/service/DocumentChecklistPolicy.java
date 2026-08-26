package com.claimflow.service;

import com.claimflow.domain.ClaimType;
import org.springframework.stereotype.Component;
import java.util.Set;

@Component
public class DocumentChecklistPolicy {
    public Set<String> requiredDocuments(ClaimType type) {
        return switch (type) {
            case MOTOR -> Set.of("POLICE_FIR", "REPAIR_INVOICE");
            case HEALTH -> Set.of("HOSPITAL_BILL", "DISCHARGE_SUMMARY");
            case LIFE -> Set.of("DEATH_CERTIFICATE");
        };
    }
}
