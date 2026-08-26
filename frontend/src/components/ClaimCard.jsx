import React from 'react';
import { ChevronRight } from 'lucide-react';
import { claimIcon, money, readable, statusTone } from '../claimUi';

export function ClaimCard({ claim, onOpen }) {
  const Icon = claimIcon(claim.type);
  return (
    <button className="claim-card" onClick={() => onOpen(claim)}>
      <div className="claim-icon"><Icon /></div>
      <div className="claim-main">
        <div className="claim-top">
          <strong>{claim.claimNumber}</strong>
          <span className={`status ${statusTone(claim.status)}`}>{readable(claim.status)}</span>
        </div>
        <div className="muted small">{claim.type} · Incident {claim.incidentDate}</div>
        <div className="claim-values">
          <span><small>Claimed</small>{money(claim.claimedAmount)}</span>
          <span><small>Assessed</small>{money(claim.assessedAmount)}</span>
        </div>
      </div>
      <ChevronRight className="chevron" aria-hidden="true" />
    </button>
  );
}
