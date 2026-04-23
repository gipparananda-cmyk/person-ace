import type { ApiResponse } from "./types";

const STORAGE_KEY = "ems_auth";
const API_BASE_KEY = "ems_api_base";

export function getApiBase(): string {
  if (typeof window === "undefined") return "http://localhost:3000/api";
  return localStorage.getItem(API_BASE_KEY) || "http://localhost:3000/api";
}

export function setApiBase(url: string) {
  localStorage.setItem(API_BASE_KEY, url);
}

export interface AuthData {
  token: string;
  user: { id: string; email: string; role: "ADMIN" | "HR" | "EMPLOYEE"; isActive: boolean };
}

export function getAuth(): AuthData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthData; } catch { return null; }
}

export function setAuth(data: AuthData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const auth = getAuth();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  } catch (err) {
    throw new ApiError(
      "Cannot reach API. Check API base URL and CORS.",
      0,
    );
  }

  let body: ApiResponse<T> | null = null;
  try { body = (await res.json()) as ApiResponse<T>; } catch { /* ignore */ }

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(body?.message || "Unauthorized", 401);
  }

  if (!res.ok || (body && body.success === false)) {
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status);
  }

  return (body?.data as T);
}