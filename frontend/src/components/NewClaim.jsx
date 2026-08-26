import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { api } from '../api';
import { claimIcon, demoPolicyByType, documentsByType, readable } from '../claimUi';
import { Modal } from './Modal';

const today = () => new Date().toISOString().slice(0, 10);

export function NewClaim({ onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'MOTOR', incidentDate: today(), claimedAmount: '', description: '', documentTypes: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggleDocument(documentType) {
    setForm((current) => ({
      ...current,
      documentTypes: current.documentTypes.includes(documentType)
        ? current.documentTypes.filter((value) => value !== documentType)
        : [...current.documentTypes, documentType],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          policyNumber: demoPolicyByType[form.type],
          claimedAmount: Number(form.claimedAmount),
        }),
      });
      onCreated(result);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal as="form" labelledBy="new-claim-heading" onClose={onClose} elementProps={{ onSubmit: submit }}>
      <div className="modal-head">
        <div><p className="eyebrow">First notice of loss</p><h2 id="new-claim-heading">Tell us what happened</h2></div>
        <button type="button" className="icon-button" aria-label="Close claim form" onClick={onClose}><X /></button>
      </div>
      <div className="type-grid" aria-label="Claim type">
        {Object.keys(documentsByType).map((type) => {
          const Icon = claimIcon(type);
          return (
            <button
              type="button"
              className={form.type === type ? 'type active' : 'type'}
              aria-pressed={form.type === type}
              onClick={() => setForm({ ...form, type, documentTypes: [] })}
              key={type}
            ><Icon />{type}</button>
          );
        })}
      </div>
      <label>Incident date
        <input type="date" max={today()} value={form.incidentDate} onChange={(event) => setForm({ ...form, incidentDate: event.target.value })} required />
      </label>
      <label>Claim amount (₹)
        <input type="number" min="1" step="0.01" value={form.claimedAmount} onChange={(event) => setForm({ ...form, claimedAmount: event.target.value })} placeholder="e.g. 45000" required />
      </label>
      <label>What happened?
        <textarea minLength="10" maxLength="1000" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Share the key details of the incident…" required />
      </label>
      <fieldset>
        <legend>Document types available <span>(metadata only in this demo)</span></legend>
        {documentsByType[form.type].map((documentType) => (
          <label className="check" key={documentType}>
            <input type="checkbox" checked={form.documentTypes.includes(documentType)} onChange={() => toggleDocument(documentType)} />
            <span>{readable(documentType)}</span>
          </label>
        ))}
      </fieldset>
      {error && <div className="error" role="alert">{error}</div>}
      <button className="primary wide" disabled={busy}>{busy ? 'Submitting…' : 'Submit claim'} <ChevronRight size={18} /></button>
    </Modal>
  );
}
