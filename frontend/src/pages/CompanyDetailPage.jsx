import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Users, Calendar, ExternalLink, Star, Briefcase,
  Award, TrendingUp, ArrowLeft, Globe, Heart
} from 'lucide-react';
import { getCompanyById, getCompanyByName } from '../services/companies';
import { profileService } from '../services/profile';
import { useAuthStore } from '../store/authStore';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const CompanyDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [backendRecommendations, setBackendRecommendations] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    if (!user?.username) return [];
    const bookmarkKey = `bookmarkedInternships_${user.username}`;
    const saved = localStorage.getItem(bookmarkKey);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleBookmark = (internshipId) => {
    if (!user?.username) {
      alert('Please login to bookmark internships!');
      return;
    }
    
    setBookmarkedIds(prev => {
      const updated = prev.includes(internshipId)
        ? prev.filter(id => id !== internshipId)
        : [...prev, internshipId];
      const bookmarkKey = `bookmarkedInternships_${user.username}`;
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId]);

  useEffect(() => {
    if (user?.username) {
      profileService.getByUsername(user.username)
        .then(async (profile) => {
          setUserProfile(profile);
          // Fetch backend recommendations for match scores
          if (profile?.candidate_id) {
            try {
              const { internshipService } = await import('../services/internships');
              const recData = await internshipService.getRecommendations(profile.candidate_id);
              setBackendRecommendations(recData.recommendations || []);
            } catch (err) {
              console.warn('Could not fetch backend recommendations:', err);
              setBackendRecommendations([]);
            }
          }
        })
        .catch(err => console.error('Failed to load profile:', err));
    }
  }, [user]);

  // Recalculate match scores when backend recommendations load
  useEffect(() => {
    if (backendRecommendations.length > 0 && internships.length > 0) {
      // Create score map from backend recommendations
      const scoreMap = {};
      backendRecommendations.forEach(rec => {
        const id = rec.internship_id || rec._id;
        scoreMap[id] = rec.match_score || rec.matchScore || 0;
      });
      
      const internshipsWithScores = internships.map(internship => ({
        ...internship,
        match_score: scoreMap[internship.internship_id || internship._id] || 0
      }));
      setInternships(internshipsWithScores);
    }
  }, [backendRecommendations]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if companyId looks like a company ID (COMP_XXX) or a company name
      let response;
      if (companyId.startsWith('COMP_')) {
        response = await getCompanyById(companyId);
      } else {
        // It's a company name
        response = await getCompanyByName(decodeURIComponent(companyId));
      }
      
      console.log('=== COMPANY DETAIL DEBUG ===');
      console.log('Full API Response:', response);
      console.log('Response data:', response.data);
      console.log('Company object:', response.data);
      console.log('Internship IDs from company:', response.data?.internship_ids);
      console.log('Internships array:', response.data?.internships);
      console.log('Internships length:', response.data?.internships?.length || 0);
      if (response.data?.internships?.length > 0) {
        console.log('First internship:', response.data.internships[0]);
      }
      console.log('=== END DEBUG ===');
      
      setCompany(response.data);
      const internshipsData = response.data?.internships || [];
      // Match scores will be added when backend recommendations load
      const internshipsWithScores = internshipsData.map(internship => ({
        ...internship,
        match_score: 0 // Will be updated by backend recommendations
      }));
      console.log('Setting internships state to:', internshipsWithScores);
      setInternships(internshipsWithScores);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError(err.response?.data?.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <ErrorMessage message={error || 'Company not found'} type="error" />
          <button
            onClick={() => navigate('/companies')}
            className="mt-4 btn-secondary"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/companies')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Companies
        </button>

        {/* Company Header */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img
                src={company.logo_url}
                alt={`${company.name} logo`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 shadow-lg"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&size=128&background=random&bold=true`;
                }}
              />
            </div>

            {/* Company Info */}
            <div className="flex-grow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {company.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium">
                      {company.sector}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="font-bold text-gray-900 dark:text-white">
                        {company.rating}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">/5.0</span>
                    </div>
                    {company.is_hiring && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        ✓ Actively Hiring
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-4 text-lg leading-relaxed">
                {company.description}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Headquarters</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{company.headquarters}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Employees</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{company.employee_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Founded</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{company.founded_year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Internships</p>
                    <p className="font-semibold text-primary-600 dark:text-primary-400">
                      {company.total_internships}
                    </p>
                  </div>
                </div>
              </div>

              {/* Website Link */}
              {company.website && (
                <div className="mt-4">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Company Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Locations */}
            {company.locations && company.locations.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  Locations
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.locations.map((location, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
                    >
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specializations */}
            {company.specializations && company.specializations.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  Specializations
                </h2>
                <div className="space-y-2">
                  {company.specializations.map((spec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      {spec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Culture */}
            {company.culture && company.culture.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary-600" />
                  Company Culture
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.culture.map((trait, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-sm font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {company.benefits && company.benefits.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary-600" />
                  Benefits
                </h2>
                <div className="space-y-2">
                  {company.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Internships */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary-600" />
                Open Internships ({internships.length})
              </h2>

              {(() => {
                console.log('=== RENDER TIME ===');
                console.log('Internships state:', internships);
                console.log('Internships count:', internships.length);
                return null;
              })()}

              {internships.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No open internships
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Check back later for new opportunities from {company.name}
                  </p>
                </div>
              ) : (
                <div className="max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {internships.map((internship) => {
                      const internshipId = internship.internship_id || internship._id;
                      const hasApplied = user?.username ? (() => {
                        const appliedKey = `appliedInternships_${user.username}`;
                        const appliedIds = JSON.parse(localStorage.getItem(appliedKey) || '[]');
                        return appliedIds.includes(internshipId);
                      })() : false;
                      
                      return (
                        <InternshipCard
                          key={internshipId}
                          internship={internship}
                          showMatchScore={true}
                          isBookmarked={bookmarkedIds.includes(internshipId)}
                          onToggleBookmark={toggleBookmark}
                          hasApplied={hasApplied}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
