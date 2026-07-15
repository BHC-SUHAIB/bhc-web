import React from 'react';
import { pct, oneDp, num, shortDate, usd, compMidpoint } from '../format.js';
import { Card } from './ui.jsx';
import { isApplied } from '../metrics.js';

// The full analytics surface. Preserves every metric from the original tracker
// (funnel, rates, by-group volume+response, weekly vs target, avg days to
// response, 14+ day aging, active pipeline) and adds a few useful reads
// (median comp, offer rate, cumulative pace).
export default function Analytics({ metrics, apps }) {
  const m = metrics;

  // Median comp midpoint across applied roles (best-effort parse).
  const mids = apps.filter(isApplied).map((a) => compMidpoint(a.comp)).filter((n) => n != null).sort((a, b) => a - b);
  const median = mids.length ? mids[Math.floor(mids.length / 2)] : null;

  return (
    <div>
      {/* ---- Headline stat tiles ---- */}
      <div className="stat-grid">
        <Stat label="Applied" value={m.appliedCount} sub={`${m.savedCount} saved / not yet applied`} />
        <Stat label="Response rate" value={pct(m.responseRate)} sub={`${m.respondedCount} responded`} accent />
        <Stat label="Interview rate" value={pct(m.interviewRate)} sub={`${m.interviewCount} reached interview`} />
        <Stat label="Offer rate" value={pct(m.offerRate)} sub={`${m.offerCount} offer${m.offerCount === 1 ? '' : 's'}`} />
        <Stat label="Avg days to response" value={m.avgDaysToResponse == null ? '—' : oneDp(m.avgDaysToResponse)} sub="from applied → first reply" />
        <Stat label="Median comp" value={usd(median)} sub={mids.length ? `across ${mids.length} roles` : 'n/a'} />
      </div>

      {/* ---- Funnel + weekly ---- */}
      <div className="grid-2" style={{ marginTop: 22 }}>
        <Card title="Pipeline funnel">
          <Funnel funnel={m.funnel} />
        </Card>
        <Card title="Weekly volume vs target" action={<span className="mono faint" style={{ fontSize: 12 }}>target {m.weeklyTarget}/wk</span>}>
          <Weekly weeks={m.weeks} target={m.weeklyTarget} />
        </Card>
      </div>

      {/* ---- Group breakdowns ---- */}
      <div className="grid-3" style={{ marginTop: 16 }}>
        <Card title="By platform"><GroupBars rows={m.byPlatform} /></Card>
        <Card title="By track"><GroupBars rows={m.byTrack} /></Card>
        <Card title="By engagement"><GroupBars rows={m.byEngagement} /></Card>
      </div>

      {/* ---- Aging + pipeline ---- */}
      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card title="No response · 14+ days" action={<span className="faint mono" style={{ fontSize: 12 }}>{m.aging.length}</span>}>
          {m.aging.length === 0 ? <div className="empty" style={{ padding: 18 }}>Nothing aging. 🎯</div> : (
            <div className="list">
              {m.aging.map(({ app, days }) => (
                <div className="list-row" key={app.id}>
                  <div className="grow">
                    <div className="co">{app.company}</div>
                    <div className="meta">{app.role_title} · applied {shortDate(app.date_applied)}</div>
                  </div>
                  <span className={`days-badge ${days > 21 ? 'hot' : 'warn'}`}>{days}d</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Active pipeline · by next action" action={<span className="faint mono" style={{ fontSize: 12 }}>{m.pipeline.length}</span>}>
          {m.pipeline.length === 0 ? <div className="empty" style={{ padding: 18 }}>No open next-actions.</div> : (
            <div className="list">
              {m.pipeline.slice(0, 12).map(({ app, due, overdue }) => (
                <div className="list-row" key={app.id}>
                  <div className="grow">
                    <div className="co">{app.company} <span className="faint" style={{ fontWeight: 400 }}>· {app.role_title}</span></div>
                    <div className="meta">{app.next_action}</div>
                  </div>
                  <span className={overdue ? 'days-badge hot' : 'days-badge'}>
                    {due ? (overdue ? 'overdue ' : '') + shortDate(app.next_action_due) : 'no date'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function Funnel({ funnel }) {
  const top = Math.max(1, funnel[0]?.count || 1);
  return (
    <div className="funnel">
      {funnel.map((f) => {
        const w = (f.count / top) * 100;
        const conv = funnel[0]?.count ? pct(f.count / funnel[0].count) : '—';
        return (
          <div className="funnel-row" key={f.stage}>
            <div className="name">{f.stage}</div>
            <div className="funnel-bar-track"><div className="funnel-bar-fill" style={{ width: w + '%' }} /></div>
            <div className="n">{f.count} · {conv}</div>
          </div>
        );
      })}
    </div>
  );
}

function Weekly({ weeks, target }) {
  const peak = Math.max(target || 0, ...weeks.map((w) => w.count), 1);
  return (
    <div style={{ position: 'relative' }}>
      <div className="weekly">
        {weeks.map((w, i) => {
          const h = (w.count / peak) * 100;
          const current = i === weeks.length - 1;
          return (
            <div className={`wk ${current ? 'current' : ''}`} key={w.key}>
              <div className="n">{w.count}</div>
              <div className="col" style={{ height: h + '%' }} title={`${w.key}: ${w.count}`} />
              <div className="lbl">{w.key.split('-W')[1] ? 'W' + w.key.split('-W')[1] : ''}</div>
            </div>
          );
        })}
      </div>
      {target > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(28px + ${(target / peak) * 132}px)`, borderTop: '1.5px dashed var(--accent)', pointerEvents: 'none' }}>
          <span className="mono" style={{ position: 'absolute', right: 0, top: -16, fontSize: 10, color: 'var(--accent)' }}>target {target}</span>
        </div>
      )}
    </div>
  );
}

function GroupBars({ rows }) {
  if (!rows.length) return <div className="empty" style={{ padding: 14 }}>No data yet.</div>;
  const maxVol = Math.max(1, ...rows.map((r) => r.volume));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.key}>
          <div className="bar-head">
            <span className="k">{r.key}</span>
            <span className="v">{r.volume} · {pct(r.responseRate)} resp</span>
          </div>
          <div className="bar-track"><div className="bar-fill vol" style={{ width: (r.volume / maxVol) * 100 + '%' }} /></div>
        </div>
      ))}
    </div>
  );
}
