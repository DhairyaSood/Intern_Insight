import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipService } from '../services/internships';
import { profileService } from '../services/profile';
import { reviewService } from '../services/reviews';
import { useAuthStore } from '../store/authStore';
import { useMatchStore } from '../store/matchStore';
import { useReviewStore } from '../store/reviewStore';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import LikeDislikeButton from '../components/Company/LikeDislikeButton';
import ReviewForm from '../components/Review/ReviewForm';
import ReviewList from '../components/Review/ReviewList';
import ReviewStats from '../components/Review/ReviewStats.jsx';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Clock, 
  DollarSign, 
  Calendar, 
  GraduationCap, 
  Award,
  CheckCircle,
  Briefcase,
  Target,
  Users,
  FileText,
  ExternalLink,
  Bookmark,
  Share2,
  Sparkles,
  TrendingUp,
  Medal,
  MessageSquare
} from 'lucide-react';

const InternshipDetailPage = () => {
  const similarScrollRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const refreshInternshipMatch = useMatchStore((s) => s.refreshInternshipMatch);
  const refreshInternshipMatches = useMatchStore((s) => s.refreshInternshipMatches);
  const primeInternshipMatches = useMatchStore((s) => s.primeInternshipMatches);
  const ensureInternshipReviews = useReviewStore((s) => s.ensureInternshipReviews);
  const markHelpful = useReviewStore((s) => s.markHelpful);
  const deleteReview = useReviewStore((s) => s.deleteReview);

  const InlineInternshipMatch = ({ internshipId, fallback = 0, className = '' }) => {
    const score = useMatchStore((s) => s.internshipMatchById[String(internshipId)]);
    const display = score ?? fallback ?? 0;
    return <span className={className}>{Math.round(display)}% Match</span>;
  };
  const [internship, setInternship] = useState(null);
  const [similarInternships, setSimilarInternships] = useState([]);
  const [candidateIdForMatches, setCandidateIdForMatches] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [similarBookmarks, setSimilarBookmarks] = useState({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const reviews = useReviewStore((s) => (
    internship ? (s.internshipById[String(internship.internship_id || internship._id)]?.reviews || []) : []
  ));
  const reviewsLoading = useReviewStore((s) => (
    internship ? !!s.internshipById[String(internship.internship_id || internship._id)]?.loading : false
  ));

  useEffect(() => {
    fetchInternshipDetails();
  }, [id]);

  useEffect(() => {
    // Check if internship is bookmarked when internship data loads
    if (internship) {
      const internshipId = internship.internship_id || internship._id;
      
      // Check bookmarks (per-user)
      if (user?.username) {
        const bookmarkKey = `bookmarkedInternships_${user.username}`;
        const bookmarkedIds = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
        setIsBookmarked(bookmarkedIds.includes(internshipId));
      }
      
      // Check if user has applied
      if (user?.username) {
        const userApplications = JSON.parse(localStorage.getItem(`appliedInternships_${user.username}`) || '[]');
        setHasApplied(userApplications.includes(internshipId));
      }
      
      // Fetch ranking if user is logged in
      if (user?.username) {
        fetchRanking(internshipId);
      }

      // Fetch reviews
      ensureInternshipReviews(internshipId);
    }
  }, [internship, user, ensureInternshipReviews]);

  const fetchRanking = async (internshipId) => {
    try {
      setIsLoadingRanking(true);
      const rankingData = await internshipService.getRanking(internshipId, user.username);
      setRanking(rankingData);
    } catch (err) {
      console.warn('Could not fetch ranking:', err);
      // Don't set error - ranking is optional feature
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const internshipId = internship.internship_id || internship._id;
      await reviewService.internship.create(internshipId, reviewData);
      setShowReviewForm(false);
      await ensureInternshipReviews(internshipId, { force: true });
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
    } else {
      setExistingReview(null);
    }
  }, [user, reviews]);

  const handleWriteReview = () => {
    setShowReviewForm(true);
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await markHelpful(reviewId);
    } catch (err) {
      console.error('Error marking review helpful:', err);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteReview(reviewId);
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  };

  const fetchInternshipDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch internship details
      const data = await internshipService.getById(id);
      let internshipData = data.internship;
      const currentId = internshipData?.internship_id || internshipData?._id;
      
      // Fetch match score from backend recommendations if user is logged in
      let resolvedCandidateId = null;
      if (user?.username) {
        try {
          // Prefer authenticated candidate_id (faster); fall back to profile lookup
          const candidateId = user?.candidate_id || (await profileService.getByUsername(user.username))?.candidate_id;
          resolvedCandidateId = candidateId || null;
        } catch (err) {
          console.warn('Could not resolve candidate_id for match score:', err);
        }
      }

      setCandidateIdForMatches(resolvedCandidateId);

      // Prime any match_score that might already exist on the payload, then refresh live.
      primeInternshipMatches([internshipData]);
      if (resolvedCandidateId && currentId) {
        refreshInternshipMatch(resolvedCandidateId, currentId);
      }
      
      setInternship(internshipData);
      
      // Fetch similar internships
      try {
        const similarData = await internshipService.getSimilar(id);
        let similar = similarData.recommendations || [];

        // Prime and refresh match scores for visible similar cards.
        primeInternshipMatches(similar);
        if (resolvedCandidateId && Array.isArray(similar) && similar.length) {
          const simIds = similar.map((s) => s?.internship_id || s?._id).filter(Boolean);
          refreshInternshipMatches(resolvedCandidateId, simIds);
        }

        setSimilarInternships(similar);
        
        // Initialize bookmark state for similar internships
        if (user?.username) {
          const bookmarkKey = `bookmarkedInternships_${user.username}`;
          const bookmarkedIds = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
          const bookmarkState = {};
          similar.forEach(s => {
            const simId = s.internship_id || s._id;
            bookmarkState[simId] = bookmarkedIds.includes(simId);
          });
          setSimilarBookmarks(bookmarkState);
        }
      } catch (err) {
        console.warn('Could not fetch similar internships:', err);
      }
      
    } catch (err) {
      console.error('Failed to fetch internship:', err);
      setError(err.response?.data?.message || 'Failed to load internship details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // When an internship interaction happens, refresh match scores for the current
    // internship and the visible similar list (no full page reload needed).
    const handler = (e) => {
      const detail = e?.detail || {};
      const cid = candidateIdForMatches || detail?.candidate_id;
      if (!cid) return;

      const currentId = internship?.internship_id || internship?._id;
      const simIds = (similarInternships || []).map((s) => s?.internship_id || s?._id).filter(Boolean);
      const ids = [currentId, ...simIds].filter(Boolean);
      if (ids.length === 0) return;
      refreshInternshipMatches(cid, ids);
    };

    window.addEventListener('internship-interaction-changed', handler);
    return () => window.removeEventListener('internship-interaction-changed', handler);
  }, [candidateIdForMatches, internship, similarInternships, refreshInternshipMatches]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleApply = () => {
    if (!internship || !user?.username) {
      alert('Please login to apply for internships!');
      return;
    }
    
    const internshipId = internship.internship_id || internship._id;
    const storageKey = `appliedInternships_${user.username}`;
    const appliedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (hasApplied) {
      // Unapply
      const updatedIds = appliedIds.filter(id => id !== internshipId);
      localStorage.setItem(storageKey, JSON.stringify(updatedIds));
      setHasApplied(false);
      alert('Application withdrawn successfully!');
    } else {
      // Apply
      if (!appliedIds.includes(internshipId)) {
        appliedIds.push(internshipId);
        localStorage.setItem(storageKey, JSON.stringify(appliedIds));
        setHasApplied(true);
        alert('Application submitted successfully! You can view it in My Applications page.');
      }
    }
  };

  const toggleSimilarBookmark = (similarId) => {
    if (!user?.username) {
      alert('Please login to bookmark internships!');
      return;
    }
    
    const bookmarkKey = `bookmarkedInternships_${user.username}`;
    const bookmarkedIds = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
    
    const isCurrentlyBookmarked = bookmarkedIds.includes(similarId);
    const updatedIds = isCurrentlyBookmarked
      ? bookmarkedIds.filter(id => id !== similarId)
      : [...bookmarkedIds, similarId];
    
    localStorage.setItem(bookmarkKey, JSON.stringify(updatedIds));
    setSimilarBookmarks(prev => ({
      ...prev,
      [similarId]: !isCurrentlyBookmarked
    }));
  };

  const handleBookmark = () => {
    if (!internship || !user?.username) {
      alert('Please login to bookmark internships!');
      return;
    }
    
    const internshipId = internship.internship_id || internship._id;
    const bookmarkKey = `bookmarkedInternships_${user.username}`;
    const bookmarkedIds = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
    
    if (isBookmarked) {
      // Remove bookmark
      const updatedIds = bookmarkedIds.filter(id => id !== internshipId);
      localStorage.setItem(bookmarkKey, JSON.stringify(updatedIds));
    } else {
      // Add bookmark
      if (!bookmarkedIds.includes(internshipId)) {
        bookmarkedIds.push(internshipId);
        localStorage.setItem(bookmarkKey, JSON.stringify(bookmarkedIds));
      }
    }
    
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const handleViewSimilar = (similarInternship) => {
    navigate(`/internship/${similarInternship.internship_id}`);
  };

  const handleCompanyClick = () => {
    const companyName = internship.organization || internship.company;
    if (companyName) {
      navigate(`/companies/${encodeURIComponent(companyName)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-custom max-w-6xl">
          <LoadingSpinner size="lg" text="Loading internship details..." />
        </div>
      </div>
    );
  }

  if (error || !internship) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-custom max-w-6xl">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <ErrorMessage 
            message={error || 'Internship not found'} 
            type="error" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom max-w-6xl">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Internships</span>
        </button>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    {internship.title}
                  </h1>
                  <button
                    onClick={handleCompanyClick}
                    className="flex items-center gap-2 text-xl text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4 group"
                  >
                    <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    <span className="font-semibold group-hover:underline">{internship.organization || internship.company}</span>
                  </button>
                </div>
                
                {/* Top-right action buttons */}
                <div className="flex items-center gap-2 ml-4">
                  {/* Match Score Badge */}
                  {user && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-bold">
                        <InlineInternshipMatch
                          internshipId={internship.internship_id || internship._id}
                          fallback={internship.match_score || internship.matchScore || 0}
                        />
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleBookmark}
                    className={`p-2.5 rounded-lg transition-all ${
                      isBookmarked
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700 transition-all"
                    title="Share internship"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Like/Dislike (easy access near actions) */}
              <div className="flex justify-end mb-4">
                <LikeDislikeButton
                  internshipId={internship.internship_id || internship._id}
                  entityName={internship.title}
                  variant="icons"
                />
              </div>

              {/* Key Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white">{internship.location}</p>
                  </div>
                </div>

                {internship.duration && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-white">{internship.duration}</p>
                    </div>
                  </div>
                )}

                {internship.stipend && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Stipend</p>
                      <p className="font-medium text-gray-900 dark:text-white">{internship.stipend}</p>
                    </div>
                  </div>
                )}

                {internship.sector && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Target className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sector</p>
                      <p className="font-medium text-gray-900 dark:text-white">{internship.sector}</p>
                    </div>
                  </div>
                )}

                {internship.application_deadline && (
                  <div className="md:col-span-2 flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-orange-700 dark:text-orange-300">Application Deadline</p>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        {new Date(internship.application_deadline).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={handleApply}
                      className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap group ${
                        hasApplied
                          ? 'bg-green-500 hover:bg-red-600 text-white'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {hasApplied ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          <span className="group-hover:hidden">Applied</span>
                          <span className="hidden group-hover:inline">Withdraw</span>
                        </span>
                      ) : (
                        'Apply Now'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description Card */}
            {internship.description && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  About this Internship
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {internship.description}
                  </p>
                </div>
              </div>
            )}

            {/* Skills Required Card */}
            {internship.skills_required && internship.skills_required.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  Skills Required
                </h2>
                <div className="flex flex-wrap gap-3">
                  {internship.skills_required.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-800"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            {internship.responsibilities && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  Key Responsibilities
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {internship.responsibilities}
                  </p>
                </div>
              </div>
            )}

            {/* Eligibility/Requirements */}
            {(internship.eligibility || internship.requirements || internship.education_level) && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  Eligibility & Requirements
                </h2>
                <div className="space-y-3">
                  {internship.education_level && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Education Level</p>
                        <p className="text-gray-900 dark:text-white font-medium">{internship.education_level}</p>
                      </div>
                    </div>
                  )}
                  {(internship.eligibility || internship.requirements) && (
                    <div className="mt-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {internship.eligibility || internship.requirements}
                      </p>
                    </div>
                  )}
                  {internship.is_beginner_friendly && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Beginner Friendly - No prior experience required
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="card">
              {/* Review List - 2 column grid with scrollable container */}
              <div className="max-h-[600px] overflow-y-auto">
                <ReviewList
                  reviews={reviews}
                  entityType="internship"
                  onMarkHelpful={handleMarkHelpful}
                  onDelete={handleDeleteReview}
                  loading={reviewsLoading}
                  emptyMessage="No reviews yet. Be the first to share your experience!"
                  gridView={true}
                  columns={2}
                  showHeader={true}
                  headerTitle="Internship Reviews"
                  headerActions={
                    <>
                      <button
                        onClick={handleWriteReview}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        {existingReview ? 'Edit Review' : 'Write Review'}
                      </button>
                    </>
                  }
                />
              </div>
            </div>

          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Candidate Ranking Card */}
            {user && ranking && (
              <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Your Ranking
                </h3>
                <div className="space-y-4">
                  {/* Rank Display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Medal className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          #{ranking.rank}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          out of {ranking.total_applicants} candidates
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Percentile Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {ranking.rank_category}
                      </span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {ranking.percentile}th percentile
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          ranking.percentile >= 90 ? 'bg-green-500' :
                          ranking.percentile >= 75 ? 'bg-blue-500' :
                          ranking.percentile >= 50 ? 'bg-yellow-500' :
                          ranking.percentile >= 25 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${ranking.percentile}%` }}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <p>
                      💡 Ranking based on skills match, education, experience, and profile completeness
                    </p>
                  </div>

                  {/* Improvement Suggestions */}
                  {ranking.percentile < 100 && (
                    <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span>🚀</span> How to Rank Higher
                      </p>
                      <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                        {ranking.percentile < 90 && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <p>Add more relevant skills matching: <span className="font-medium">{internship.skills_required?.slice(0, 3).join(', ')}</span></p>
                          </div>
                        )}
                        {ranking.percentile < 80 && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <p>Include past experience in <span className="font-medium">{internship.sector || 'this field'}</span></p>
                          </div>
                        )}
                        {ranking.percentile < 70 && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <p>Complete your profile with certifications and education details</p>
                          </div>
                        )}
                        {ranking.percentile < 60 && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <p>Set location preference to <span className="font-medium">{internship.location}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading Ranking */}
            {user && isLoadingRanking && (
              <div className="card">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your ranking...</span>
                </div>
              </div>
            )}
            {/* Similar Internships Card */}
            {similarInternships.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Similar Opportunities
                </h3>
                <div
                  id="similar-opportunities-scroll"
                  ref={similarScrollRef}
                  className="space-y-3 max-h-[663px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800"
                >
                  {similarInternships.map((similar, idx) => {
                    const similarId = similar.internship_id || similar._id;
                    const isSimilarBookmarked = similarBookmarks[similarId] || false;
                    
                    return (
                    <div
                      key={idx}
                      id={similarId ? `similar-card-${similarId}` : undefined}
                      data-similar-id={similarId ? String(similarId) : undefined}
                      className="relative p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        <LikeDislikeButton 
                          internshipId={similarId}
                          entityName={similar.title}
                          variant="heart"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSimilarBookmark(similarId);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isSimilarBookmarked
                              ? 'bg-primary-500 text-white hover:bg-primary-600'
                              : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-primary-500 border border-gray-200 dark:border-gray-600'
                          }`}
                          title={isSimilarBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          <Bookmark className={`h-3 w-3 ${isSimilarBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div onClick={() => handleViewSimilar(similar)} className="cursor-pointer">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 pr-16 line-clamp-2 break-words">
                          {similar.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {similar.organization}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {similar.location}
                          </span>
                          {user && (
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                              <InlineInternshipMatch internshipId={similarId} fallback={similar.match_score || 0} className="" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Review Summary Stats Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                Review Summary
              </h3>
              <ReviewStats reviews={reviews} showDistribution={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      <ReviewForm
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleReviewSubmit}
        entityType="internship"
        entityName={internship?.title}
        existingReview={existingReview}
      />
    </div>
  );
};

export default InternshipDetailPage;
