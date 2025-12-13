import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, Bookmark, CheckCircle } from 'lucide-react';
import LikeDislikeButton from '../Company/LikeDislikeButton';
import { useMatchStore } from '../../store/matchStore';
import { useAuthStore } from '../../store/authStore';
import { useIdentityStore } from '../../store/identityStore';

const InternshipCard = ({ internship, onShowSimilar, showMatchScore = false, preferStoreMatch = true, isBookmarked = false, onToggleBookmark, hasApplied = false }) => {
  const navigate = useNavigate();
  const internshipId = internship.internship_id || internship._id;

  const { user, isAuthenticated } = useAuthStore();
  const candidateId = useIdentityStore((s) => s.candidateId);
  const ensureResolved = useIdentityStore((s) => s.ensureResolved);
  const refreshInternshipMatch = useMatchStore((s) => s.refreshInternshipMatch);

  const liveMatchScore = useMatchStore((s) => s.internshipMatchById[String(internshipId)]);

  useEffect(() => {
    if (!showMatchScore) return;
    if (!preferStoreMatch) return;
    if (!isAuthenticated) return;
    if (!internshipId) return;

    // Resolve candidate id once per user (store-deduped).
    ensureResolved(user);

    // If score already present (including 0), don't refetch.
    if (liveMatchScore !== undefined) return;

    if (candidateId) {
      refreshInternshipMatch(candidateId, internshipId);
    }
  }, [showMatchScore, preferStoreMatch, isAuthenticated, internshipId, user, ensureResolved, candidateId, liveMatchScore, refreshInternshipMatch]);

  const getDisplayMatch = () => {
    if (preferStoreMatch) {
      if (liveMatchScore !== undefined) return Number(liveMatchScore);
      const inline = internship.match_score ?? internship.matchScore;
      if (inline !== undefined && inline !== null) return Number(inline);
      return null; // unknown yet
    }
    const inline = internship.match_score ?? internship.matchScore;
    if (inline !== undefined && inline !== null) return Number(inline);
    return null;
  };

  const displayMatchScore = getDisplayMatch();

  const handleViewDetails = () => {
    navigate(`/internship/${internshipId}`);
  };

  const handleCompanyClick = (e) => {
    e.stopPropagation();
    const companyName = internship.organization || internship.company;
    if (companyName) {
      navigate(`/companies/${encodeURIComponent(companyName)}`);
    }
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (onToggleBookmark) {
      onToggleBookmark(internshipId);
    }
  };

  return (
    <div
      id={`internship-card-${internshipId}`}
      data-scroll-anchor="internship"
      className="card-compact md:hover:scale-105 transition-transform relative h-full flex flex-col"
    >
      {/* Desktop Layout - Keep existing */}
      <div className="hidden md:flex md:flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight break-words overflow-hidden flex-1 min-w-0">
            {internship.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LikeDislikeButton 
              internshipId={internshipId}
              entityName={internship.title}
              variant="heart"
            />
            {onToggleBookmark && (
              <button
                onClick={handleBookmarkClick}
                className={`p-2 rounded-lg transition-all ${isBookmarked ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-primary-500 border border-gray-200 dark:border-gray-600'}`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mb-2">
          {showMatchScore && (
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
              {displayMatchScore === null ? '…' : `${Math.round(displayMatchScore || 0)}% Match`}
            </div>
          )}
          {hasApplied && (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Applied
            </div>
          )}
        </div>
        <button
          onClick={handleCompanyClick}
          className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-2 text-left font-medium"
        >
          {internship.organization}
        </button>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          {internship.location}
        </div>
        <div className="flex flex-wrap gap-2 mb-4 flex-grow items-start">
          {internship.skills_required?.slice(0, 3).map((skill, idx) => (
            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200">
              {skill}
            </span>
          ))}
          {internship.skills_required?.length > 3 && (
            <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 py-1">
              +{internship.skills_required.length - 3} more
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
          <button 
            onClick={handleViewDetails}
            className="flex-1 btn-primary min-h-[44px] touch-manipulation"
          >
            View Details
          </button>
          {onShowSimilar && (
            <button 
              onClick={() => onShowSimilar(internship)}
              className="sm:flex-none w-full sm:w-auto px-4 py-2 min-h-[44px] border border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center gap-2 touch-manipulation font-medium"
              title="Show similar internships"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">Similar</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Layout - Horizontal Compact */}
      <div className="flex md:hidden flex-col">
        <div className="flex gap-3">
          {/* Left: Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 min-w-0 leading-tight break-words">
                {internship.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <LikeDislikeButton 
                  internshipId={internshipId}
                  entityName={internship.title}
                  variant="heart"
                />
                {onToggleBookmark && (
                  <button
                    onClick={handleBookmarkClick}
                    className={`p-1.5 rounded-lg transition-all ${isBookmarked ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={handleCompanyClick}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-1 text-left font-medium"
            >
              {internship.organization}
            </button>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
              <MapPin className="h-3 w-3 mr-1" />
              {internship.location}
            </div>
            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {showMatchScore && (
                <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                  {displayMatchScore === null ? '…' : `${Math.round(displayMatchScore || 0)}%`}
                </span>
              )}
              {hasApplied && (
                <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Applied
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Skills - Horizontal Scroll */}
        <div className="overflow-x-auto scrollbar-none mb-3 -mx-1 px-1">
          <div className="flex gap-1.5 pb-1">
            {internship.skills_required?.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 whitespace-nowrap flex-shrink-0">
                {skill}
              </span>
            ))}
            {internship.skills_required?.length > 5 && (
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 py-1 whitespace-nowrap flex-shrink-0">
                +{internship.skills_required.length - 5}
              </span>
            )}
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex gap-2">
          <button 
            onClick={handleViewDetails}
            className="flex-1 btn-primary text-sm py-2 min-h-[40px]"
          >
            View
          </button>
          {onShowSimilar && (
            <button 
              onClick={() => onShowSimilar(internship)}
              className="px-3 py-2 border border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-1.5 text-sm font-medium min-h-[40px]"
            >
              <Sparkles className="h-4 w-4" />
              Similar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternshipCard;
