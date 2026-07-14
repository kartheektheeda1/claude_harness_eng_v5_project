package com.claimflow.api;

import com.claimflow.domain.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.claimflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClaimWorkflowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired PolicyRepository policies;
    @Autowired ClaimRepository claims;
    @Autowired SettlementRepository settlements;
    @Autowired AuditEventRepository audits;
    @Autowired ObjectMapper objectMapper;

    @BeforeEach
    void resetSyntheticData() {
        audits.deleteAll();
        settlements.deleteAll();
        claims.deleteAll();
        policies.deleteAll();
        policies.save(policy("MTR-TEST-001", "customer", ClaimType.MOTOR, "800000.00", "5000.00", "0.00"));
    }

    @Test
    void completeLowRiskClaimRunsFullWorkflowAndSettles() throws Exception {
        mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(claimJson("100000.00", true)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("SETTLED"))
            .andExpect(jsonPath("$.decision").value("AUTO_APPROVE"))
            .andExpect(jsonPath("$.assessedAmount").value(95000.00))
            .andExpect(jsonPath("$.settlement.amount").value(95000.00))
            .andExpect(jsonPath("$.auditTrail", hasSize(7)));
    }

    @Test
    void missingDocumentsRouteClaimToManualReviewWithoutSettlement() throws Exception {
        mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(claimJson("100000.00", false)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("MANUAL_REVIEW"))
            .andExpect(jsonPath("$.verificationStatus").value("MISSING_DOCUMENTS"))
            .andExpect(jsonPath("$.decision").value("MANUAL_REVIEW"))
            .andExpect(jsonPath("$.settlement").doesNotExist());
    }

    @Test
    void zeroPayableAmountIsRejected() throws Exception {
        mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(claimJson("1000.00", true)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.decision").value("REJECT"))
            .andExpect(jsonPath("$.assessedAmount").value(0.00));
    }

    @Test
    void customerCannotUseAdminApiOrReadAnotherOwnersClaim() throws Exception {
        mvc.perform(get("/api/admin/claims").with(httpBasic("customer", "customer123")))
            .andExpect(status().isForbidden());

        Claim other = new Claim(UUID.randomUUID(), "CLM-TEST-OTHER", "MTR-TEST-001", "synthetic-other",
            ClaimType.MOTOR, LocalDate.now(), new BigDecimal("1000.00"),
            "A detailed synthetic incident description", Set.of());
        claims.save(other);

        mvc.perform(get("/api/claims/{id}", other.getId()).with(httpBasic("customer", "customer123")))
            .andExpect(status().isForbidden());
    }

    @Test
    void customerCannotSubmitAgainstAnotherOwnersPolicy() throws Exception {
        policies.save(policy("MTR-TEST-OTHER", "synthetic-other", ClaimType.MOTOR,
            "800000.00", "5000.00", "0.00"));

        mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(claimJson("MTR-TEST-OTHER", "100000.00", true)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("Policy does not belong to this customer"));
    }

    @Test
    void invalidFutureIncidentAndZeroAmountAreRejectedBeforeWorkflow() throws Exception {
        String invalidRequest = """
            {
              "policyNumber": "MTR-TEST-001",
              "type": "MOTOR",
              "incidentDate": "%s",
              "claimedAmount": 0,
              "description": "Synthetic invalid request for validation testing.",
              "documentTypes": []
            }
            """.formatted(LocalDate.now().plusDays(1));

        mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Validation failed"))
            .andExpect(jsonPath("$.fields.incidentDate").exists())
            .andExpect(jsonPath("$.fields.claimedAmount").exists());

        org.assertj.core.api.Assertions.assertThat(claims.count()).isZero();
    }

    @Test
    void ownerCanReopenARejectedClaimAndAuditIsAppended() throws Exception {
        String response = mvc.perform(post("/api/claims")
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(claimJson("1000.00", true)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andReturn().getResponse().getContentAsString();

        String claimId = objectMapper.readTree(response).get("id").asText();

        mvc.perform(post("/api/claims/{id}/reopen", claimId)
                .with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "reason", "Synthetic additional evidence"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REOPENED"))
            .andExpect(jsonPath("$.reopenCount").value(1))
            .andExpect(jsonPath("$.decision").doesNotExist())
            .andExpect(jsonPath("$.auditTrail", hasSize(7)))
            .andExpect(jsonPath("$.auditTrail[6].action").value("CLAIM_REOPENED"));
    }
    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/claims"))
            .andExpect(status().isUnauthorized());
    }

    private String claimJson(String amount, boolean completeDocuments) {
        return claimJson("MTR-TEST-001", amount, completeDocuments);
    }

    private String claimJson(String policyNumber, String amount, boolean completeDocuments) {
        String documents = completeDocuments
            ? "[\"POLICE_REPORT\",\"DAMAGE_PHOTOS\",\"DRIVING_LICENSE\"]"
            : "[\"POLICE_REPORT\"]";
        return """
            {
              "policyNumber": "%s",
              "type": "MOTOR",
              "incidentDate": "%s",
              "claimedAmount": %s,
              "description": "A detailed synthetic motor incident used only for automated testing.",
              "documentTypes": %s
            }
            """.formatted(policyNumber, LocalDate.now(), amount, documents);
    }

    private Policy policy(String number, String owner, ClaimType type, String sumInsured, String deductible, String copay) {
        Policy policy = new Policy();
        ReflectionTestUtils.setField(policy, "policyNumber", number);
        ReflectionTestUtils.setField(policy, "customerUsername", owner);
        ReflectionTestUtils.setField(policy, "type", type);
        ReflectionTestUtils.setField(policy, "sumInsured", new BigDecimal(sumInsured));
        ReflectionTestUtils.setField(policy, "deductible", new BigDecimal(deductible));
        ReflectionTestUtils.setField(policy, "coPayPercent", new BigDecimal(copay));
        ReflectionTestUtils.setField(policy, "validFrom", LocalDate.now().minusYears(1));
        ReflectionTestUtils.setField(policy, "validTo", LocalDate.now().plusYears(1));
        ReflectionTestUtils.setField(policy, "active", true);
        return policy;
    }
}