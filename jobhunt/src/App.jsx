import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { computeMetrics } from './metrics.js';
import Login from './components/Login.jsx';
import TopPicks, { DismissedPanel } from './components/TopPicks.jsx';
import Analytics from './components/Analytics.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import AppEditor from './components/AppEditor.jsx';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | out | in
  const [apps, setApps] = useState([]);
  const [recs, setRecs] = useState([]);
  const [weeklyTarget, setWeeklyTarget] = useState(35);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // app object | 'new' | null
  const [targetEdit, setTargetEdit] = useState(false);

  useEffect(() => {
    api.me().then((r) => setAuthState(r.authenticated ? 'in' : 'out')).catch(() => setAuthState('out'));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, s] = await Promise.all([
        api.listApplications(), api.listRecommendations({ all: true }), api.getSettings(),
      ]);
      setApps(a); setRecs(r); setWeeklyTarget(s.weekly_target);
    } catch (e) {
      if (e.unauthorized) setAuthState('out');
      else console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authState === 'in') loadAll(); }, [authState, loadAll]);

  async function logout() {
    await api.logout();
    setAuthState('out');
    setApps([]); setRecs([]);
  }
  async function saveTarget(v) {
    const n = Math.max(0, Math.round(Number(v) || 0));
    try { const s = await api.updateSettings({ weekly_target: n }); setWeeklyTarget(s.weekly_target); }
    catch (e) { alert(e.message); }
    setTargetEdit(false);
  }

  if (authState === 'checking') {
    return <div className="center-screen"><div className="spinner" /></div>;
  }
  if (authState === 'out') {
    return <Login onAuthed={() => setAuthState('in')} />;
  }

  const metrics = computeMetrics(apps, { weeklyTarget });
  const activeRecs = recs.filter((r) => r.status !== 'Dismissed');
  const dismissedRecs = recs.filter((r) => r.status === 'Dismissed');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="inner">
          <div className="brand">
            <span className="antler">Black Hart</span>
            <span className="sub">Job Hunt</span>
          </div>
          <div className="spacer" />
          <span className="stat-pill">{metrics.appliedCount} applied · {activeRecs.length} picks</span>
          <button className="btn-ghost btn-sm" style={{ color: 'var(--band-fg)' }} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main>
        <div className="container">
          {/* ---- Today's top picks (pinned) ---- */}
          <div className="section-title">
            <div>
              <div className="kicker">Daily agent</div>
              <h2>Today's top picks</h2>
            </div>
            <button className="btn-ghost btn-sm" onClick={loadAll}>↻ Refresh</button>
          </div>
          <TopPicks recs={activeRecs} onChanged={loadAll} />
          <DismissedPanel recs={dismissedRecs} onChanged={loadAll} />

          {/* ---- Analytics ---- */}
          <div className="section-title">
            <div>
              <div className="kicker">Metrics</div>
              <h2>Search analytics</h2>
            </div>
            <div className="pill-target">
              {targetEdit ? (
                <TargetInput initial={weeklyTarget} onSave={saveTarget} onCancel={() => setTargetEdit(false)} />
              ) : (
                <button className="btn-ghost btn-sm" onClick={() => setTargetEdit(true)}>Weekly target: {weeklyTarget} ✎</button>
              )}
              <a className="btn btn-sm" href={api.exportUrl}>Export JSON</a>
            </div>
          </div>
          {loading ? <div className="center-screen"><div className="spinner" /></div> : <Analytics metrics={metrics} apps={apps} />}

          {/* ---- Applications ---- */}
          <div className="section-title">
            <div>
              <div className="kicker">Pipeline</div>
              <h2>All applications</h2>
            </div>
            <button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ Add application</button>
          </div>
          <ApplicationsTable apps={apps} onEdit={(a) => setEditing(a)} onChanged={loadAll} />
        </div>
      </main>

      {editing && (
        <AppEditor
          app={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadAll(); }}
        />
      )}
    </div>
  );
}

function TargetInput({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial);
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input
        type="number" min="0" value={v} autoFocus
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }}
        style={{ width: 72, padding: '5px 8px' }}
      />
      <button className="btn-primary btn-sm" onClick={() => onSave(v)}>Save</button>
      <button className="btn-ghost btn-sm" onClick={onCancel}>✕</button>
    </span>
  );
}
