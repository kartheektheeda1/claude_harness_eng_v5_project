INSERT INTO claims (
  id, claim_number, policy_number, customer_username, type, incident_date,
  claimed_amount, description, verification_status, fraud_score, assessed_amount,
  decision, decision_reason, status, reopen_count, created_at, updated_at, version,
  policy_version, parent_claim_id, decision_reason_code
) VALUES
(
  X'00000000000000000000000000000101', 'CLM-2026-DEMO-MOTOR', 'MTR-2026-001', 'customer', 'MOTOR', '2026-07-08',
  125000.00, 'Synthetic parked-vehicle incident for the local demonstration.', 'PENDING', 0, NULL,
  NULL, NULL, 'FILED', 0, '2026-07-10 09:00:00', '2026-07-10 09:00:00', 0,
  1, NULL, NULL
),
(
  X'00000000000000000000000000000102', 'CLM-2026-DEMO-HEALTH', 'HLT-2026-001', 'customer', 'HEALTH', '2026-07-07',
  85000.00, 'Synthetic hospital admission for the local demonstration.', 'PENDING', 0, NULL,
  NULL, NULL, 'FILED', 0, '2026-07-10 09:05:00', '2026-07-10 09:05:00', 0,
  1, NULL, NULL
),
(
  X'00000000000000000000000000000103', 'CLM-2026-DEMO-LIFE', 'LIF-2026-001', 'customer', 'LIFE', '2026-07-06',
  500000.00, 'Synthetic life-claim notification for the local demonstration.', 'PENDING', 0, NULL,
  NULL, NULL, 'FILED', 0, '2026-07-10 09:10:00', '2026-07-10 09:10:00', 0,
  1, NULL, NULL
);

INSERT INTO claim_documents (claim_id, document_type) VALUES
(X'00000000000000000000000000000101', 'POLICE_FIR'),
(X'00000000000000000000000000000101', 'REPAIR_INVOICE'),
(X'00000000000000000000000000000102', 'HOSPITAL_BILL'),
(X'00000000000000000000000000000102', 'DISCHARGE_SUMMARY'),
(X'00000000000000000000000000000103', 'DEATH_CERTIFICATE');
