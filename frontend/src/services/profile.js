import api from './api';

export const profileService = {
  // Create or update profile
  createOrUpdate: async (profileData) => {
    const response = await api.post('/profile', profileData);
    return response.data;
  },

  // Update profile (alias for createOrUpdate for compatibility)
  updateProfile: async (candidateId, profileData) => {
    const response = await api.post('/profile', profileData);
    return response.data;
  },

  // Get profile by candidate ID
  getProfile: async (candidateId) => {
    const response = await api.get(`/profile/${candidateId}`);
    return response.data?.data || response.data;
  },

  // Get profile by username
  getByUsername: async (username) => {
    const response = await api.get(`/profiles/by_username/${username}`);
    return response.data?.data || response.data;
  },

  // Get profile by candidate ID (alias)
  getById: async (candidateId) => {
    const response = await api.get(`/profile/${candidateId}`);
    return response.data?.data || response.data;
  },

  // Get user interactions (likes/dislikes)
  getInteractions: async (candidateId) => {
    try {
      const response = await api.get(`/interactions/${candidateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching interactions:', error);
      // Return empty array as fallback
      return { interactions: [] };
    }
  },
};

export default profileService;
