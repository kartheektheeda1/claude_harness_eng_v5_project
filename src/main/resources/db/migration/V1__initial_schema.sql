CREATE TABLE policies (
  policy_number VARCHAR(30) PRIMARY KEY,
  customer_username VARCHAR(80) NOT NULL,
  type VARCHAR(20) NOT NULL,
  sum_insured DECIMAL(15,2) NOT NULL,
  deductible DECIMAL(15,2) NOT NULL,
  co_pay_percent DECIMAL(5,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  active BOOLEAN NOT NULL
);

CREATE TABLE claims (
  id BINARY(16) PRIMARY KEY,
  claim_number VARCHAR(30) NOT NULL UNIQUE,
  policy_number VARCHAR(30) NOT NULL,
  customer_username VARCHAR(80) NOT NULL,
  type VARCHAR(20) NOT NULL,
  incident_date DATE NOT NULL,
  claimed_amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  verification_status VARCHAR(30) NOT NULL,
  fraud_score INT NOT NULL,
  assessed_amount DECIMAL(15,2),
  decision VARCHAR(30),
  decision_reason VARCHAR(500),
  status VARCHAR(30) NOT NULL,
  reopen_count INT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  updated_at TIMESTAMP(6) NOT NULL,
  version BIGINT NOT NULL,
  CONSTRAINT fk_claim_policy FOREIGN KEY (policy_number) REFERENCES policies(policy_number)
);

CREATE TABLE claim_documents (
  claim_id BINARY(16) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (claim_id, document_type),
  CONSTRAINT fk_document_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE settlements (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL UNIQUE,
  payout_reference VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_settlement_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE TABLE audit_events (
  id BINARY(16) PRIMARY KEY,
  claim_id BINARY(16) NOT NULL,
  actor VARCHAR(80) NOT NULL,
  action VARCHAR(80) NOT NULL,
  detail VARCHAR(1000) NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_audit_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE INDEX idx_claim_customer ON claims(customer_username, created_at);
CREATE INDEX idx_claim_status ON claims(status);
CREATE INDEX idx_audit_claim_time ON audit_events(claim_id, occurred_at);
