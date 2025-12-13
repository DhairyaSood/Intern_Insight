import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Users, Calendar, ExternalLink, Star, Briefcase,
  Award, TrendingUp, ArrowLeft, Globe, ThumbsUp, MessageSquare
} from 'lucide-react';
import { getCompanyById, getCompanyByName } from '../services/companies';
import { profileService } from '../services/profile';
import { reviewService } from '../services/reviews';
import { useAuthStore } from '../store/authStore';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import LikeDislikeButton from '../components/Company/LikeDislikeButton';
import ReviewForm from '../components/Review/ReviewForm';
import ReviewList from '../components/Review/ReviewList';
import ReviewStats from '../components/Review/ReviewStats.jsx';

const CompanyDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
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
    if (company?.company_id) {
      fetchReviews();
    }
  }, [company]);

  useEffect(() => {
    if (user?.username) {
      profileService.getByUsername(user.username)
        .then(profile => setUserProfile(profile))
        .catch(err => console.error('Failed to load profile:', err));
    }
  }, [user]);

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
      console.log('Match Score from API:', response.data?.match_score);
      console.log('Match Score type:', typeof response.data?.match_score);
      console.log('Match Score value check:', {
        isNull: response.data?.match_score === null,
        isUndefined: response.data?.match_score === undefined,
        value: response.data?.match_score,
        shouldShow: response.data?.match_score !== null && response.data?.match_score !== undefined
      });
      console.log('Internship IDs from company:', response.data?.internship_ids);
      console.log('Internships array:', response.data?.internships);
      console.log('Internships length:', response.data?.internships?.length || 0);
      if (response.data?.internships?.length > 0) {
        console.log('First internship:', response.data.internships[0]);
        console.log('First internship match_score:', response.data.internships[0]?.match_score);
      }
      console.log('=== END DEBUG ===');
      
      setCompany(response.data);
      const internshipsData = response.data?.internships || [];
      
      // Preserve existing match scores if they exist, otherwise use scores from API or keep existing
      const internshipsWithScores = internshipsData.map(internship => {
        const internshipId = internship.internship_id || internship._id;
        // Find existing internship with match score
        const existing = internships.find(i => (i.internship_id || i._id) === internshipId);
        
        // Preserve match scores in this order: new API score > existing score > 0
        const newScore = internship.match_score;
        const existingScore = existing?.match_score;
        
        return {
          ...internship,
          match_score: (newScore !== undefined && newScore !== null && newScore !== 0) 
            ? newScore 
            : (existingScore !== undefined && existingScore !== null && existingScore !== 0)
              ? existingScore
              : newScore ?? existingScore ?? 0
        };
      });
      console.log('Setting internships state to:', internshipsWithScores);
      setInternships(internshipsWithScores);

      // Fix: compute accurate match % for this company's open internships.
      // The old top-10 recommendations list doesn't include all internships.
      if (user?.username && internshipsWithScores.length > 0) {
        try {
          const { internshipService } = await import('../services/internships');
          const candidateId = user?.candidate_id || (await profileService.getByUsername(user.username))?.candidate_id;
          if (candidateId) {
            const ids = internshipsWithScores.map(i => i.internship_id || i._id).filter(Boolean);
            const results = await Promise.allSettled(
              ids.map(iid => internshipService.getInternshipMatch(candidateId, iid))
            );
            const scoreMap = {};
            results.forEach((res, idx) => {
              if (res.status === 'fulfilled') {
                scoreMap[ids[idx]] = res.value?.match_score ?? 0;
              }
            });

            setInternships(prev => prev.map(i => {
              const iid = i.internship_id || i._id;
              if (!iid) return i;
              if (!(iid in scoreMap)) return i;
              return { ...i, match_score: scoreMap[iid] };
            }));
          }
        } catch (e) {
          console.warn('Could not compute per-internship match scores for company internships:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError(err.response?.data?.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await reviewService.company.getAll(company.company_id);
      setReviews(response.reviews || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      await reviewService.company.create(company.company_id, reviewData);
      setShowReviewForm(false);
      await fetchReviews();
      // Refresh company data to get updated rating and match score
      await fetchCompanyDetails();
    } catch (err) {
      console.error('Error submitting review:', err);
      throw err;
    }
  };

  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    // Check if user has an existing review
    if (user && reviews.length > 0) {
      const userReview = reviews.find(r => r.candidate_id === user.candidate_id);
      setExistingReview(userReview || null);
    }
  }, [user, reviews]);

  // NOTE: Interaction updates now trigger a full page reload (see App.jsx).

  const handleWriteReview = () => {
    setShowReviewForm(true);
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await reviewService.markHelpful(reviewId);
      await fetchReviews();
    } catch (err) {
      console.error('Error marking review helpful:', err);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewService.delete(reviewId);
      await fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
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
                    {user && (
                      <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 border border-green-300 dark:border-green-700">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-bold text-green-700 dark:text-green-300">
                            {company.match_score !== null && company.match_score !== undefined
                              ? `${Math.round(company.match_score)}% Match`
                              : 'Calculating match...'}
                          </span>
                        </div>
                      </div>
                    )}
                    {company.is_hiring && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        ✓ Actively Hiring
                      </span>
                    )}
                  </div>
                </div>
                <LikeDislikeButton
                  companyId={company.company_id}
                  entityName={company.name}
                  variant="icons"
                />
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
          {/* Left Column - Company Details & Review Stats */}
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
                  <ThumbsUp className="h-5 w-5 text-primary-600" />
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

            {/* Review Stats Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                  Reviews Summary
                </h2>
                <button
                  onClick={handleWriteReview}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {existingReview ? 'Edit Review' : 'Write Review'}
                </button>
              </div>
              <ReviewStats reviews={reviews} showDistribution={true} />
            </div>
          </div>

          {/* Right Column - Internships & Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Open Internships */}
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
                <div className="min-h-[450px] max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
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

            {/* Company Reviews */}
            <div className="card">
              {/* Review Grid - 2x2, scrollable */}
              <div className="max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
                <ReviewList
                  reviews={reviews}
                  entityType="company"
                  onMarkHelpful={handleMarkHelpful}
                  onDelete={handleDeleteReview}
                  loading={reviewsLoading}
                  emptyMessage="No reviews yet. Be the first to review this company!"
                  gridView={true}
                  columns={2}
                  showHeader={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      <ReviewForm
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleReviewSubmit}
        entityType="company"
        entityName={company?.name}
        existingReview={existingReview}
      />
    </div>
  );
};

export default CompanyDetailPage;
