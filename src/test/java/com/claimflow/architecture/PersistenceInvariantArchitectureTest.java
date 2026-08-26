package com.claimflow.architecture;

import com.claimflow.domain.*;
import jakarta.persistence.PreRemove;
import jakarta.persistence.PreUpdate;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class PersistenceInvariantArchitectureTest {
    private static final Class<?>[] APPEND_ONLY_TYPES = {
        AuditEvent.class,
        DocumentVerificationRecord.class,
        FraudScreeningRecord.class,
        AssessmentRecord.class,
        DecisionRecord.class,
        ClaimTransitionRecord.class,
        Settlement.class
    };

    @Test
    void nfr02AppendOnlyEvidenceDeclaresUpdateAndDeleteLifecycleGuards() {
        for (Class<?> type : APPEND_ONLY_TYPES) {
            assertThat(type.getDeclaredMethods())
                .as("append-only lifecycle guard on %s", type.getSimpleName())
                .anySatisfy(method -> {
                    assertThat(method.isAnnotationPresent(PreUpdate.class)).isTrue();
                    assertThat(method.isAnnotationPresent(PreRemove.class)).isTrue();
                });
        }
    }

    @Test
    void nfr08ClaimAggregateExposesNoPublicPropertySetters() {
        assertThat(Claim.class.getDeclaredMethods())
            .filteredOn(method -> Modifier.isPublic(method.getModifiers()))
            .noneMatch(method -> method.getName().matches("set[A-Z].*"));
    }

    @Test
    void nfr08DatabaseSchemaEnforcesFinancialBounds() throws Exception {
        String migration;
        try (var stream = getClass().getResourceAsStream("/db/migration/V4__claimflow_domain_constraints.sql")) {
            assertThat(stream).isNotNull();
            migration = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        assertThat(migration)
            .contains("chk_settlement_amount_positive")
            .contains("chk_assessment_non_negative")
            .contains("chk_claim_amount_positive");
    }
}
