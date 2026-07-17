import React, { useState } from 'react';
import { api } from '../api.js';
import { FitRing } from './ui.jsx';
import { shortDate } from '../format.js';

// "Today's top picks" — the daily agent's recommendations, New first / fit desc.
// Optimized for speed: open the posting, download docs, mark applied, next.
export default function TopPicks({ recs, onChanged }) {
  const active = recs.filter((r) => r.status !== 'Dismissed');
  if (!active.length) {
    return (
      <div className="card card-pad empty">
        No new recommendations in the queue. Your daily agent will post fresh picks here.
      </div>
    );
  }
  return (
    <div className="picks">
      {active.map((r) => <Pick key={r.id} rec={r} onChanged={onChanged} />)}
    </div>
  );
}

function Pick({ rec, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      // Only record the application and refresh — opening the posting is the
      // separate "Open posting" button's job.
      await api.applyRecommendation(rec.id);
      onChanged();
    } catch (e) { alert(e.message); setBusy(false); }
  }
  async function dismiss() {
    setBusy(true);
    try { await api.dismissRecommendation(rec.id); onChanged(); }
    catch (e) { alert(e.message); setBusy(false); }
  }

  const hasResume = rec.resume_pdf || rec.resume_docx;
  const hasCover = rec.cover_pdf || rec.cover_docx;
  const resumeHref = api.fileUrl(rec.id, rec.resume_pdf ? 'resume_pdf' : 'resume_docx');
  const coverHref = api.fileUrl(rec.id, rec.cover_pdf ? 'cover_pdf' : 'cover_docx');

  return (
    <div className="pick">
      <div className="head">
        <div>
          <div className="co">{rec.company || 'Unknown company'}</div>
          <div className="ro">{rec.role_title}</div>
        </div>
        <FitRing score={rec.fit_score} />
      </div>

      <div className="meta">
        {rec.chosen_track && <span className="tag">{rec.chosen_track}</span>}
        {rec.location_type && <span className="tag">{rec.location_type}</span>}
        {rec.engagement_type && <span className="tag">{rec.engagement_type}</span>}
        {rec.source && <span className="tag">{rec.source}</span>}
        {rec.comp && <span className="tag">{rec.comp}</span>}
        {rec.date_surfaced && <span className="tag">{shortDate(rec.date_surfaced)}</span>}
      </div>

      {rec.rationale && <div className="rationale">{rec.rationale}</div>}

      {(rec.green_flags?.length || rec.red_flags?.length) ? (
        <div className="flags">
          {(rec.green_flags || []).map((f, i) => (
            <div className="flag green" key={'g' + i}><span className="ic">+</span><span>{f}</span></div>
          ))}
          {(rec.red_flags || []).map((f, i) => (
            <div className="flag red" key={'r' + i}><span className="ic">−</span><span>{f}</span></div>
          ))}
        </div>
      ) : null}

      {rec.brief ? (
        <details className="brief">
          <summary>Company brief</summary>
          <div className="brief-body">{rec.brief}</div>
        </details>
      ) : null}

      <div className="actions">
        {rec.source_url && (
          <a className="btn btn-sm btn-primary" href={rec.source_url} target="_blank" rel="noopener">Open posting ↗</a>
        )}
        {hasResume && <a className="btn btn-sm" href={resumeHref}>Resume</a>}
        {hasCover && <a className="btn btn-sm" href={coverHref}>Cover letter</a>}
        <button className="btn btn-sm" disabled={busy} onClick={apply}>Mark applied</button>
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={dismiss}>Skip</button>
      </div>
    </div>
  );
}

// Recoverable dismissals. A dismissed card lands here (collapsed by default) and
// can be restored in one click, so a stray or rapid Skip is never permanent.
export function DismissedPanel({ recs, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  if (!recs.length) return null;

  async function restore(id) {
    setBusyId(id);
    try { await api.restoreRecommendation(id); onChanged(); }
    catch (e) { alert(e.message); setBusyId(null); }
  }

  return (
    <details className="dismissed-panel">
      <summary>Dismissed ({recs.length}) · click to review or restore</summary>
      <div className="list" style={{ marginTop: 10 }}>
        {recs.map((r) => (
          <div className="list-row" key={r.id}>
            <div className="grow">
              <div className="co">{r.company} <span className="faint" style={{ fontWeight: 400 }}>· {r.role_title}</span></div>
              <div className="meta">{[r.chosen_track, r.location_type, r.comp].filter(Boolean).join(' · ')}</div>
            </div>
            <button className="btn btn-sm" disabled={busyId === r.id} onClick={() => restore(r.id)}>↩ Restore</button>
          </div>
        ))}
      </div>
    </details>
  );
}
