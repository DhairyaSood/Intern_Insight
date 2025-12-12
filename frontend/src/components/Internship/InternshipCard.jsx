import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, Bookmark } from 'lucide-react';

const InternshipCard = ({ internship, onShowSimilar, showMatchScore = false, isBookmarked = false, onToggleBookmark }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/internship/${internship.internship_id || internship._id}`);
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (onToggleBookmark) {
      onToggleBookmark(internship.internship_id || internship._id);
    }
  };

  return (
    <div className="card-compact md:hover:scale-105 transition-transform relative h-full flex flex-col">
      {/* Bookmark Button */}
      {onToggleBookmark && (
        <button
          onClick={handleBookmarkClick}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-all z-10 ${
            isBookmarked
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-white dark:bg-gray-700 text-gray-400 hover:text-primary-500 border border-gray-200 dark:border-gray-600'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-24 line-clamp-2 min-h-[3.5rem]">
        {internship.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        {internship.organization}
      </p>
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
  );
};

export default InternshipCard;
