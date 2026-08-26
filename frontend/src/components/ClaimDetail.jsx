import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { api } from '../api';
import { money, readable, statusTone } from '../claimUi';
import { Modal } from './Modal';

const ADMIN_DECISION_STATUSES = ['REJECTED', 'APPROVED'];
const PROCESS_STATUSES = ['FILED', 'UNDER_REVIEW'];

export function ClaimDetail({ claim, role, onClose, onChanged }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function execute(action) {
    setBusy(true);
    setError('');
    try {
      onChanged(await action());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const reopen = () => execute(() => api(`/api/claims/${claim.id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Additional synthetic evidence is available' }),
  }, role));
  const override = (decision) => execute(() => api(`/api/admin/claims/${claim.id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reasonCode: 'ADMIN_EVIDENCE_CORRECTION', comment: reason || 'Reviewed using synthetic evidence' }),
  }, 'admin'));
  const processClaim = () => execute(() => api(`/api/admin/claims/${claim.id}/process`, {
    method: 'POST',
  }, 'admin'));
  const settleClaim = () => execute(() => api(`/api/admin/claims/${claim.id}/settlement`, { method: 'POST' }, 'admin'));
  const evaluateClaim = () => execute(() => api(`/api/assessor/claims/${claim.id}/evaluate`, { method: 'POST' }, 'assessor'));
  const verifyDocument = (documentType, outcome) => execute(() => api(`/api/assessor/claims/${claim.id}/documents/${documentType}/verification`, {
    method: 'POST', body: JSON.stringify({ outcome, reason: reason || `Synthetic ${outcome.toLowerCase()} evidence review` }),
  }, 'assessor'));

  const customerCanReopen = role === 'customer' && ['SETTLED', 'REJECTED'].includes(claim.status);
  const adminCanDecide = role === 'admin' && ADMIN_DECISION_STATUSES.includes(claim.status);
  const adminCanProcess = role === 'admin' && PROCESS_STATUSES.includes(claim.status);
  const adminCanSettle = role === 'admin' && claim.status === 'APPROVED';
  const assessorCanReview = role === 'assessor' && PROCESS_STATUSES.includes(claim.status);

  return (
    <Modal className="detail" labelledBy="claim-detail-heading" onClose={onClose}>
      <div className="modal-head">
        <div><p className="eyebrow">{claim.type} claim</p><h2 id="claim-detail-heading">{claim.claimNumber}</h2></div>
        <button className="icon-button" aria-label="Close claim details" onClick={onClose}><X /></button>
      </div>
      <span className={`status ${statusTone(claim.status)}`}>{readable(claim.status)}</span>
      <div className="detail-amount"><small>Assessed payable amount</small><strong>{money(claim.assessedAmount)}</strong><span>Claimed {money(claim.claimedAmount)}</span></div>
      <div className="facts">
        <div><small>Policy</small><strong>{claim.policyNumber}</strong></div>
        <div><small>Policy version</small><strong>v{claim.policyVersion}</strong></div>
        <div><small>Fraud score</small><strong>{claim.fraudScore}/100</strong></div>
        <div><small>Documents</small><strong>{readable(claim.verificationStatus)}</strong></div>
        <div><small>Decision</small><strong>{readable(claim.decision)}</strong></div>
      </div>
      {claim.decisionReason && <div className="decision"><ShieldCheck /><div><strong>Decision rationale</strong><p>{claim.decisionReason}</p></div></div>}
      {claim.parentClaimId && <div className="decision"><ShieldCheck /><div><strong>Dispute sub-claim</strong><p>Linked to {claim.parentClaimId}</p></div></div>}
      {claim.settlement && <div className="settlement"><CheckCircle2 /><div><strong>Settlement created</strong><p>{claim.settlement.payoutReference} · {readable(claim.settlement.paymentStatus)}</p></div></div>}
      <h3>Audit timeline</h3>
      <ol className="timeline">
        {claim.auditTrail.map((event) => <li key={event.id}><span /><div><strong>{readable(event.action)}</strong><p>{event.detail}</p><small>{new Date(event.occurredAt).toLocaleString()}</small></div></li>)}
      </ol>
      {error && <div className="error" role="alert">{error}</div>}
      {assessorCanReview && <section aria-label="Document verification"><h3>Required document metadata</h3>{claim.documentTypes.map((documentType) => (
        <div className="document-action" key={documentType}><span>{readable(documentType)}</span>
          <button className="secondary" disabled={busy} onClick={() => verifyDocument(documentType, 'REJECTED')}>Reject</button>
          <button className="secondary" disabled={busy} onClick={() => verifyDocument(documentType, 'VERIFIED')}>Verify</button></div>
      ))}</section>}
      {(customerCanReopen || adminCanDecide || adminCanProcess || adminCanSettle || assessorCanReview) && (
        <div className="actions">
          <input aria-label="Reason or reviewer note" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason or reviewer note" />
          {customerCanReopen && <button className="secondary" disabled={busy} onClick={reopen}>Reopen claim</button>}
          {adminCanProcess && <button className="secondary" disabled={busy} onClick={processClaim}>Reprocess</button>}
          {adminCanSettle && <button className="primary" disabled={busy} onClick={settleClaim}>Create settlement</button>}
          {assessorCanReview && <button className="primary" disabled={busy} onClick={evaluateClaim}>Evaluate claim</button>}
          {adminCanDecide && <button className="secondary" disabled={busy} onClick={() => override('REJECT')}>Reject</button>}
          {adminCanDecide && <button className="primary" disabled={busy} onClick={() => override('AUTO_APPROVE')}>Approve</button>}
        </div>
      )}
    </Modal>
  );
}
