const API_BASE = "/api";
const TOKEN_KEY = "erc_masoro_token";
const USER_KEY = "erc_masoro_user";

// A sleeping server (e.g. a Fly machine waking up) can take several seconds to answer.
const REQUEST_TIMEOUT_MS = 30000;

export const SENIOR_ROLE = "Senior Intercessor";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: string;
}

export function isSenior(user: AuthUser | null | undefined): boolean {
  return user?.role === SENIOR_ROLE;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && getToken() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export class OfflineError extends Error {
  constructor() { super("Can't reach the server. Please check your connection and try again."); }
}

/** A readable message for any error thrown by the API client. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof OfflineError) return err.message;
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new OfflineError();
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).error || message; } catch { /* noop */ }
    // Session expired or account removed: send the user back to the login screen.
    if (res.status === 401 && token && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
      clearSession();
      window.dispatchEvent(new Event("erc:unauthorized"));
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  auth: {
    signup: (payload: { name: string; email: string; phone?: string; password: string }) =>
      request<{ token: string; user: AuthUser }>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    me: () => request<{ user: AuthUser }>("/auth/me"),
  },
  dashboard: {
    stats: () => request<any>("/dashboard/stats"),
  },
  prayerRequests: {
    /** Public: used by the congregation form on the home page (no login needed). */
    submitPublic: (payload: { name: string; contact?: string; email?: string; category: string; request: string; anonymous: boolean }) =>
      request<{ ok: true }>("/prayer-requests/public", { method: "POST", body: JSON.stringify(payload) }),
    list: () => request<any[]>("/prayer-requests"),
    create: (payload: any) => request<any>("/prayer-requests", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: number, payload: any) => request<any>(`/prayer-requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id: number) => request<void>(`/prayer-requests/${id}`, { method: "DELETE" }),
  },
  intercessors: {
    list: () => request<any[]>("/intercessors"),
    create: (payload: any) => request<any>("/intercessors", { method: "POST", body: JSON.stringify(payload) }),
    updateStatus: (id: number, status: "Active" | "Inactive") =>
      request<any>(`/intercessors/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
  schedule: {
    list: () => request<any[]>("/schedule"),
    create: (payload: any) => request<any>("/schedule", { method: "POST", body: JSON.stringify(payload) }),
  },
  activityRecords: {
    list: () => request<any[]>("/activity-records"),
  },
};
