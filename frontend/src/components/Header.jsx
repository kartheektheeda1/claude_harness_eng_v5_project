import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';

export function Header({ role, onLogout }) {
  return (
    <header>
      <div className="brand"><ShieldCheck /> ClaimFlow</div>
      <div className="header-right">
        <span className="role-pill">{role}</span>
        <button className="icon-button" aria-label="Log out" onClick={onLogout}><LogOut size={19} /></button>
      </div>
    </header>
  );
}
