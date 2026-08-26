package com.claimflow.repository;
import com.claimflow.domain.FraudScreeningRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface FraudScreeningRepository extends JpaRepository<FraudScreeningRecord, UUID> {
    List<FraudScreeningRecord> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
