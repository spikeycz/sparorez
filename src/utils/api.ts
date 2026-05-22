import type { Room } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');
const TOKEN_KEY = 'sparorez-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...opts });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Auth
  register: (email: string, name: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, name, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ ok: boolean; resetToken?: string }>('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token, password }),
    }),
  getMe: () => apiFetch<AuthUser>('/api/auth/me'),

  // Projects
  getProjects: () => apiFetch<Project[]>('/api/projects'),
  createProject: (name: string) =>
    apiFetch<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  updateProject: (id: string, name: string) =>
    apiFetch<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteProject: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Rooms (under project)
  getRooms: (projectId: string) => apiFetch<Room[]>(`/api/projects/${projectId}/rooms`),
  saveRooms: (projectId: string, rooms: Room[]) =>
    apiFetch<{ ok: boolean }>(`/api/projects/${projectId}/rooms`, {
      method: 'PUT', body: JSON.stringify(rooms),
    }),

  // Purchased tiles (under project)
  getPurchased: (projectId: string) =>
    apiFetch<Record<string, number>>(`/api/projects/${projectId}/purchased`),
  savePurchased: (projectId: string, tiles: Record<string, number>) =>
    apiFetch<{ ok: boolean }>(`/api/projects/${projectId}/purchased`, {
      method: 'PUT', body: JSON.stringify(tiles),
    }),

  // Admin
  adminGetStats: () => apiFetch<AdminStats>('/api/admin/stats'),
  adminGetUsers: () => apiFetch<AdminUser[]>('/api/admin/users'),
  adminDeleteUser: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminToggleAdmin: (id: string, isAdmin: boolean) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${id}/admin`, {
      method: 'PUT', body: JSON.stringify({ is_admin: isAdmin }),
    }),
};

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalRooms: number;
  recentUsers: { date: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  project_count: number;
}
