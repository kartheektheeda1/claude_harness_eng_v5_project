import React, { useEffect, useState } from 'react';
import { ClipboardCheck, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import { ClaimCard } from '../components/ClaimCard';

export function AssessorPage({ onSelect, refresh }) {
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api('/api/assessor/queue', {}, 'assessor')
      .then((result) => active && setClaims(result))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refresh]);
  return (
    <main className="page">
      <div className="page-title"><div><p className="eyebrow">Assessor workspace</p><h1>Evidence review queue</h1><p>Verify document metadata and run deterministic assessment.</p></div></div>
      <section className="summary" aria-label="Assessor summary">
        <div><span className="summary-icon blue"><ClipboardCheck /></span><p>Open queue<strong>{claims.length}</strong></p></div>
        <div><span className="summary-icon amber"><ShieldAlert /></span><p>Manual review<strong>{claims.filter((claim) => claim.status === 'MANUAL_REVIEW').length}</strong></p></div>
      </section>
      <section className="list"><div className="section-head"><h2>Claims requiring attention</h2></div>
        {error ? <div className="error page-error" role="alert">{error}</div>
          : loading ? <div className="loading">Loading assessor queue…</div>
            : claims.length ? claims.map((claim) => <ClaimCard key={claim.id} claim={claim} onOpen={onSelect} />)
              : <div className="loading">No claims currently require assessment.</div>}
      </section>
    </main>
  );
}
