import { API_URL } from './utils';
import { useAuthStore } from '@/store/authStore';

interface ApiOptions extends RequestInit {
  token?: string | null;
  skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setAccessToken(data.accessToken);
    return data.accessToken as string;
  } catch {
    logout();
    return null;
  }
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token: tokenOverride, headers, skipAuth, ...rest } = options;
  let token = tokenOverride ?? useAuthStore.getState().accessToken;

  const doFetch = (authToken: string | null | undefined) =>
    fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: {
        ...(rest.body && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken && !skipAuth ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
    });

  let res = await doFetch(token);
  let data = await res.json().catch(() => ({}));

  if (res.status === 401 && !skipAuth && useAuthStore.getState().refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
      data = await res.json().catch(() => ({}));
    }
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data as T;
}

export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data as T;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  roomCode: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  participants: string[] | User[];
  transcript?: string;
  summary?: string;
  sharedNotes?: string;
  actionItems: ActionItem[];
  chatMessages?: ChatMessage[];
  recordingUrl?: string;
  durationMinutes?: number;
  createdAt: string;
}

export interface ActionItem {
  _id: string;
  text: string;
  assigneeName?: string;
  completed: boolean;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  ownerId: User | string;
  members: { userId: string; role: string }[];
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  teamId: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeName?: string;
  projectId: string;
  order: number;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
