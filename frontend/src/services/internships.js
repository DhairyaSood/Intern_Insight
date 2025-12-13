import api from './api';

export const internshipService = {
  // Get all internships
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/internships?${params}`);
    return response.data;
  },

  // Get internship by ID
  getById: async (id) => {
    const response = await api.get(`/internships/${id}`);
    return response.data;
  },

  // Get recommendations for candidate
  getRecommendations: async (candidateId, options = {}) => {
    const params = new URLSearchParams();
    if (options && typeof options === 'object') {
      if (options.limit !== undefined && options.limit !== null) params.set('limit', String(options.limit));
      if (options.min_score !== undefined && options.min_score !== null) params.set('min_score', String(options.min_score));
      if (options.dedupe_org !== undefined && options.dedupe_org !== null) params.set('dedupe_org', options.dedupe_org ? '1' : '0');
    }
    const qs = params.toString();
    const response = await api.get(`/recommendations/${candidateId}${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  // Get match score for a specific internship (not top-N limited)
  getInternshipMatch: async (candidateId, internshipId) => {
    const response = await api.get(`/recommendations/${candidateId}/match/${internshipId}`);
    return response.data;
  },

  // Get similar internships
  getSimilar: async (internshipId) => {
    const response = await api.get(`/recommendations/by_internship/${internshipId}`);
    return response.data;
  },

  // Like/dislike internship
  interact: async (candidateId, internshipId, action) => {
    const response = await api.post('/interactions', {
      candidate_id: candidateId,
      internship_id: internshipId,
      action, // 'like' or 'dislike'
    });
    return response.data;
  },

  // Get user interactions
  getInteractions: async (candidateId) => {
    const response = await api.get(`/interactions/${candidateId}`);
    return response.data;
  },

  // Search internships
  search: async (query) => {
    const response = await api.get(`/internships/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Get candidate ranking for an internship
  getRanking: async (internshipId, username) => {
    const response = await api.get(`/ranking/${internshipId}?username=${username}`);
    return response.data;
  },
};

export default internshipService;
