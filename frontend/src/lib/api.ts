import {
  CustomerSummary,
  CustomerDetail,
  DashboardData,
  Order,
  Communication,
  Workflow
} from '../types.js';

const TOKEN_KEY = 'pulse_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const data = await request<{ token: string; user: { name: string; username: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    },
    me: () => request<{ user: { name: string; username: string } }>('/api/auth/me'),
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } finally {
        clearStoredToken();
      }
    }
  },
  dashboard: {
    get: () => request<DashboardData>('/api/dashboard')
  },
  customers: {
    list: (params?: { search?: string; segment?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.segment && params.segment !== 'all') q.set('segment', params.segment);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<CustomerSummary[]>(`/api/customers${queryStr}`);
    },
    get: (id: string) => request<CustomerDetail>(`/api/customers/${id}`),
    generateMessage: (id: string) =>
      request<{
        message: string;
        source: 'ai' | 'template';
        subject: string;
        channel: 'whatsapp' | 'email' | 'note';
        discountPercent: number | null;
      }>(`/api/customers/${id}/generate-message`, { method: 'POST' }),
    logCommunication: (
      id: string,
      payload: { type: string; subject?: string; message: string; channel?: string; source?: string }
    ) =>
      request<Communication>(`/api/customers/${id}/communications`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },
  orders: {
    list: (params?: { status?: string }) => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<Order[]>(`/api/orders${queryStr}`);
    }
  },
  communications: {
    list: () => request<Communication[]>('/api/communications')
  },
  workflows: {
    list: () => request<Workflow[]>('/api/workflows'),
    create: (payload: { name: string; trigger: string; delayDays: number; subject: string; message: string; active?: boolean }) =>
      request<Workflow>('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: Partial<Workflow>) =>
      request<Workflow>(`/api/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/workflows/${id}`, {
        method: 'DELETE'
      })
  },
  sync: {
    status: () =>
      request<{
        mode: string;
        storeUrl: string | null;
        hasCredentials: boolean;
      }>('/api/sync/status'),
    syncStore: () =>
      request<{
        success: boolean;
        syncedCustomers: number;
        syncedOrders: number;
        touchedCustomers: number;
      }>('/api/sync', { method: 'POST' })
  },

  mock: {
    newOrder: () =>
      request<{
        success: boolean;
        fabricatedOrder: any;
        order: any;
        customer: { id: string; name: string; email: string };
      }>('/api/mock/new-order', { method: 'POST' })
  }
};

