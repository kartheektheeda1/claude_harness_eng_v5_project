package com.claimflow.repository;
import com.claimflow.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> { List<AuditEvent> findByClaimIdOrderByOccurredAtAsc(UUID claimId); }
