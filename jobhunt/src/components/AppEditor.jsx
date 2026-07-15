import React, { useState } from 'react';
import { Modal } from './ui.jsx';
import { api } from '../api.js';
import { TRACKS, ENGAGEMENT_TYPES, LOCATION_TYPES, PLATFORMS, ALL_STATUSES } from '../metrics.js';

const BLANK = {
  company: '', role_title: '', track: '', engagement_type: '', platform: '',
  location_type: '', comp: '', source_url: '', date_applied: '', status: 'Saved',
  resume_version_used: '', contact: '', next_action: '', next_action_due: '', notes: '',
};

export default function AppEditor({ app, onClose, onSaved }) {
  const isEdit = !!app;
  const [form, setForm] = useState({ ...BLANK, ...(app || {}) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true); setErr('');
    try {
      if (isEdit) await api.updateApplication(app.id, form);
      else await api.createApplication(form);
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal
      title={isEdit ? 'Edit application' : 'Add application'}
      onClose={onClose}
      footer={<>
        {err && <span style={{ color: 'var(--bad)', fontSize: 13, marginRight: 'auto' }}>{err}</span>}
        <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={busy || !form.company}>{busy ? 'Saving…' : 'Save'}</button>
      </>}
    >
      <div className="form-grid">
        <Field label="Company"><input value={form.company} onChange={(e) => set('company', e.target.value)} autoFocus /></Field>
        <Field label="Role title"><input value={form.role_title} onChange={(e) => set('role_title', e.target.value)} /></Field>
        <Field label="Track"><Select value={form.track} opts={TRACKS} onChange={(v) => set('track', v)} /></Field>
        <Field label="Engagement"><Select value={form.engagement_type} opts={ENGAGEMENT_TYPES} onChange={(v) => set('engagement_type', v)} /></Field>
        <Field label="Platform"><Select value={form.platform} opts={PLATFORMS} onChange={(v) => set('platform', v)} /></Field>
        <Field label="Location"><Select value={form.location_type} opts={LOCATION_TYPES} onChange={(v) => set('location_type', v)} /></Field>
        <Field label="Status"><Select value={form.status} opts={ALL_STATUSES} onChange={(v) => set('status', v)} required /></Field>
        <Field label="Date applied"><input type="date" value={form.date_applied || ''} onChange={(e) => set('date_applied', e.target.value)} /></Field>
        <Field label="Comp"><input value={form.comp} onChange={(e) => set('comp', e.target.value)} placeholder="Salary: $100K–$125K" /></Field>
        <Field label="Resume version used"><input value={form.resume_version_used} onChange={(e) => set('resume_version_used', e.target.value)} /></Field>
        <Field label="Source URL" span><input value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://…" /></Field>
        <Field label="Contact"><input value={form.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        <Field label="Next action due"><input type="date" value={form.next_action_due || ''} onChange={(e) => set('next_action_due', e.target.value)} /></Field>
        <Field label="Next action" span><input value={form.next_action} onChange={(e) => set('next_action', e.target.value)} /></Field>
        <Field label="Notes" span><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      {isEdit && form.status_history?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="kicker" style={{ marginBottom: 6 }}>Status history</div>
          <div className="faint mono" style={{ fontSize: 12 }}>
            {form.status_history.map((h, i) => <span key={i}>{h.status} ({h.date}){i < form.status_history.length - 1 ? ' → ' : ''}</span>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, span, children }) {
  return (
    <label className={`field ${span ? 'col-span' : ''}`}>
      <span className="lab">{label}</span>
      {children}
    </label>
  );
}
function Select({ value, opts, onChange, required }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {!required && <option value="">—</option>}
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
