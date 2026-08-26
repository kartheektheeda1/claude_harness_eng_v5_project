import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { api } from '../api';
import { ClaimCard } from '../components/ClaimCard';

export function AdminPage({ onSelect, refresh }) {
  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api('/api/admin/claims', {}, 'admin'),
      api('/api/admin/dashboard', {}, 'admin'),
    ])
      .then(([claimResult, dashboardResult]) => {
        if (active) {
          setClaims(claimResult);
          setDashboard(dashboardResult);
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refresh]);

  return (
    <main className="page">
      <div className="page-title">
        <div><p className="eyebrow">Operations console</p><h1>Claims overview</h1><p>Monitor risk, reviews and settlement progress.</p></div>
        <span className="live"><i /> Live workflow</span>
      </div>
      <section className="summary admin-summary" aria-label="Operations summary">
        <div><span className="summary-icon blue"><LayoutDashboard /></span><p>Total claims<strong>{dashboard?.totalClaims ?? '—'}</strong></p></div>
        <div><span className="summary-icon amber"><Activity /></span><p>Manual review<strong>{dashboard?.openReviews ?? '—'}</strong></p></div>
        <div><span className="summary-icon green"><CheckCircle2 /></span><p>Settled<strong>{dashboard?.settledClaims ?? '—'}</strong></p></div>
      </section>
      <section className="list">
        <div className="section-head"><h2>Claim queue</h2><span className="muted small">Select an eligible claim to review or reprocess</span></div>
        {error ? (
          <div className="error page-error" role="alert">Could not load admin data: {error}</div>
        ) : loading ? (
          <div className="loading">Loading claim queue…</div>
        ) : claims.length ? (
          claims.map((claim) => <ClaimCard claim={claim} onOpen={onSelect} key={claim.id} />)
        ) : (
          <div className="loading">No claims are currently in the queue.</div>
        )}
      </section>
    </main>
  );
}
