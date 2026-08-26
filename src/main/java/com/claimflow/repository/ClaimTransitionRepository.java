package com.claimflow.repository;
import com.claimflow.domain.ClaimTransitionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ClaimTransitionRepository extends JpaRepository<ClaimTransitionRecord, UUID> {
    List<ClaimTransitionRecord> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
