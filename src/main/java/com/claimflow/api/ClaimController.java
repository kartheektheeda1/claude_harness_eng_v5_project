package com.claimflow.api;

import com.claimflow.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {
    private final ClaimService service;
    public ClaimController(ClaimService service) { this.service = service; }
    @PostMapping public ResponseEntity<ClaimResponse> submit(@Valid @RequestBody ClaimRequest request, Authentication auth) { return ResponseEntity.status(HttpStatus.CREATED).body(service.submit(request, auth.getName())); }
    @GetMapping public List<ClaimResponse> mine(Authentication auth) { return service.mine(auth.getName()); }
    @GetMapping("/{id}") public ClaimResponse get(@PathVariable UUID id, Authentication auth) { return service.get(id, auth.getName(), auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))); }
    @PostMapping("/{id}/reopen") public ClaimResponse reopen(@PathVariable UUID id, @Valid @RequestBody ReopenRequest request, Authentication auth) { return service.reopen(id, request, auth.getName(), auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))); }
}
