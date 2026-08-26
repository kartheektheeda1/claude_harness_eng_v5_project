ALTER TABLE policies ADD COLUMN policy_version INT NOT NULL DEFAULT 1;
ALTER TABLE policies ADD COLUMN fraud_review_threshold INT NOT NULL DEFAULT 50;
ALTER TABLE policies ADD COLUMN fraud_reject_threshold INT NOT NULL DEFAULT 80;

ALTER TABLE claims ADD COLUMN policy_version INT NOT NULL DEFAULT 1;
ALTER TABLE claims ADD COLUMN parent_claim_id BINARY(16);
ALTER TABLE claims ADD COLUMN decision_reason_code VARCHAR(80);
ALTER TABLE claims ADD CONSTRAINT fk_claim_parent FOREIGN KEY (parent_claim_id) REFERENCES claims(id);

CREATE TABLE document_verification_records (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  reason VARCHAR(250) NOT NULL,
  actor VARCHAR(80) NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_document_verification_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE fraud_screening_records (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  score INT NOT NULL,
  review_threshold INT NOT NULL,
  reject_threshold INT NOT NULL,
  policy_version INT NOT NULL,
  matched_rule_codes VARCHAR(500) NOT NULL,
  flagged BOOLEAN NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_fraud_screening_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE assessment_records (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  payable_amount DECIMAL(15,2) NOT NULL,
  policy_version INT NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_assessment_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE decision_records (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  decision VARCHAR(30) NOT NULL,
  reason_code VARCHAR(80) NOT NULL,
  comment VARCHAR(500) NOT NULL,
  policy_version INT NOT NULL,
  actor VARCHAR(80) NOT NULL,
  administrative_override BOOLEAN NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_decision_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE claim_transition_records (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  from_status VARCHAR(30) NOT NULL,
  to_status VARCHAR(30) NOT NULL,
  actor VARCHAR(80) NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_transition_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE INDEX idx_claim_parent ON claims(parent_claim_id);
CREATE INDEX idx_document_verification_claim ON document_verification_records(claim_id, occurred_at);
CREATE INDEX idx_fraud_screening_claim ON fraud_screening_records(claim_id, occurred_at);
CREATE INDEX idx_assessment_claim ON assessment_records(claim_id, occurred_at);
CREATE INDEX idx_decision_claim ON decision_records(claim_id, occurred_at);
CREATE INDEX idx_transition_claim ON claim_transition_records(claim_id, occurred_at);
