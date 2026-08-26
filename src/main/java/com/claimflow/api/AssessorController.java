package com.claimflow.api;

import com.claimflow.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/assessor")
public class AssessorController {
    private final ClaimService service;
    public AssessorController(ClaimService service) { this.service = service; }
    @GetMapping("/queue") public List<ClaimResponse> queue() { return service.assessorQueue(); }
    @PostMapping("/claims/{id}/documents/{documentType}/verification")
    public ClaimResponse verify(@PathVariable UUID id, @PathVariable String documentType,
                                @Valid @RequestBody DocumentVerificationRequest request, Authentication auth) {
        return service.verifyDocument(id, documentType, request, auth.getName());
    }
    @PostMapping("/claims/{id}/evaluate")
    public ClaimResponse evaluate(@PathVariable UUID id, Authentication auth) { return service.process(id, auth.getName()); }
}
