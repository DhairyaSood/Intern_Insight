import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInternshipStore } from '../store/internshipStore';
import { profileService } from '../services/profile';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import InternshipCard from '../components/Internship/InternshipCard';
import { Search, MapPin, X, Sparkles, Grid3x3, ChevronRight, ChevronDown } from 'lucide-react';

const ITEMS_PER_PAGE = 24; // Show 24 items initially (8x3 grid)
const LOAD_MORE_COUNT = 12; // Load 12 more items when clicking "Load More"

const InternshipsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    internships,
    filteredInternships, 
    isLoading, 
    error, 
    fetchInternships, 
    updateFilters, 
    filters, 
    clearFilters 
  } = useInternshipStore();

  const [viewMode, setViewMode] = useState('general'); // 'general' or 'recommended'
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [similarInternships, setSimilarInternships] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [recommendedFilters, setRecommendedFilters] = useState({ search: '', location: '' });
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  useEffect(() => {
    if (viewMode === 'recommended' && user?.username) {
      loadRecommendations();
    }
    setDisplayCount(ITEMS_PER_PAGE); // Reset pagination when switching modes
  }, [viewMode, user, internships]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filters.search, filters.location, recommendedFilters.search, recommendedFilters.location]);

  const loadRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true);
      const profile = await profileService.getByUsername(user.username);
      setUserProfile(profile);

      if (profile && internships.length > 0) {
        const recommended = generateRecommendations(profile, internships);
        setRecommendations(recommended);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Load user profile for general search too
  useEffect(() => {
    if (user?.username && viewMode === 'general') {
      profileService.getByUsername(user.username)
        .then(profile => setUserProfile(profile))
        .catch(err => console.error('Failed to load profile:', err));
    }
  }, [user, viewMode]);

  const calculateMatchScore = (profile, internship) => {
    const userSkills = (profile?.skills_possessed || profile?.skills || []).map(s => s.toLowerCase());
    const userLocation = (profile?.location_preference || profile?.location || profile?.city || '').toLowerCase();
    
    if (userSkills.length === 0) {
      return 0;
    }

    let score = 0;
    
    const internshipSkills = (internship.skills_required || []).map(s => s.toLowerCase());
    const matchingSkills = userSkills.filter(userSkill =>
      internshipSkills.some(intSkill => 
        intSkill.includes(userSkill) || userSkill.includes(intSkill)
      )
    );
    score += (matchingSkills.length / Math.max(userSkills.length, 1)) * 100;

    if (userLocation && internship.location?.toLowerCase().includes(userLocation)) {
      score += 50;
    }

    return score;
  };

  const generateRecommendations = (profile, allInternships) => {
    const userSkills = (profile.skills_possessed || profile.skills || []).map(s => s.toLowerCase());
    
    if (userSkills.length === 0) {
      return [];
    }

    const scored = allInternships.map(internship => {
      const score = calculateMatchScore(profile, internship);
      return { ...internship, matchScore: score };
    });

    return scored
      .filter(item => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);
  };

  const findSimilarInternships = (internship) => {
    const baseSkills = (internship.skills_required || []).map(s => s.toLowerCase());
    
    if (baseSkills.length === 0) {
      return [];
    }

    const similar = internships
      .filter(i => i.internship_id !== internship.internship_id)
      .map(i => {
        const candidateSkills = (i.skills_required || []).map(s => s.toLowerCase());
        const commonSkills = baseSkills.filter(s => candidateSkills.includes(s));
        
        // Base score: percentage of base internship's skills that match
        let score = (commonSkills.length / baseSkills.length) * 100;
        
        // Bonus points for same organization (additional 20%)
        if (i.organization === internship.organization) {
          score = Math.min(score + 20, 100);
        }
        
        // Bonus for same location (additional 10%)
        if (i.location === internship.location) {
          score = Math.min(score + 10, 100);
        }
        
        // Bonus for similar title keywords (additional 5% per matching word)
        const titleWords = internship.title?.toLowerCase().split(' ').filter(w => w.length > 3) || [];
        const candidateTitleWords = i.title?.toLowerCase().split(' ').filter(w => w.length > 3) || [];
        const commonWords = titleWords.filter(w => candidateTitleWords.includes(w));
        score = Math.min(score + (commonWords.length * 5), 100);
        
        // Calculate user match score
        const userMatchScore = userProfile ? calculateMatchScore(userProfile, i) : 0;
        
        return { ...i, similarityScore: Math.round(score), userMatchScore: Math.round(userMatchScore) };
      })
      .filter(i => i.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10);
    
    return similar;
  };

  const handleShowSimilar = (internship) => {
    setSelectedInternship(internship);
    const similar = findSimilarInternships(internship);
    setSimilarInternships(similar);
    setShowSidebar(true);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setTimeout(() => {
      setSelectedInternship(null);
      setSimilarInternships([]);
    }, 300);
  };

  const handleSearchChange = (e) => {
    updateFilters({ search: e.target.value });
  };

  const handleLocationChange = (e) => {
    updateFilters({ location: e.target.value });
  };

  const handleRecommendedSearchChange = (e) => {
    setRecommendedFilters({ ...recommendedFilters, search: e.target.value });
  };

  const handleRecommendedLocationChange = (e) => {
    setRecommendedFilters({ ...recommendedFilters, location: e.target.value });
  };

  const clearRecommendedFilters = () => {
    setRecommendedFilters({ search: '', location: '' });
  };

  // Filter recommendations based on search and location
  const getFilteredRecommendations = () => {
    if (!recommendedFilters.search && !recommendedFilters.location) {
      return recommendations;
    }

    return recommendations.filter(internship => {
      const searchLower = recommendedFilters.search.toLowerCase();
      const locationLower = recommendedFilters.location.toLowerCase();

      const matchesSearch = !recommendedFilters.search || 
        internship.title?.toLowerCase().includes(searchLower) ||
        internship.organization?.toLowerCase().includes(searchLower) ||
        internship.skills_required?.some(skill => skill.toLowerCase().includes(searchLower));

      const matchesLocation = !recommendedFilters.location ||
        internship.location?.toLowerCase().includes(locationLower);

      return matchesSearch && matchesLocation;
    });
  };

  // Add match scores to general search internships - memoized for performance
  const generalInternshipsWithScores = useMemo(() => {
    if (!userProfile) {
      return filteredInternships;
    }
    return filteredInternships.map(internship => ({
      ...internship,
      matchScore: calculateMatchScore(userProfile, internship)
    }));
  }, [filteredInternships, userProfile]);

  const allDisplayedInternships = viewMode === 'recommended' 
    ? getFilteredRecommendations() 
    : generalInternshipsWithScores;
  
  // Paginate the results
  const displayedInternships = allDisplayedInternships.slice(0, displayCount);
  const hasMore = displayCount < allDisplayedInternships.length;
  const isLoadingData = viewMode === 'recommended' ? isLoadingRecommendations : isLoading;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container-custom py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Explore Internships</h1>
          
          {/* Toggle Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setViewMode('general')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                viewMode === 'general'
                  ? 'bg-white text-primary-700'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Grid3x3 className="h-5 w-5" />
              General Search
            </button>
            <button
              onClick={() => setViewMode('recommended')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                viewMode === 'recommended'
                  ? 'bg-white text-primary-700'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Sparkles className="h-5 w-5" />
              Recommended For You
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Show for both general and recommended modes */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container-custom py-4">
          {viewMode === 'general' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, company, skills (use commas for multiple)"
                    value={filters.search}
                    onChange={handleSearchChange}
                    className="input-field pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={filters.location}
                    onChange={handleLocationChange}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              {(filters.search || filters.location) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, company, skills (use commas for multiple)"
                    value={recommendedFilters.search}
                    onChange={handleRecommendedSearchChange}
                    className="input-field pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={recommendedFilters.location}
                    onChange={handleRecommendedLocationChange}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              {(recommendedFilters.search || recommendedFilters.location) && (
                <button
                  onClick={clearRecommendedFilters}
                  className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 relative">
        <div className={`transition-all duration-500 ease-in-out ${showSidebar ? 'lg:pr-8 xl:pr-12 lg:mr-[26rem] xl:mr-[28rem] container-custom' : 'container-custom px-6 md:px-8'}`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {viewMode === 'recommended' ? 'Your Personalized Recommendations' : 
               filters.search || filters.location ? 'Search Results' : 'All Internships'}
            </h2>
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Showing {displayedInternships.length} of {allDisplayedInternships.length} internships
            </span>
          </div>

          {/* Profile prompt for recommendations */}
          <div>
            {viewMode === 'recommended' && !userProfile?.skills_possessed?.length && (
              <div className="card mb-6 border-l-4 border-primary-500">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Complete your profile</strong> to get personalized internship recommendations. 
                  Add your skills and preferences in your{' '}
                  <a href="/profile" className="text-primary-600 dark:text-primary-400 hover:underline">
                    profile page
                  </a>.
                </p>
              </div>
            )}

            {error && <ErrorMessage message={error} type="error" />}

            {isLoadingData ? (
              <LoadingSpinner size="lg" text="Loading internships..." />
            ) : displayedInternships.length === 0 ? (
              <div className="text-center py-16 card">
                <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                  {viewMode === 'recommended' 
                    ? 'No recommendations available. Please complete your profile with skills and preferences.'
                    : filters.search || filters.location 
                      ? 'No internships match your search criteria. Try different keywords.' 
                      : 'No internships available at the moment.'}
                </p>
                {viewMode === 'recommended' && (
                  <a href="/profile" className="btn-primary inline-block">
                    Complete Your Profile
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className={`grid gap-4 sm:gap-6 ${
                  showSidebar 
                    ? 'grid-cols-1 lg:grid-cols-2' 
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                {displayedInternships.map((internship) => (
                  <div key={internship.internship_id} className="relative">
                    <InternshipCard
                      internship={internship}
                      onShowSimilar={handleShowSimilar}
                    />
                    {internship.matchScore > 0 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                        {Math.round(internship.matchScore)}% Match
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3"
                  >
                    <span>Load More Internships</span>
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {allDisplayedInternships.length - displayCount} more available
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

        {/* Similar Internships Sidebar */}
        {showSidebar && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] lg:hidden transition-opacity duration-500 ease-in-out ${
                showSidebar ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={closeSidebar}
            />
            
            {/* Sidebar */}
            <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-full sm:w-[26rem] xl:w-[28rem] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-[45] transition-all duration-500 ease-in-out flex flex-col ${
              showSidebar ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}>
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Similar Internships</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Based on {selectedInternship?.title}</p>
                </div>
                <button
                  onClick={closeSidebar}
                  className="btn-icon"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {similarInternships.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No similar internships found
                  </p>
                ) : (
                  similarInternships.map((internship) => (
                    <div
                      key={internship.internship_id}
                      className="card-compact"
                    >
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {internship.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {internship.organization}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {internship.location}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {internship.skills_required?.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 px-2 py-0.5 rounded-full font-medium">
                            {skill}
                          </span>
                        ))}
                        {internship.skills_required?.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                            +{internship.skills_required.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {internship.similarityScore && (
                          <div className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            {internship.similarityScore}% Similar
                          </div>
                        )}
                        {internship.userMatchScore > 0 && (
                          <div className="inline-flex items-center text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            {internship.userMatchScore}% You
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate(`/internship/${internship.internship_id || internship._id}`)}
                          className="flex-1 btn-primary text-xs py-2 min-h-0"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowSimilar(internship);
                          }}
                          className="px-3 py-2 border border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-1"
                          title="Show similar internships"
                        >
                          <Sparkles className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InternshipsPage;
