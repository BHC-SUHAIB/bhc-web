/* Job Hunt Tracker: pure metric logic (ES module port of the original metrics.js).
   No DOM, no React, no side effects. All calendar dates normalized to UTC
   midnight so day-diffs and ISO weeks are timezone stable. Logic preserved
   verbatim from the original tracker; only the module wrapper changed. */

const STAGE_ORDER = ["Saved", "Applied", "Recruiter Screen", "Interview", "Final Round", "Offer"];
const FUNNEL_STAGES = ["Applied", "Recruiter Screen", "Interview", "Final Round", "Offer"];
const RESPONSE_STAGES = ["Recruiter Screen", "Interview", "Final Round", "Offer"];
const INTERVIEW_STAGES = ["Interview", "Final Round", "Offer"];
const TERMINAL = ["Rejected", "Withdrawn"];
const ALL_STATUSES = ["Saved", "Applied", "Recruiter Screen", "Interview", "Final Round", "Offer", "Rejected", "Withdrawn"];
const DAY = 86400000;

export function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}
function todayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
export function daysBetween(a, b) { return Math.round((b - a) / DAY); }

function reachedSet(app) {
  const s = {};
  (app.status_history || []).forEach(function (h) { if (h && h.status) s[h.status] = true; });
  if (app.status) s[app.status] = true;
  return s;
}
function anyOf(set, arr) { return arr.some(function (x) { return set[x]; }); }

export function isApplied(app) { return anyOf(reachedSet(app), ["Applied"].concat(RESPONSE_STAGES)); }

function firstResponseDate(app) {
  const applied = parseDate(app.date_applied);
  let best = null;
  (app.status_history || []).forEach(function (h) {
    if (!h) return;
    const isResp = RESPONSE_STAGES.indexOf(h.status) !== -1 || h.status === "Rejected";
    if (!isResp) return;
    const d = parseDate(h.date);
    if (d && (!applied || d >= applied)) { if (!best || d < best) best = d; }
  });
  return best;
}
export function hasResponded(app) { return !!firstResponseDate(app); }
export function reachedInterview(app) { return anyOf(reachedSet(app), INTERVIEW_STAGES); }
export function reachedOffer(app) { return !!reachedSet(app)["Offer"]; }

function isoWeek(d) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day);
  const monday = new Date(dt);
  const thu = new Date(dt); thu.setUTCDate(dt.getUTCDate() + 3);
  const firstThu = new Date(Date.UTC(thu.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thu - firstThu) / DAY - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return { key: thu.getUTCFullYear() + "-W" + String(week).padStart(2, "0"), monday: monday };
}

function groupStats(list, keyFn) {
  const map = {};
  list.forEach(function (a) {
    let k = keyFn(a);
    if (k === undefined || k === null || k === "") k = "Unspecified";
    (map[k] = map[k] || []).push(a);
  });
  const rows = Object.keys(map).map(function (k) {
    const arr = map[k];
    const resp = arr.filter(hasResponded).length;
    const iv = arr.filter(reachedInterview).length;
    const off = arr.filter(reachedOffer).length;
    return {
      key: k, volume: arr.length, responses: resp, interviews: iv, offers: off,
      responseRate: arr.length ? resp / arr.length : 0,
      interviewRate: arr.length ? iv / arr.length : 0
    };
  });
  rows.sort(function (a, b) { return b.volume - a.volume || (a.key < b.key ? -1 : 1); });
  return rows;
}

export function computeMetrics(apps, opts) {
  opts = opts || {};
  apps = Array.isArray(apps) ? apps : [];
  const today = opts.today ? parseDate(opts.today) : todayUTC();
  const weeklyTarget = opts.weeklyTarget || 0;

  const applied = apps.filter(isApplied);
  const responded = applied.filter(hasResponded);
  const interviews = applied.filter(reachedInterview);
  const offers = applied.filter(reachedOffer);
  const appliedCount = applied.length;

  const daysArr = responded.map(function (a) {
    return daysBetween(parseDate(a.date_applied), firstResponseDate(a));
  }).filter(function (n) { return n !== null && !isNaN(n) && n >= 0; });
  const avgDays = daysArr.length ? daysArr.reduce(function (x, y) { return x + y; }, 0) / daysArr.length : null;

  const funnel = FUNNEL_STAGES.map(function (stage) {
    const count = stage === "Applied" ? appliedCount
      : applied.filter(function (a) { return reachedSet(a)[stage]; }).length;
    return { stage: stage, count: count };
  });

  const statusCounts = ALL_STATUSES.map(function (s) {
    return { status: s, count: apps.filter(function (a) { return a.status === s; }).length };
  });

  const weeks = [];
  const base = isoWeek(today).monday;
  for (let i = 7; i >= 0; i--) {
    const m = new Date(base); m.setUTCDate(base.getUTCDate() - 7 * i);
    weeks.push({ key: isoWeek(m).key, monday: new Date(m), count: 0 });
  }
  applied.forEach(function (a) {
    const d = parseDate(a.date_applied); if (!d) return;
    const k = isoWeek(d).key;
    const w = weeks.filter(function (w) { return w.key === k; })[0];
    if (w) w.count++;
  });
  const thisWeek = weeks[weeks.length - 1];

  const aging = applied
    .filter(function (a) { return !hasResponded(a) && TERMINAL.indexOf(a.status) === -1; })
    .map(function (a) { return { app: a, days: daysBetween(parseDate(a.date_applied), today) }; })
    .filter(function (x) { return x.days > 14; })
    .sort(function (a, b) { return b.days - a.days; });

  const pipeline = apps
    .filter(function (a) { return a.next_action && String(a.next_action).trim() && TERMINAL.indexOf(a.status) === -1; })
    .map(function (a) {
      const due = parseDate(a.next_action_due);
      return { app: a, due: due, overdue: due ? due < today : false };
    })
    .sort(function (a, b) {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1; if (!b.due) return -1;
      return a.due - b.due;
    });

  return {
    total: apps.length,
    appliedCount: appliedCount,
    savedCount: apps.filter(function (a) { return !isApplied(a); }).length,
    respondedCount: responded.length,
    interviewCount: interviews.length,
    offerCount: offers.length,
    responseRate: appliedCount ? responded.length / appliedCount : 0,
    interviewRate: appliedCount ? interviews.length / appliedCount : 0,
    offerRate: appliedCount ? offers.length / appliedCount : 0,
    avgDaysToResponse: avgDays,
    funnel: funnel,
    statusCounts: statusCounts,
    byPlatform: groupStats(applied, function (a) { return a.platform; }),
    byTrack: groupStats(applied, function (a) { return a.track; }),
    byEngagement: groupStats(applied, function (a) { return a.engagement_type; }),
    weeks: weeks,
    thisWeek: thisWeek,
    weeklyTarget: weeklyTarget,
    aging: aging,
    pipeline: pipeline
  };
}

// ---- Select option constants ----
export const TRACKS = ["IT/Solutions", "Operations", "Analyst/Strategy"];
export const ENGAGEMENT_TYPES = ["W-2", "Contract", "C2H", "Fractional"];
export const LOCATION_TYPES = ["Remote", "Hybrid", "Onsite"];
export const PLATFORMS = ["LinkedIn", "Indeed", "ZipRecruiter", "Company Site", "Referral", "Other"];

function pad2(n) { return String(n).padStart(2, "0"); }
export function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
export function makeId(app, today) {
  const d = String(app.date_applied || today || todayStr()).slice(0, 10);
  return [d, slug(app.company), slug(app.role_title)].filter(Boolean).join("-");
}

export { STAGE_ORDER, FUNNEL_STAGES, RESPONSE_STAGES, INTERVIEW_STAGES, TERMINAL, ALL_STATUSES };
