import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';

export function Login({ onLogin }) {
  return (
    <main className="login-shell">
      <section className="brand-panel" aria-label="ClaimFlow introduction">
        <div className="brand"><ShieldCheck /> ClaimFlow</div>
        <div>
          <p className="eyebrow">Claims, without the friction</p>
          <h1>A clearer path from incident to settlement.</h1>
          <p>Submit, assess and resolve insurance claims through one transparent workflow.</p>
        </div>
        <div className="trust-row"><span>Secure intake</span><span>Rule-based assessment</span><span>Auditable decisions</span></div>
      </section>
      <section className="login-card" aria-labelledby="workspace-heading">
        <p className="eyebrow">Welcome back</p>
        <h2 id="workspace-heading">Choose your workspace</h2>
        <p className="muted">This demonstration uses synthetic accounts only.</p>
        <button className="primary wide" onClick={() => onLogin('customer')}>Continue as customer <ChevronRight size={18} /></button>
        <button className="secondary wide" onClick={() => onLogin('assessor')}>Open assessor workspace <ChevronRight size={18} /></button>
        <button className="secondary wide" onClick={() => onLogin('admin')}>Open admin console <ChevronRight size={18} /></button>
        <div className="demo-note">Customer: customer / customer123<br />Assessor: assessor / assessor123<br />Admin: admin / admin123</div>
      </section>
    </main>
  );
}
