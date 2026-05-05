import axios from 'axios';

// Use relative URL in development (Vite will proxy to backend)
// Use environment variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Include credentials for cookies if needed
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

// Vendor services
export const vendorService = {
  getAll: async (params = {}) => {
    const response = await api.get('/vendors', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },
  
  create: async (vendorData) => {
    const response = await api.post('/vendors', vendorData);
    return response.data;
  },
  
  update: async (id, vendorData) => {
    const response = await api.put(`/vendors/${id}`, vendorData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },
};

// Assessment services
export const assessmentService = {
  create: async (assessmentData) => {
    const response = await api.post('/assessments', assessmentData);
    return response.data;
  },
  
  sendInvite: async (token, customMessage) => {
    const response = await api.post(`/assessments/${token}/send`, { custom_message: customMessage });
    return response.data;
  },
  
  getByToken: async (token) => {
    const response = await api.get(`/assessments/vendor/${token}`);
    return response.data;
  },
  
  saveResponses: async (token, responses) => {
    const response = await api.put(`/assessments/vendor/${token}/responses`, { responses });
    return response.data;
  },
  
  submit: async (token) => {
    const response = await api.post(`/assessments/vendor/${token}/submit`);
    return response.data;
  },
  
  getAll: async (params = {}) => {
    const response = await api.get('/assessments', { params });
    return response.data;
  },
};

// Risk services
export const riskService = {
  getAll: async (params = {}) => {
    const response = await api.get('/risks', { params });
    return response.data;
  },
  
  create: async (riskData) => {
    const response = await api.post('/risks', riskData);
    return response.data;
  },
  
  update: async (id, riskData) => {
    const response = await api.put(`/risks/${id}`, riskData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/risks/${id}`);
    return response.data;
  },
  
  getMatrix: async () => {
    const response = await api.get('/risks/matrix');
    return response.data;
  },
};

// Document services
export const documentService = {
  upload: async (formData) => {
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  download: async (id) => {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
  
  getExpiring: async (days = 30) => {
    const response = await api.get('/documents/alerts/expiring', { params: { days } });
    return response.data;
  },
};

export default api;
