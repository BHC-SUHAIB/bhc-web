// Small display formatters.
export function pct(x, digits = 0) {
  if (x == null || isNaN(x)) return '—';
  return (x * 100).toFixed(digits) + '%';
}
export function num(x) { return x == null || isNaN(x) ? '—' : String(x); }
export function oneDp(x) { return x == null || isNaN(x) ? '—' : (Math.round(x * 10) / 10).toString(); }

export function shortDate(s) {
  if (!s) return '';
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
export function chipClass(status) {
  const key = String(status || 'Saved').split(' ')[0]; // "Recruiter Screen" -> "Recruiter", "Final Round" -> "Final"
  return `chip s-${key}`;
}
// Parse a comp string into an approximate annual midpoint (USD) for aggregate
// stats. Best-effort only — the raw string is always what's displayed.
export function compMidpoint(comp) {
  if (!comp) return null;
  const s = String(comp).toLowerCase();
  const nums = [];
  const re = /\$?\s*([0-9][0-9,\.]*)\s*(k|m)?/g;
  let m;
  while ((m = re.exec(s))) {
    let v = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(v)) continue;
    if (m[2] === 'k') v *= 1000;
    else if (m[2] === 'm') v *= 1000000;
    else if (v < 1000 && /hour|hr|\/h/.test(s)) v = v * 2080; // hourly → annual
    if (v >= 1000) nums.push(v);
  }
  if (!nums.length) return null;
  const lo = Math.min(...nums), hi = Math.max(...nums);
  return Math.round((lo + hi) / 2);
}
export function usd(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
}
