package com.claimflow.service;

import com.claimflow.api.*;
import com.claimflow.domain.*;
import com.claimflow.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;

@Service
public class ClaimService {
    private final ClaimRepository claims; private final PolicyRepository policies; private final SettlementRepository settlements;
    private final AuditEventRepository audits; private final ClaimRules rules;
    public ClaimService(ClaimRepository claims, PolicyRepository policies, SettlementRepository settlements, AuditEventRepository audits, ClaimRules rules) {
        this.claims = claims; this.policies = policies; this.settlements = settlements; this.audits = audits; this.rules = rules;
    }
    @Transactional
    public ClaimResponse submit(ClaimRequest request, String username) {
        Policy policy = policy(request.policyNumber());
        if (!policy.getCustomerUsername().equals(username)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Policy does not belong to this customer");
        if (policy.getType() != request.type()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Claim type does not match policy");
        if (!policy.covers(request.incidentDate())) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Policy was not active on incident date");
        UUID id = UUID.randomUUID(); String number = "CLM-" + LocalDate.now().getYear() + "-" + id.toString().substring(0, 8).toUpperCase();
        Claim claim = new Claim(id, number, request.policyNumber(), username, request.type(), request.incidentDate(), request.claimedAmount(), request.description(), request.documentTypes());
        claims.save(claim); audit(claim, username, "FNOL_SUBMITTED", "Claim registered");
        return processInternal(claim, policy, "system");
    }
    @Transactional
    public ClaimResponse process(UUID id, String actor) { Claim claim = claim(id); return processInternal(claim, policy(claim.getPolicyNumber()), actor); }
    private ClaimResponse processInternal(Claim claim, Policy policy, String actor) {
        claim.policyValidated(); audit(claim, actor, "POLICY_VALIDATED", "Policy is active and covers incident date");
        Set<String> missing = new TreeSet<>(rules.requiredDocuments(claim.getType())); missing.removeAll(claim.getDocumentTypes());
        claim.documentsVerified(missing.isEmpty()); audit(claim, actor, "DOCUMENTS_CHECKED", missing.isEmpty() ? "All required document types present" : "Missing: " + String.join(", ", missing));
        int score = rules.fraudScore(claim, policy); claim.screened(score); audit(claim, actor, "FRAUD_SCREENED", "Rule score: " + score);
        claim.assessed(rules.assess(claim, policy)); audit(claim, actor, "CLAIM_ASSESSED", "Payable amount: " + claim.getAssessedAmount());
        Decision decision = rules.decide(claim); claim.decide(decision, reason(decision, missing, score)); audit(claim, actor, "DECISION_RECORDED", decision.name());
        claims.save(claim);
        if (decision == Decision.AUTO_APPROVE) createSettlement(claim, actor);
        return response(claim);
    }
    private String reason(Decision decision, Set<String> missing, int score) { return switch (decision) {
        case AUTO_APPROVE -> "Documents complete and fraud score within automatic approval threshold";
        case MANUAL_REVIEW -> !missing.isEmpty() ? "Required documents missing: " + String.join(", ", missing) : "Fraud score requires adjuster review: " + score;
        case REJECT -> "Risk or payable amount failed automated decision rules";
    }; }
    @Transactional
    public ClaimResponse override(UUID id, OverrideRequest request, String actor) {
        Claim claim = claim(id); Decision previous = claim.getDecision(); claim.decide(request.decision(), "Administrative override: " + request.reason());
        audit(claim, actor, "DECISION_OVERRIDDEN", String.valueOf(previous) + " -> " + request.decision() + ": " + request.reason()); claims.save(claim);
        if (request.decision() == Decision.AUTO_APPROVE) createSettlement(claim, actor);
        return response(claim);
    }
    @Transactional
    public ClaimResponse reopen(UUID id, ReopenRequest request, String actor, boolean admin) {
        Claim claim = claim(id); authorize(claim, actor, admin); claim.reopen(request.reason()); audit(claim, actor, "CLAIM_REOPENED", request.reason()); claims.save(claim); return response(claim);
    }
    private void createSettlement(Claim claim, String actor) {
        Optional<Settlement> existing = settlements.findByClaimId(claim.getId());
        if (existing.isPresent()) {
            if (existing.get().getAmount().compareTo(claim.getAssessedAmount()) != 0)
                throw new IllegalStateException("An immutable settlement already exists with a different amount");
            claim.settled();
            return;
        }
        Settlement settlement = new Settlement(UUID.randomUUID(), claim.getId(), "PAY-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(), claim.getAssessedAmount());
        settlements.save(settlement); claim.settled(); audit(claim, actor, "SETTLEMENT_CREATED", settlement.getPayoutReference());
    }
    @Transactional(readOnly = true) public ClaimResponse get(UUID id, String user, boolean admin) { Claim c = claim(id); authorize(c, user, admin); return response(c); }
    @Transactional(readOnly = true) public List<ClaimResponse> mine(String user) { return claims.findByCustomerUsernameOrderByCreatedAtDesc(user).stream().map(this::response).toList(); }
    @Transactional(readOnly = true) public List<ClaimResponse> all() { return claims.findAll().stream().map(this::response).toList(); }
    @Transactional(readOnly = true) public DashboardResponse dashboard() { Map<String,Long> map = new LinkedHashMap<>(); for (ClaimStatus s : ClaimStatus.values()) map.put(s.name(), claims.countByStatus(s)); return new DashboardResponse(claims.count(), map, claims.countByStatus(ClaimStatus.MANUAL_REVIEW), claims.countByStatus(ClaimStatus.SETTLED)); }
    private ClaimResponse response(Claim c) { return ClaimResponse.from(c, settlements.findByClaimId(c.getId()).orElse(null), audits.findByClaimIdOrderByOccurredAtAsc(c.getId())); }
    private Claim claim(UUID id) { return claims.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found")); }
    private Policy policy(String id) { return policies.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy not found")); }
    private void authorize(Claim c, String user, boolean admin) { if (!admin && !c.getCustomerUsername().equals(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your claim"); }
    private void audit(Claim c, String actor, String action, String detail) { audits.save(new AuditEvent(c.getId(), actor, action, detail)); }
}
