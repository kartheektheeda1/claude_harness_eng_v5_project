package com.claimflow.repository;
import com.claimflow.domain.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PolicyRepository extends JpaRepository<Policy, String> {}
