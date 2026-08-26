import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeIndianRupee, CheckCircle2, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import { money } from '../claimUi';
import { ClaimCard } from '../components/ClaimCard';

export function AdminPage({ onSelect, refresh }) {
  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState('ALL');
  const [status, setStatus] = useState('ALL');

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

  const visibleClaims = useMemo(() => claims.filter((claim) =>
    (product === 'ALL' || claim.type === product) &&
    (status === 'ALL' || claim.status === status)
  ), [claims, product, status]);
  const fraudQueue = claims.filter((claim) => Number(claim.fraudScore || 0) >= 50 || claim.status === 'MANUAL_REVIEW');
  const payoutAudit = claims.filter((claim) => claim.settlement);

  return (
    <main className="page">
      <div className="page-title">
        <div><p className="eyebrow">Operations console</p><h1>Claims overview</h1><p>Monitor risk, reviews and settlement progress.</p></div>
        <span className="live"><i /> Live workflow</span>
      </div>
      <section className="summary admin-summary" aria-label="Operations summary">
        <div><span className="summary-icon blue"><LayoutDashboard /></span><p>Total claims<strong>{dashboard?.totalClaims ?? '—'}</strong></p></div>
        <div><span className="summary-icon amber"><Activity /></span><p>Manual review<strong>{dashboard?.openReviews ?? '—'}</strong></p></div>
        <div><span className="summary-icon amber"><ShieldAlert /></span><p>Fraud alerts<strong>{dashboard?.fraudAlerts ?? '—'}</strong></p></div>
        <div><span className="summary-icon green"><CheckCircle2 /></span><p>Settled<strong>{dashboard?.settledClaims ?? '—'}</strong></p></div>
        <div><span className="summary-icon green"><BadgeIndianRupee /></span><p>Settled payout<strong>{dashboard ? money(dashboard.totalSettledPayout) : '—'}</strong></p></div>
      </section>
      <section className="list">
        <div className="section-head">
          <h2>Claim queue</h2>
          <div className="queue-filters">
            <label><span className="sr-only">Filter by product</span><select aria-label="Filter by product" value={product} onChange={(event) => setProduct(event.target.value)}><option value="ALL">All products</option>{Object.keys(dashboard?.byProduct || {}).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{Object.keys(dashboard?.byStatus || {}).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          </div>
        </div>
        {error ? (
          <div className="error page-error" role="alert">Could not load admin data: {error}</div>
        ) : loading ? (
          <div className="loading">Loading claim queue…</div>
        ) : visibleClaims.length ? (
          visibleClaims.map((claim) => <ClaimCard claim={claim} onOpen={onSelect} key={claim.id} />)
        ) : (
          <div className="loading">No claims match the selected operational filters.</div>
        )}
      </section>
      <div className="operations-grid">
        <section className="operations-panel" aria-label="Fraud alert queue">
          <div className="section-head"><h2>Fraud alert queue</h2><span className="muted small">{fraudQueue.length} flagged</span></div>
          {fraudQueue.length ? fraudQueue.map((claim) => <button className="audit-row" onClick={() => onSelect(claim)} key={claim.id}><strong>{claim.claimNumber}</strong><span>Score {claim.fraudScore}</span></button>) : <div className="loading compact">No active fraud alerts.</div>}
        </section>
        <section className="operations-panel" aria-label="Payout audit trail">
          <div className="section-head"><h2>Payout audit trail</h2><span className="muted small">{payoutAudit.length} records</span></div>
          {payoutAudit.length ? payoutAudit.map((claim) => <button className="audit-row" onClick={() => onSelect(claim)} key={claim.id}><strong>{claim.settlement.payoutReference}</strong><span>{money(claim.settlement.amount)} · {claim.settlement.paymentStatus}</span></button>) : <div className="loading compact">No payout records yet.</div>}
        </section>
      </div>
    </main>
  );
}
