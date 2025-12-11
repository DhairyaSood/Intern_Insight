import { create } from 'zustand';
import { internshipService } from '../services/internships';

export const useInternshipStore = create((set, get) => ({
  internships: [],
  filteredInternships: [],
  recommendations: [],
  similarInternships: [],
  interactions: { likes: [], dislikes: [] },
  isLoading: false,
  error: null,
  filters: {
    search: '',
    location: '',
    skills: [],
  },

  // Fetch all internships
  fetchInternships: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await internshipService.getAll();
      set({ 
        internships: data.internships || [], 
        filteredInternships: data.internships || [],
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch internships', 
        isLoading: false 
      });
    }
  },

  // Fetch recommendations
  fetchRecommendations: async (candidateId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await internshipService.getRecommendations(candidateId);
      set({ 
        recommendations: data.recommendations || [], 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch recommendations', 
        isLoading: false 
      });
    }
  },

  // Fetch similar internships
  fetchSimilar: async (internshipId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await internshipService.getSimilar(internshipId);
      set({ 
        similarInternships: data.recommendations || [], 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch similar internships', 
        isLoading: false 
      });
    }
  },

  // Like/dislike internship
  interactWithInternship: async (candidateId, internshipId, action) => {
    try {
      await internshipService.interact(candidateId, internshipId, action);
      const { interactions } = get();
      
      if (action === 'like') {
        if (!interactions.likes.includes(internshipId)) {
          set({ 
            interactions: { 
              ...interactions, 
              likes: [...interactions.likes, internshipId] 
            } 
          });
        }
      } else if (action === 'dislike') {
        if (!interactions.dislikes.includes(internshipId)) {
          set({ 
            interactions: { 
              ...interactions, 
              dislikes: [...interactions.dislikes, internshipId] 
            } 
          });
        }
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to save interaction' });
    }
  },

  // Fetch user interactions
  fetchInteractions: async (candidateId) => {
    try {
      const data = await internshipService.getInteractions(candidateId);
      set({ interactions: data });
    } catch (error) {
      // Silently fail
    }
  },

  // Apply filters
  applyFilters: () => {
    const { internships, filters } = get();
    let filtered = [...internships];

    if (filters.search) {
      // Split search by comma for multiple search terms
      const searchTerms = filters.search
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);
      
      filtered = filtered.filter(internship => {
        // Check if internship matches ANY of the search terms
        return searchTerms.some(searchTerm => {
          // Search in title, organization (company), and description
          const textMatch = 
            internship.title?.toLowerCase().includes(searchTerm) ||
            internship.organization?.toLowerCase().includes(searchTerm) ||
            internship.company?.toLowerCase().includes(searchTerm) ||
            internship.description?.toLowerCase().includes(searchTerm);
          
          // Search in skills
          const skillsMatch = internship.skills_required?.some(skill =>
            skill.toLowerCase().includes(searchTerm)
          );
          
          return textMatch || skillsMatch;
        });
      });
    }

    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter(internship =>
        internship.location?.toLowerCase().includes(locationLower)
      );
    }

    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter(internship =>
        filters.skills.some(skill =>
          internship.skills_required?.some(reqSkill =>
            reqSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    set({ filteredInternships: filtered });
  },

  // Update filters
  updateFilters: (newFilters) => {
    set(state => ({ 
      filters: { ...state.filters, ...newFilters } 
    }));
    get().applyFilters();
  },

  // Clear filters
  clearFilters: () => {
    set({ 
      filters: { search: '', location: '', skills: [] },
      filteredInternships: get().internships
    });
  },

  clearError: () => set({ error: null }),
}));
