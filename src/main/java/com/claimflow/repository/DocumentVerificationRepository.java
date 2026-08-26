package com.claimflow.repository;
import com.claimflow.domain.DocumentVerificationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface DocumentVerificationRepository extends JpaRepository<DocumentVerificationRecord, UUID> {
    List<DocumentVerificationRecord> findByClaimIdOrderByOccurredAtAsc(UUID claimId);
}
