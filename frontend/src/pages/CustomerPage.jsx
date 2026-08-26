import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeIndianRupee, ClipboardList, FilePlus2, Search } from 'lucide-react';
import { api } from '../api';
import { money } from '../claimUi';
import { ClaimCard } from '../components/ClaimCard';

function Empty({ onNew }) {
  return (
    <div className="empty">
      <div className="empty-icon"><ClipboardList /></div>
      <h3>No claims yet</h3>
      <p>When life happens, start here. Your claim progress will stay visible at every step.</p>
      <button className="primary" onClick={onNew}><FilePlus2 size={18} /> File your first claim</button>
    </div>
  );
}

export function CustomerPage({ onSelect, onNew, refresh }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api('/api/claims')
      .then((result) => active && setClaims(result))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refresh]);

  const visibleClaims = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return claims;
    return claims.filter((claim) => [claim.claimNumber, claim.policyNumber, claim.type, claim.status]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [claims, query]);

  return (
    <main className="page">
      <div className="page-title">
        <div><p className="eyebrow">Customer portal</p><h1>Your claims</h1><p>Everything you need, from first notice to final settlement.</p></div>
        <button className="primary" onClick={onNew}><FilePlus2 size={18} /> New claim</button>
      </div>
      <section className="summary" aria-label="Claim summary">
        <div><span className="summary-icon blue"><ClipboardList /></span><p>All claims<strong>{claims.length}</strong></p></div>
        <div><span className="summary-icon amber"><Activity /></span><p>In progress<strong>{claims.filter((claim) => !['SETTLED', 'REJECTED'].includes(claim.status)).length}</strong></p></div>
        <div><span className="summary-icon green"><BadgeIndianRupee /></span><p>Total settled<strong>{money(claims.filter((claim) => claim.status === 'SETTLED').reduce((total, claim) => total + Number(claim.assessedAmount || 0), 0))}</strong></p></div>
      </section>
      <section className="list">
        <div className="section-head">
          <h2>Recent claims</h2>
          <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search claims</span><input aria-label="Search claims" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label>
        </div>
        {error ? (
          <div className="error page-error" role="alert">Could not load claims: {error}</div>
        ) : loading ? (
          <div className="loading">Loading claims…</div>
        ) : visibleClaims.length ? (
          visibleClaims.map((claim) => <ClaimCard claim={claim} onOpen={onSelect} key={claim.id} />)
        ) : query ? (
          <div className="loading">No claims match “{query}”.</div>
        ) : (
          <Empty onNew={onNew} />
        )}
      </section>
    </main>
  );
}
