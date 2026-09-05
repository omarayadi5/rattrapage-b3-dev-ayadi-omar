import type { Task, TaskList, TokenPair } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const ACCESS_KEY = "task_manager_access";
const REFRESH_KEY = "task_manager_refresh";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const response = await fetch(`${API_URL}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const data = await response.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return true;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const access = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.detail ?? JSON.stringify(body) ?? response.statusText;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function register(username: string, email: string, password: string): Promise<void> {
  await request("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(username: string, password: string): Promise<void> {
  const tokens = await request<TokenPair>("/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setTokens(tokens);
}

export function logout(): void {
  clearTokens();
}

export async function listTasks(): Promise<Task[]> {
  const data = await request<TaskList>("/tasks/");
  return data.results;
}

export async function createTask(title: string, description: string): Promise<Task> {
  return request<Task>("/tasks/", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export async function updateTask(id: number, changes: Partial<Pick<Task, "title" | "description" | "completed">>): Promise<Task> {
  return request<Task>(`/tasks/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export async function deleteTask(id: number): Promise<void> {
  await request<void>(`/tasks/${id}/`, { method: "DELETE" });
}
