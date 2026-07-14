package com.claimflow.repository;
import com.claimflow.domain.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SettlementRepository extends JpaRepository<Settlement, UUID> { Optional<Settlement> findByClaimId(UUID claimId); }
