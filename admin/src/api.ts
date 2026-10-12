export type QuestionType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'select';

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  company_name: string;
  phone: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Respondent {
  id: number;
  email: string;
  status: string;
  updated_at: string;
  created_at: string;
  client_id: number;
  client_name: string;
  company_name: string;
  client_slug: string;
}

export interface RespondentDetail extends Respondent {
  answers: { question_id: number; question_text: string; type: QuestionType; value: any }[];
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AppUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  answersReceived: number;
  questionsCount: number;
  companiesCount: number;
}

const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/websitediscovery';

const ADMIN_BASE = `${BASE_PATH}/api/admin`;
const AUTH_BASE = `${BASE_PATH}/api/auth`;
const TOKEN_KEY = 'qadmin_token';

class ApiError extends Error {}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Every fetch goes through here. On a 401 caused by an expired/invalid
// token that WAS sent, clear it and broadcast an event the AuthContext
// listens for so the whole app snaps back to the login screen. A 401 from
// a plain failed login attempt (no token was being sent) is left alone -
// that's just "wrong password", not a session expiring.
async function rawRequest<T>(fullPath: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(fullPath, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('qadmin:unauthorized'));
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError((body && body.error) || `Request failed (${res.status})`);
  }
  return body as T;
}

function request<T>(path: string, options?: RequestInit): Promise<T> {
  return rawRequest<T>(`${ADMIN_BASE}${path}`, options);
}

export const api = {
  // Questions
  listQuestions: () => request<Question[]>('/questions'),
  createQuestion: (data: Partial<Question>) =>
    request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: Partial<Question>) =>
    request<Question & { created?: boolean }>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) => request<void>(`/questions/${id}`, { method: 'DELETE' }),

  // Groups
  listGroups: () => request<Group[]>('/groups'),
  createGroup: (data: { name: string }) => request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: number, data: { name: string }) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: number) => request<void>(`/groups/${id}`, { method: 'DELETE' }),
  getGroupQuestions: (id: number) => request<Question[]>(`/groups/${id}/questions`),
  setGroupQuestions: (id: number, questionIds: number[]) =>
    request<void>(`/groups/${id}/questions`, { method: 'PUT', body: JSON.stringify({ questionIds }) }),

  // Categories
  listCategories: () => request<Category[]>('/categories'),
  createCategory: (data: { name: string }) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name: string }) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  getCategoryGroups: (id: number) => request<Group[]>(`/categories/${id}/groups`),
  setCategoryGroups: (id: number, groupIds: number[]) =>
    request<void>(`/categories/${id}/groups`, { method: 'PUT', body: JSON.stringify({ groupIds }) }),

  // Clients
  listClients: () => request<Client[]>('/clients'),
  createClient: (data: { name: string; email: string; companyName: string; phone?: string }) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: { name: string; email: string; companyName: string; phone?: string }) =>
    request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: number) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  getClientCategories: (id: number) => request<Category[]>(`/clients/${id}/categories`),
  setClientCategories: (id: number, categoryIds: number[]) =>
    request<void>(`/clients/${id}/categories`, { method: 'PUT', body: JSON.stringify({ categoryIds }) }),

  // Respondents / answers
  listRespondents: (clientId?: number) =>
    request<Respondent[]>(`/respondents${clientId ? `?clientId=${clientId}` : ''}`),
  getRespondent: (id: number) => request<RespondentDetail>(`/respondents/${id}`),

  // Auth
  login: (email: string, password: string) =>
    rawRequest<{ token: string; user: AuthUser }>(`${AUTH_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => rawRequest<{ user: AuthUser }>(`${AUTH_BASE}/me`),

  // Users
  listUsers: () => request<AppUser[]>('/users'),
  createUser: (data: { fullName: string; email: string; phone?: string; password: string; role: UserRole }) =>
    request<AppUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (
    id: number,
    data: { fullName: string; email: string; phone?: string; password?: string; role: UserRole }
  ) => request<AppUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
};

export { ApiError };
