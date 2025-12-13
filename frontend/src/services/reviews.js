// frontend/src/services/reviews.js
import api from './api';

export const reviewService = {
  // Company Reviews
  company: {
    // Create or update a company review
    create: async (companyId, reviewData) => {
      const response = await api.post(`/companies/${companyId}/reviews`, reviewData);
      return response.data;
    },

    // Get all reviews for a company
    getAll: async (companyId, params = {}) => {
      const { limit = 20, offset = 0, sort_by = 'recent' } = params;
      const response = await api.get(`/companies/${companyId}/reviews`, {
        params: { limit, offset, sort_by }
      });
      return response.data;
    }
  },

  // Internship Reviews
  internship: {
    // Create or update an internship review
    create: async (internshipId, reviewData) => {
      const response = await api.post(`/internships/${internshipId}/reviews`, reviewData);
      return response.data;
    },

    // Get all reviews for an internship
    getAll: async (internshipId, params = {}) => {
      const { limit = 20, offset = 0, sort_by = 'recent' } = params;
      const response = await api.get(`/internships/${internshipId}/reviews`, {
        params: { limit, offset, sort_by }
      });
      return response.data;
    }
  },

  // Mark a review as helpful
  markHelpful: async (reviewId) => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
  },

  // Delete a review (only by author)
  delete: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // Get all reviews by a specific user
  getUserReviews: async (candidateId) => {
    try {
      const response = await api.get(`/reviews/user/${candidateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      // Return empty array as fallback
      return { reviews: [] };
    }
  }
};
