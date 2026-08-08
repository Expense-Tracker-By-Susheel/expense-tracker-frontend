const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

export const setAuthData = (token, user) => {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user_info', JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_info');
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user_info');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const getHeaders = (isMultipart = false) => {
  const headers = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

async function handleResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      // Optional auto-logout on unauthorized
    }
    const errorMsg = data?.error || data?.detail || (typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Request failed');
    throw new Error(errorMsg || `Error ${response.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async register(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async login(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Statements
  async uploadStatement(formData) {
    const res = await fetch(`${API_BASE_URL}/statements/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  // Analytics
  async getDashboardAnalytics(year, month) {
    const query = new URLSearchParams();
    if (year) query.append('year', year);
    if (month) query.append('month', month);

    const res = await fetch(`${API_BASE_URL}/analytics/dashboard?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Transactions
  async getTransactions(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });

    const res = await fetch(`${API_BASE_URL}/transactions?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createTransaction(payload) {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateTransaction(id, payload) {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteTransaction(id) {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Categories & Tags
  async getCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createCategory(payload) {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getTags() {
    const res = await fetch(`${API_BASE_URL}/tags`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createTag(payload) {
    const res = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteTag(id) {
    const res = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Community
  async getUnsureMerchants() {
    const res = await fetch(`${API_BASE_URL}/community/unsure-merchants`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async classifyMerchant(pattern, category_id, tag_id = null) {
    const res = await fetch(`${API_BASE_URL}/community/classify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pattern, category_id, tag_id }),
    });
    return handleResponse(res);
  },
};
