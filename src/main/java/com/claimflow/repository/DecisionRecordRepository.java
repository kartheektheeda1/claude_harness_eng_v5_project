package com.claimflow.repository;
import com.claimflow.domain.DecisionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface DecisionRecordRepository extends JpaRepository<DecisionRecord, UUID> {
    List<DecisionRecord> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
