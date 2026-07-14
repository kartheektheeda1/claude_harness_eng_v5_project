package com.claimflow.api;

import com.claimflow.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final ClaimService service;
    public AdminController(ClaimService service) { this.service = service; }
    @GetMapping("/claims") public List<ClaimResponse> claims() { return service.all(); }
    @GetMapping("/dashboard") public DashboardResponse dashboard() { return service.dashboard(); }
    @PostMapping("/claims/{id}/process") public ClaimResponse process(@PathVariable UUID id, Authentication auth) { return service.process(id, auth.getName()); }
    @PatchMapping("/claims/{id}/decision") public ClaimResponse override(@PathVariable UUID id, @Valid @RequestBody OverrideRequest request, Authentication auth) { return service.override(id, request, auth.getName()); }
}
