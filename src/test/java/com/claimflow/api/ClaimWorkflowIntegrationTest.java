package com.claimflow.api;

import com.claimflow.domain.*;
import com.claimflow.repository.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ClaimWorkflowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired PolicyRepository policies;
    @Autowired ClaimRepository claims;
    @Autowired SettlementRepository settlements;
    @Autowired ObjectMapper json;

    @BeforeEach void seedPolicy() { policies.save(policy("MTR-TEST-001", true)); }

    // AC-01
    @Test void fnolCreatesExactlyOneStableFiledClaim() throws Exception {
        long before = claims.count();
        mvc.perform(post("/api/claims").with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON).content(claimJson("100000.00", true)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("FILED"))
            .andExpect(jsonPath("$.claimNumber", startsWith("CLM-"))).andExpect(jsonPath("$.policyVersion").value(4))
            .andExpect(jsonPath("$.auditTrail[0].action").value("FNOL_FILED"));
        assertThat(claims.count()).isEqualTo(before + 1);
    }

    // AC-02
    @Test void inactivePolicyReturnsStableErrorAndPersistsNothing() throws Exception {
        policies.save(policy("MTR-TEST-INACTIVE", false)); long before = claims.count();
        mvc.perform(post("/api/claims").with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON).content(claimJson("MTR-TEST-INACTIVE", "100000.00", true)))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("POLICY_NOT_ACTIVE"));
        assertThat(claims.count()).isEqualTo(before);
    }

    // AC-03..AC-07
    @Test void completeClaimProducesVersionedEvidenceAndOneImmutableSettlement() throws Exception {
        UUID id = submit("100000.00", true);
        mvc.perform(post("/api/admin/claims/{id}/process", id).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.assessedAmount").value(95000.00))
            .andExpect(jsonPath("$.documentEvidence", hasSize(2)))
            .andExpect(jsonPath("$.fraudEvidence[0].policyVersion").value(4))
            .andExpect(jsonPath("$.assessmentEvidence[0].payableAmount").value(95000.00))
            .andExpect(jsonPath("$.decisionEvidence[0].reasonCode").value("ELIGIBLE_FOR_AUTOMATIC_APPROVAL"));
        mvc.perform(post("/api/admin/claims/{id}/settlement", id).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SETTLED"))
            .andExpect(jsonPath("$.settlement.amount").value(95000.00));
        mvc.perform(post("/api/admin/claims/{id}/settlement", id).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.settlement.amount").value(95000.00));
        assertThat(settlements.findByClaimId(id)).isPresent();
    }

    // AC-03/AC-06
    @Test void missingChecklistItemsRouteToReasonCodedManualReview() throws Exception {
        UUID id = submit("100000.00", false);
        mvc.perform(post("/api/admin/claims/{id}/process", id).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MANUAL_REVIEW"))
            .andExpect(jsonPath("$.verificationStatus").value("MISSING_DOCUMENTS"))
            .andExpect(jsonPath("$.decisionReasonCode").value("DOCUMENTS_REQUIRE_REVIEW"));
    }

    // AC-03 / NFR-04
    @Test void assessorCanAppendDocumentOutcomesButCustomerCannotUseAssessorApi() throws Exception {
        UUID id = submit("100000.00", true);
        String request = "{\"outcome\":\"VERIFIED\",\"reason\":\"Synthetic metadata reviewed\"}";
        mvc.perform(post("/api/assessor/claims/{id}/documents/POLICE_FIR/verification", id)
                .with(httpBasic("customer", "customer123")).contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/assessor/claims/{id}/documents/POLICE_FIR/verification", id)
                .with(httpBasic("assessor", "assessor123")).contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UNDER_REVIEW"))
            .andExpect(jsonPath("$.documentEvidence[0].actor").value("assessor"));
    }

    // AC-08
    @Test void disputeReopensOriginalAndReturnsLinkedFiledSubclaim() throws Exception {
        UUID originalId = submit("1000.00", true);
        mvc.perform(post("/api/admin/claims/{id}/process", originalId).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(post("/api/claims/{id}/reopen", originalId).with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Synthetic new evidence\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FILED"))
            .andExpect(jsonPath("$.parentClaimId").value(originalId.toString()));
        mvc.perform(get("/api/claims/{id}", originalId).with(httpBasic("customer", "customer123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REOPENED"));
    }

    // AC-09
    @Test void adminOverrideAppendsNewDecisionWithoutDestroyingPreviousEvidence() throws Exception {
        UUID id = submit("1000.00", true);
        mvc.perform(post("/api/admin/claims/{id}/process", id).with(httpBasic("admin", "admin123")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(patch("/api/admin/claims/{id}/decision", id).with(httpBasic("admin", "admin123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"MANUAL_REVIEW\",\"reasonCode\":\"ADMIN_EVIDENCE_CORRECTION\",\"comment\":\"Synthetic corrected evidence\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MANUAL_REVIEW"))
            .andExpect(jsonPath("$.decisionEvidence", hasSize(2)))
            .andExpect(jsonPath("$.decisionEvidence[0].administrativeOverride").value(false))
            .andExpect(jsonPath("$.decisionEvidence[1].administrativeOverride").value(true));
    }

    // NFR-04/NFR-06/NFR-07
    @Test void ownerBoundariesCorrelationIdAndHealthContractAreEnforced() throws Exception {
        UUID id = submit("100000.00", true);
        mvc.perform(get("/api/admin/claims").with(httpBasic("customer", "customer123"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/claims/{id}", id).with(httpBasic("customer", "customer123")).header("X-Correlation-ID", "test-correlation-1"))
            .andExpect(status().isOk()).andExpect(header().string("X-Correlation-ID", "test-correlation-1"));
        long started = System.nanoTime();
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(header().exists("X-Correlation-ID"));
        long elapsedMillis = java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
        assertThat(elapsedMillis).isLessThan(1_000L);
    }

    private UUID submit(String amount, boolean complete) throws Exception {
        String body = mvc.perform(post("/api/claims").with(httpBasic("customer", "customer123"))
                .contentType(MediaType.APPLICATION_JSON).content(claimJson(amount, complete)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return UUID.fromString(json.readTree(body).get("id").asText());
    }
    private String claimJson(String amount, boolean complete) { return claimJson("MTR-TEST-001", amount, complete); }
    private String claimJson(String policy, String amount, boolean complete) {
        String documents = complete ? "[\"POLICE_FIR\",\"REPAIR_INVOICE\"]" : "[\"POLICE_FIR\"]";
        return "{\"policyNumber\":\"" + policy + "\",\"type\":\"MOTOR\",\"incidentDate\":\"" + LocalDate.now() +
            "\",\"claimedAmount\":" + amount + ",\"description\":\"A detailed synthetic motor incident used for testing only.\",\"documentTypes\":" + documents + "}";
    }
    private Policy policy(String number, boolean active) {
        Policy value = new Policy();
        ReflectionTestUtils.setField(value, "policyNumber", number); ReflectionTestUtils.setField(value, "customerUsername", "customer");
        ReflectionTestUtils.setField(value, "type", ClaimType.MOTOR); ReflectionTestUtils.setField(value, "sumInsured", new BigDecimal("800000.00"));
        ReflectionTestUtils.setField(value, "deductible", new BigDecimal("5000.00")); ReflectionTestUtils.setField(value, "coPayPercent", BigDecimal.ZERO.setScale(2));
        ReflectionTestUtils.setField(value, "validFrom", LocalDate.now().minusYears(1)); ReflectionTestUtils.setField(value, "validTo", LocalDate.now().plusYears(1));
        ReflectionTestUtils.setField(value, "active", active); ReflectionTestUtils.setField(value, "policyVersion", 4);
        ReflectionTestUtils.setField(value, "fraudReviewThreshold", 50); ReflectionTestUtils.setField(value, "fraudRejectThreshold", 80);
        return value;
    }
}
