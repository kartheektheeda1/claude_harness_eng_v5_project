package com.claimflow.repository;
import com.claimflow.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ClaimRepository extends JpaRepository<Claim, UUID> {
    List<Claim> findByCustomerUsernameOrderByCreatedAtDesc(String username);
    List<Claim> findByStatusInOrderByCreatedAtAsc(Collection<ClaimStatus> statuses);
    long countByStatus(ClaimStatus status);
}
