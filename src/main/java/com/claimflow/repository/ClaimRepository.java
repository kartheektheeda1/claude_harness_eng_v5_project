package com.claimflow.repository;
import com.claimflow.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ClaimRepository extends JpaRepository<Claim, UUID> { List<Claim> findByCustomerUsernameOrderByCreatedAtDesc(String username); long countByStatus(ClaimStatus status); }
