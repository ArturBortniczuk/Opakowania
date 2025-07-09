// src/utils/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to make authenticated requests
const makeRequest = async (url, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  async login(nip, password, loginMode = 'client') {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nip, password, loginMode }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },

  async register(nip, password, confirmPassword, loginMode = 'client') {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nip, password, confirmPassword, loginMode }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    return data;
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
};

// Drums API
export const drumsAPI = {
  async getDrums(nip = null) {
    const url = nip ? `/api/drums?nip=${nip}` : '/api/drums';
    return makeRequest(url);
  },

  async getDrum(id) {
    return makeRequest(`/api/drums/${id}`);
  }
};

// Companies API
export const companiesAPI = {
  async getCompanies() {
    return makeRequest('/api/companies');
  },

  async getCompany(nip) {
    return makeRequest(`/api/companies/${nip}`);
  },

  async updateCompany(nip, data) {
    return makeRequest(`/api/companies/${nip}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
};

// Returns API
export const returnsAPI = {
  async getReturns(nip = null) {
    const url = nip ? `/api/returns?nip=${nip}` : '/api/returns';
    return makeRequest(url);
  },

  async createReturn(returnData) {
    return makeRequest('/api/returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  },

  async updateReturnStatus(id, status) {
    return makeRequest(`/api/returns?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
};

// Return Periods API
export const returnPeriodsAPI = {
  async getReturnPeriods() {
    return makeRequest('/api/return-periods');
  },

  async getReturnPeriod(nip) {
    return makeRequest(`/api/return-periods/${nip}`);
  },

  async updateReturnPeriod(nip, days) {
    return makeRequest(`/api/return-periods/${nip}`, {
      method: 'PUT',
      body: JSON.stringify({ returnPeriodDays: days }),
    });
  }
};

// Stats API (dla dashboardu)
export const statsAPI = {
  async getDashboardStats() {
    return makeRequest('/api/stats/dashboard');
  },

  async getAdminStats() {
    return makeRequest('/api/stats/admin');
  }
};

// Error handler helper
export const handleAPIError = (error, setError = null) => {
  console.error('API Error:', error);
  
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z serwerem';
  
  if (setError) {
    setError(errorMessage);
  }
  
  // If token is invalid, redirect to login
  if (errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
    authAPI.logout();
    window.location.href = '/';
  }
  
  return errorMessage;
};

// Request interceptor for automatic token refresh (optional)
export const setupAPIInterceptors = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    if (response.status === 401) {
      // Token expired or invalid
      authAPI.logout();
      window.location.href = '/';
    }
    
    return response;
  };
};

// Initialize API on app start
export const initAPI = () => {
  setupAPIInterceptors();
  
  // Check if user is still logged in on app start
  const token = getAuthToken();
  const user = localStorage.getItem('currentUser');
  
  if (token && user) {
    try {
      JSON.parse(user); // Validate stored user data
    } catch (error) {
      // Invalid user data, logout
      authAPI.logout();
    }
  }
};