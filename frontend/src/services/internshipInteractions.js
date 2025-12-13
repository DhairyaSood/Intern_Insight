// frontend/src/services/internshipInteractions.js
import api from './api';

export const internshipInteractionService = {
  // Like an internship with optional reason data
  like: async (internshipId, reasonData = {}) => {
    const response = await api.post(`/internships/${internshipId}/like`, reasonData);
    return response.data;
  },

  // Dislike an internship with optional reason data
  dislike: async (internshipId, reasonData = {}) => {
    const response = await api.post(`/internships/${internshipId}/dislike`, reasonData);
    return response.data;
  },

  // Remove interaction (unlike/undislike)
  remove: async (internshipId) => {
    const response = await api.delete(`/internships/${internshipId}/interaction`);
    return response.data;
  },

  // Get user's interaction with a specific internship
  get: async (internshipId) => {
    const response = await api.get(`/internships/${internshipId}/interaction`);
    return response.data;
  },

  // Get all user's internship interactions
  getUserInteractions: async () => {
    const response = await api.get('/internships/interactions/user');
    return response.data;
  }
};
