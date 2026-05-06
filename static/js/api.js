export const API_BASE = "https://secauditor.azurewebsites.net";

// ─── API Key ────────────────────────────────────────────────────
export function getApiKey() {
  let k = localStorage.getItem('auditor_api_key');
  if (!k) {
    k = prompt('請輸入 API Key（向管理員取得）：') || '';
    if (k) localStorage.setItem('auditor_api_key', k);
  }
  return k;
}

// ─── 使用者名稱（多租戶識別） ────────────────────────────────────
export function getUserName() {
  return localStorage.getItem('auditor_user_name') || '';
}

export function setUserName(name) {
  localStorage.setItem('auditor_user_name', name.trim());
}

// ─── JSON API ────────────────────────────────────────────────────
export async function api(method, path, body) {
  const opts = { method, headers: { 'X-API-Key': getApiKey() } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}/api${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiUpload(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': getApiKey() },
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── SSE（稽核發現串流） ─────────────────────────────────────────
export function openSSE(sessionId, format, { onChunk, onRepair, onDone, onError }) {
  const fmt = format || 'iia5c';
  const url = `${API_BASE}/api/sessions/${sessionId}/findings/stream?format=${fmt}&api_key=${encodeURIComponent(getApiKey())}`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (e) => {
    if (e.data === '[DONE]') {
      evtSource.close();
      onDone();
      return;
    }
    try {
      const parsed = JSON.parse(e.data);
      if (parsed.repair) onRepair(parsed.repair);
      else onChunk(parsed.chunk || '');
    } catch (_) {}
  };

  evtSource.onerror = () => {
    evtSource.close();
    onError();
  };
}
