// Thin fetch wrapper. All calls are same-origin and credentialed (session
// cookie). A 401 surfaces as { unauthorized: true } so the app can drop back
// to the login gate.
async function req(method, url, body) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.unauthorized = true;
    throw err;
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req('GET', '/api/me'),
  login: (password) => req('POST', '/api/login', { password }),
  logout: () => req('POST', '/api/logout'),

  listApplications: () => req('GET', '/api/applications'),
  createApplication: (app) => req('POST', '/api/applications', app),
  updateApplication: (id, patch) => req('PUT', `/api/applications/${encodeURIComponent(id)}`, patch),
  deleteApplication: (id) => req('DELETE', `/api/applications/${encodeURIComponent(id)}`),

  getSettings: () => req('GET', '/api/settings'),
  updateSettings: (patch) => req('PUT', '/api/settings', patch),

  listRecommendations: (opts = {}) => req('GET', '/api/recommendations' + (opts.all ? '?all=1' : '')),
  applyRecommendation: (id) => req('POST', `/api/recommendations/${encodeURIComponent(id)}/apply`),
  dismissRecommendation: (id) => req('POST', `/api/recommendations/${encodeURIComponent(id)}/dismiss`),
  restoreRecommendation: (id) => req('POST', `/api/recommendations/${encodeURIComponent(id)}/restore`),

  exportUrl: '/api/export',
  fileUrl: (recId, kind) => `/api/files/${encodeURIComponent(recId)}/${kind}`,
};
