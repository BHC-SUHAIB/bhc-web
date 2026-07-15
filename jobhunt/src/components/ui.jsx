import React, { useEffect } from 'react';
import { chipClass } from '../format.js';

export function StatusChip({ status }) {
  return <span className={chipClass(status)}>{status}</span>;
}

// Small circular fit-score ring (0–100). Brass fill on a sunken track.
export function FitRing({ score }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = 22, c = 2 * Math.PI * r;
  const off = c * (1 - s / 100);
  const stroke = s >= 80 ? 'var(--good)' : s >= 60 ? 'var(--brass)' : s >= 40 ? 'var(--warn)' : 'var(--fg-faint)';
  return (
    <div className="fit">
      <svg className="ring" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke={stroke} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="15" fontWeight="600" fill="var(--fg)">{s}</text>
      </svg>
      <div className="lbl">Fit</div>
    </div>
  );
}

export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card card-pad ${className}`}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          {title && <h3 style={{ fontSize: 16 }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
