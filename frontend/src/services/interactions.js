// frontend/src/services/interactions.js
import api from './api';

export const companyInteractionService = {
  // Like a company
  like: async (companyId) => {
    const response = await api.post(`/companies/${companyId}/like`);
    return response.data;
  },

  // Dislike a company
  dislike: async (companyId) => {
    const response = await api.post(`/companies/${companyId}/dislike`);
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
