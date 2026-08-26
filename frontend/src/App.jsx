import React, { useState } from 'react';
import { AdminPage } from './pages/AdminPage';
import { AssessorPage } from './pages/AssessorPage';
import { CustomerPage } from './pages/CustomerPage';
import { ClaimDetail } from './components/ClaimDetail';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { NewClaim } from './components/NewClaim';

export function App() {
  const [role, setRole] = useState(localStorage.getItem('claimflow-role'));
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [refresh, setRefresh] = useState(0);

  function login(nextRole) {
    localStorage.setItem('claimflow-role', nextRole);
    setRole(nextRole);
  }

  function logout() {
    localStorage.removeItem('claimflow-role');
    setRole(null);
    setSelectedClaim(null);
  }

  function claimChanged(claim) {
    setSelectedClaim(claim);
    setRefresh((value) => value + 1);
  }

  if (!role) return <Login onLogin={login} />;

  return (
    <>
      <Header role={role} onLogout={logout} />
      {role === 'admin' ? (
        <AdminPage refresh={refresh} onSelect={setSelectedClaim} />
      ) : role === 'assessor' ? (
        <AssessorPage refresh={refresh} onSelect={setSelectedClaim} />
      ) : (
        <CustomerPage
          refresh={refresh}
          onSelect={setSelectedClaim}
          onNew={() => setShowNewClaim(true)}
        />
      )}
      {showNewClaim && (
        <NewClaim
          onClose={() => setShowNewClaim(false)}
          onCreated={(claim) => {
            setShowNewClaim(false);
            claimChanged(claim);
          }}
        />
      )}
      {selectedClaim && (
        <ClaimDetail
          claim={selectedClaim}
          role={role}
          onClose={() => setSelectedClaim(null)}
          onChanged={claimChanged}
        />
      )}
    </>
  );
}
