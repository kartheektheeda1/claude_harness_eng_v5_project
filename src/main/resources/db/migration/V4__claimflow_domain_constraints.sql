UPDATE claims
SET status = CASE
  WHEN status = 'SUBMITTED' THEN 'FILED'
  WHEN status IN ('POLICY_VALIDATED', 'DOCUMENTS_PENDING', 'DOCUMENTS_VERIFIED', 'FRAUD_SCREENED', 'ASSESSED') THEN 'UNDER_REVIEW'
  ELSE status
END
WHERE status IN ('SUBMITTED', 'POLICY_VALIDATED', 'DOCUMENTS_PENDING', 'DOCUMENTS_VERIFIED', 'FRAUD_SCREENED', 'ASSESSED');

ALTER TABLE policies ADD CONSTRAINT chk_policy_fraud_thresholds
  CHECK (fraud_review_threshold >= 0 AND fraud_review_threshold < fraud_reject_threshold AND fraud_reject_threshold <= 100);

ALTER TABLE claims ADD CONSTRAINT chk_claim_amount_positive CHECK (claimed_amount > 0);
ALTER TABLE claims ADD CONSTRAINT chk_claim_fraud_score CHECK (fraud_score >= 0 AND fraud_score <= 100);
ALTER TABLE settlements ADD CONSTRAINT chk_settlement_amount_positive CHECK (amount > 0);
ALTER TABLE fraud_screening_records ADD CONSTRAINT chk_fraud_evidence_score CHECK (score >= 0 AND score <= 100);
ALTER TABLE assessment_records ADD CONSTRAINT chk_assessment_non_negative CHECK (payable_amount >= 0);
