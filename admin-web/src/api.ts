const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "melgar_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type FetchOpts = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) };
  const tk = getToken();
  if (tk) headers.Authorization = `Bearer ${tk}`;

  let body: BodyInit | null | undefined;
  const raw = opts.body;
  if (raw == null) {
    body = null;
  } else if (raw instanceof FormData || raw instanceof Blob || typeof raw === "string") {
    body = raw;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(raw);
  }

  const r = await fetch(`${BASE}${path}`, { ...opts, headers, body });
  if (r.status === 401) {
    clearToken();
    if (location.pathname !== "/login") location.href = "/login";
    throw new Error("no autenticado");
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const data = await r.json();
      msg = (data as { error?: string }).error || msg;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}
