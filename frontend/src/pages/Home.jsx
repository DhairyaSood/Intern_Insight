import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInternshipStore } from '../store/internshipStore';
import { useAuthStore } from '../store/authStore';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import { Search, MapPin, Briefcase, TrendingUp } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { 
    filteredInternships, 
    isLoading, 
    error, 
    fetchInternships, 
    updateFilters, 
    filters, 
    clearFilters 
  } = useInternshipStore();
  
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleSearchChange = (e) => {
    updateFilters({ search: e.target.value });
  };

  const handleLocationChange = (e) => {
    updateFilters({ location: e.target.value });
  };

  const handleShowSimilar = (internship) => {
    // Navigate to recommendations page with similar internships
    navigate('/recommendations', { state: { similarTo: internship } });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container-custom py-12 md:py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Find Your Perfect Internship
            </h1>
            <p className="text-lg md:text-xl mb-6 text-primary-100">
              AI-powered recommendations tailored just for you
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, company, or skills..."
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
            </div>

            {/* Compact Statistics - Below Search Bar */}
            <div className="max-w-4xl mx-auto mt-6 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 text-sm">
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0">
                <Briefcase className="h-4 w-4 text-primary-200" />
                <span className="font-semibold text-white">1000+</span>
                <span className="text-primary-100">Internships</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0">
                <TrendingUp className="h-4 w-4 text-primary-200" />
                <span className="font-semibold text-white">90%</span>
                <span className="text-primary-100">Match Accuracy</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0">
                <MapPin className="h-4 w-4 text-primary-200" />
                <span className="font-semibold text-white">3000+</span>
                <span className="text-primary-100">Cities Covered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internships List */}
      <div className="container-custom pb-16 pt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {filters.search || filters.location ? 'Search Results' : 'Available Internships'}
          </h2>
          <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {filteredInternships.length} internships found
          </span>
        </div>

        {error && <ErrorMessage message={error} type="error" />}

        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading internships..." />
        ) : filteredInternships.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {filters.search || filters.location 
                ? 'No internships match your search criteria. Try different keywords.' 
                : 'No internships available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInternships.slice(0, 12).map((internship) => (
              <InternshipCard
                key={internship.internship_id}
                internship={internship}
                onShowSimilar={handleShowSimilar}
                isBookmarked={false}
                onToggleBookmark={() => {}}
              />
            ))}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mt-12 text-center card max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Get Personalized Recommendations
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sign in to get AI-powered internship recommendations based on your profile, skills, and preferences.
            </p>
            <a href="/login" className="btn-primary inline-block">
              Sign In to Get Started
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
