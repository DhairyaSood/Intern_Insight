import api from './api';

export const authService = {
  // User signup
  signup: async (username, password) => {
    const response = await api.post('/auth/signup', { username, password });
    return response.data;
  },

  // User login - returns JWT token
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, username: user, candidate_id } = response.data;
    
    // Store JWT token
    if (token) {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('username', user);
      localStorage.setItem('candidate_id', candidate_id);
    }
    
    return response.data;
  },

  // User logout
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear all auth data
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('username');
      localStorage.removeItem('candidate_id');
    }
  },

  // Check auth status with JWT
  checkStatus: async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      throw new Error('No token found');
    }
    
    const response = await api.get('/auth/status');
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  // Get current JWT token
  getToken: () => {
    return localStorage.getItem('jwt_token');
  },

  // Get current user
  getCurrentUser: () => {
    return {
      username: localStorage.getItem('username'),
      candidate_id: localStorage.getItem('candidate_id')
    };
  },

  // Check if authenticated (has valid token)
  isAuthenticated: () => {
    return !!localStorage.getItem('jwt_token');
  },
};

export default authService;
