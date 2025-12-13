// frontend/src/services/interactions.js
import api from './api';

export const companyInteractionService = {
  // Like a company with optional reason data
  like: async (companyId, reasonData = {}) => {
    const response = await api.post(`/companies/${companyId}/like`, reasonData);
    return response.data;
  },

  // Dislike a company with optional reason data
  dislike: async (companyId, reasonData = {}) => {
    const response = await api.post(`/companies/${companyId}/dislike`, reasonData);
    return response.data;
  },

  // Remove interaction (unlike/undislike)
  remove: async (companyId) => {
    const response = await api.delete(`/companies/${companyId}/interaction`);
    return response.data;
  },

  // Get user's interaction with a specific company
  get: async (companyId) => {
    const response = await api.get(`/companies/${companyId}/interaction`);
    return response.data;
  },

  // Get all user's company interactions
  getUserInteractions: async () => {
    const response = await api.get('/companies/interactions/user');
    return response.data;
  }
};
