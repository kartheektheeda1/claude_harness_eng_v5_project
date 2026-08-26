package com.claimflow.repository;
import com.claimflow.domain.AssessmentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AssessmentRecordRepository extends JpaRepository<AssessmentRecord, UUID> {
    List<AssessmentRecord> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
