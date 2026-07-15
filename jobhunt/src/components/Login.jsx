import React, { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onAuthed }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.login(password);
      onAuthed();
    } catch (e) {
      setErr(e.message || 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="antler">Black Hart</div>
        <div className="sub">Job Hunt Cockpit</div>
        <h1>Private access</h1>
        <p>Enter the password to open your job-search dashboard.</p>
        <input
          type="password"
          value={password}
          autoFocus
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Checking…' : 'Enter'}
          </button>
        </div>
        <div className="login-err">{err}</div>
      </form>
    </div>
  );
}
