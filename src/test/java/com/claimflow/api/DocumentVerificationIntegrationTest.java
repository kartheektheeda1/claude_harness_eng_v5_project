package com.claimflow.api;

import com.claimflow.domain.*;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class DocumentVerificationIntegrationTest {
    // AC-03: repeated outcomes are separate append-only evidence, never an in-place replacement.
    @Test void repeatedVerificationProducesDistinctEvidenceRecords() {
        UUID claimId = UUID.randomUUID();
        var first = new DocumentVerificationRecord(claimId, "POLICE_FIR", DocumentOutcome.REJECTED, "Unreadable synthetic stub", "assessor");
        var second = new DocumentVerificationRecord(claimId, "POLICE_FIR", DocumentOutcome.VERIFIED, "Replacement synthetic stub", "assessor");
        assertThat(first.getId()).isNotEqualTo(second.getId());
        assertThat(first.getOutcome()).isEqualTo(DocumentOutcome.REJECTED);
        assertThat(second.getOutcome()).isEqualTo(DocumentOutcome.VERIFIED);
        assertThat(first.getClaimId()).isEqualTo(second.getClaimId());
    }
}
