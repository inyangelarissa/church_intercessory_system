const API_BASE = "/api";
const TOKEN_KEY = "erc_masoro_token";
const USER_KEY = "erc_masoro_user";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** True once we've detected that no API server is reachable (e.g. a static published preview). */
let apiUnreachable = false;
export function isOfflineMode() {
  return apiUnreachable;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    apiUnreachable = false;
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try { message = (await res.json()).error || message; } catch { /* noop */ }
      throw new ApiError(message, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network error / timeout / no server present — mark offline so UI can fall back to demo data.
    apiUnreachable = true;
    throw new OfflineError();
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export class OfflineError extends Error {
  constructor() { super("The API server isn't reachable right now."); }
}

export const api = {
  auth: {
    signup: (payload: { name: string; email: string; phone?: string; role: string; password: string }) =>
      request<{ token: string; user: AuthUser }>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    me: () => request<{ user: AuthUser }>("/auth/me"),
  },
  dashboard: {
    stats: () => request<any>("/dashboard/stats"),
  },
  prayerRequests: {
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
