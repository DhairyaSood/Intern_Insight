import api from './api';

export const authService = {
  // User signup
  signup: async (username, password) => {
    const response = await api.post('/auth/signup', { username, password });
    // Handle both response formats: direct data or wrapped in 'data' field
    return response.data.data || response.data;
  },

  // User login - returns JWT token
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    // Handle both response formats: direct data or wrapped in 'data' field
    const responseData = response.data.data || response.data;
    const { token, username: user, candidate_id } = responseData;
    
    // Store JWT token
    if (token) {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('username', user);
      localStorage.setItem('candidate_id', candidate_id);
    }
    
    return responseData;
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
    // Handle both response formats: direct data or wrapped in 'data' field
    return response.data.data || response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    // Handle both response formats: direct data or wrapped in 'data' field
    return response.data.data || response.data;
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
