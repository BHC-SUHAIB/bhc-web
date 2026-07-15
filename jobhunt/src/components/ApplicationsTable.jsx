import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { StatusChip } from './ui.jsx';
import { shortDate } from '../format.js';
import { ALL_STATUSES } from '../metrics.js';

// Searchable / filterable / sortable applications table with an inline quick
// status changer, plus edit + delete.
export default function ApplicationsTable({ apps, onEdit, onChanged }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [sortKey, setSortKey] = useState('date_applied');
  const [sortDir, setSortDir] = useState('desc');

  const tracks = useMemo(() => [...new Set(apps.map((a) => a.track).filter(Boolean))].sort(), [apps]);

  const rows = useMemo(() => {
    let r = apps;
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((a) => (a.company + ' ' + a.role_title + ' ' + a.platform + ' ' + a.notes).toLowerCase().includes(s));
    }
    if (statusFilter) r = r.filter((a) => a.status === statusFilter);
    if (trackFilter) r = r.filter((a) => a.track === trackFilter);
    r = [...r].sort((a, b) => {
      const av = a[sortKey] || '', bv = b[sortKey] || '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [apps, q, statusFilter, trackFilter, sortKey, sortDir]);

  function toggleSort(k) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  }
  async function quickStatus(app, status) {
    if (status === app.status) return;
    try { await api.updateApplication(app.id, { status }); onChanged(); }
    catch (e) { alert(e.message); }
  }
  async function remove(app) {
    if (!confirm(`Delete ${app.company} — ${app.role_title}? This cannot be undone.`)) return;
    try { await api.deleteApplication(app.id); onChanged(); }
    catch (e) { alert(e.message); }
  }

  const arrow = (k) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search company, role, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
          <option value="">All tracks</option>
          {tracks.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="faint mono" style={{ fontSize: 12 }}>{rows.length} of {apps.length}</span>
      </div>

      <div className="table-wrap">
        <table className="apps">
          <thead>
            <tr>
              <th onClick={() => toggleSort('company')} style={{ cursor: 'pointer' }}>Company / Role{arrow('company')}</th>
              <th onClick={() => toggleSort('track')} style={{ cursor: 'pointer' }}>Track{arrow('track')}</th>
              <th onClick={() => toggleSort('platform')} style={{ cursor: 'pointer' }}>Platform{arrow('platform')}</th>
              <th onClick={() => toggleSort('date_applied')} style={{ cursor: 'pointer' }}>Applied{arrow('date_applied')}</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="company">
                    {a.source_url ? <a href={a.source_url} target="_blank" rel="noopener">{a.company}</a> : a.company}
                  </div>
                  <div className="role">{a.role_title}</div>
                </td>
                <td>{a.track || <span className="faint">—</span>}</td>
                <td>{a.platform || <span className="faint">—</span>}</td>
                <td className="mono" style={{ fontSize: 12 }}>{a.date_applied ? shortDate(a.date_applied) : <span className="faint">—</span>}</td>
                <td>
                  <select
                    className="chip-select"
                    value={a.status}
                    onChange={(e) => quickStatus(a, e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                    title="Quick status change"
                  >
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-ghost btn-sm" onClick={() => onEdit(a)}>Edit</button>
                    <button className="btn-ghost btn-sm btn-danger" onClick={() => remove(a)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6}><div className="empty">No applications match.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
