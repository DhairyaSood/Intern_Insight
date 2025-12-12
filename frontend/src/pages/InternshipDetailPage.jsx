import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipService } from '../services/internships';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
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
  Medal
} from 'lucide-react';

const InternshipDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [internship, setInternship] = useState(null);
  const [similarInternships, setSimilarInternships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

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
    }
  }, [internship, user]);

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

  const fetchInternshipDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch internship details
      const data = await internshipService.getById(id);
      setInternship(data.internship);
      
      // Fetch similar internships
      try {
        const similarData = await internshipService.getSimilar(id);
        setSimilarInternships(similarData.recommendations || []);
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
    
    if (!appliedIds.includes(internshipId)) {
      appliedIds.push(internshipId);
      localStorage.setItem(storageKey, JSON.stringify(appliedIds));
      setHasApplied(true);
      alert('Application submitted successfully! You can view it in My Applications page.');
    } else {
      alert('You have already applied to this internship!');
    }
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
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Application Deadline</p>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        {new Date(internship.application_deadline).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
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

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleApply}
                  disabled={hasApplied}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    hasApplied
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {hasApplied ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Applied
                    </span>
                  ) : (
                    'Apply Now'
                  )}
                </button>
                <button
                  onClick={handleBookmark}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isBookmarked
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-500'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 inline mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? 'Bookmarked' : 'Save for Later'}
                </button>
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-500 transition-colors"
                >
                  <Share2 className="h-4 w-4 inline mr-2" />
                  Share Internship
                </button>
              </div>
            </div>

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

                  {/* Score */}
                  <div className="pt-3 border-t border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Match Score</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {ranking.score}/100
                    </p>
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
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
                  {similarInternships.map((similar, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleViewSimilar(similar)}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
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
                        {similar.match_score && (
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {Math.round(similar.match_score)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipDetailPage;
