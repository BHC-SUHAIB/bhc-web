// Small pure helpers shared by server routes (id generation, slugging).
// Kept in sync with the client's metrics.js makeId() so ids are stable
// whether a record is created via the UI or the ingest API.
function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
export function makeId(app, today) {
  const d = String(app.date_applied || today || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return [d, slug(app.company), slug(app.role_title)].filter(Boolean).join('-');
}
export { slug };
