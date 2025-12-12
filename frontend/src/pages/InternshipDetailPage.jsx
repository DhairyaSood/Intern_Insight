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
  Sparkles
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

  useEffect(() => {
    fetchInternshipDetails();
  }, [id]);

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
        setSimilarInternships(similarData.recommendations?.slice(0, 3) || []);
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
    // TODO: Implement application logic
    alert('Application feature coming soon!');
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark persistence
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
                  <div className="flex items-center gap-2 text-xl text-gray-700 dark:text-gray-300 mb-4">
                    <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    <span className="font-semibold">{internship.organization || internship.company}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBookmark}
                    className={`p-2 rounded-lg border transition-colors ${
                      isBookmarked
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-5 w-5" />
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
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                className="btn-primary w-full py-3 text-lg font-semibold"
              >
                Apply Now
              </button>
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

            {/* Additional Info */}
            {internship.application_deadline && (
              <div className="card bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Application Deadline</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {new Date(internship.application_deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="card sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleApply}
                  className="btn-primary w-full"
                >
                  Apply Now
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

            {/* Company Info Card */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                Company Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Organization</p>
                  <p className="text-gray-900 dark:text-white font-semibold text-lg">
                    {internship.organization || internship.company}
                  </p>
                </div>
                {internship.location && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-gray-900 dark:text-white font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {internship.location}
                    </p>
                  </div>
                )}
                {internship.sector && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Industry</p>
                    <p className="text-gray-900 dark:text-white font-medium">{internship.sector}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Similar Internships Card */}
            {similarInternships.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Similar Opportunities
                </h3>
                <div className="space-y-3">
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

            {/* Internship ID Card (for reference) */}
            <div className="card bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Internship ID</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {internship.internship_id || internship._id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipDetailPage;
