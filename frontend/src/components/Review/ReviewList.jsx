import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ReviewCard from './ReviewCard';

const ReviewList = ({ 
  reviews = [],
  entityType = 'company',
  onMarkHelpful,
  onDelete,
  loading = false,
  emptyMessage = "No reviews yet. Be the first to review!",
  gridView = false,
  columns = 3,
  showHeader = false,
  headerTitle,
  headerActions
}) => {
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'helpful', 'rating-high', 'rating-low'
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'helpful', label: 'Most Helpful' },
    { value: 'rating-high', label: 'Highest Rating' },
    { value: 'rating-low', label: 'Lowest Rating' }
  ];

  const getSortedReviews = () => {
    const sorted = [...reviews];
    
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      case 'helpful':
        return sorted.sort((a, b) => 
          (b.helpful_count || b.helpful_votes || 0) - (a.helpful_count || a.helpful_votes || 0)
        );
      case 'rating-high':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'rating-low':
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted;
    }
  };

  const sortedReviews = getSortedReviews();

  if (loading) {
    const gridClass = gridView 
      ? columns === 2 
        ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      : "space-y-4";
    
    return (
      <div className={gridClass}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sort Controls */}
      {showHeader && (
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {headerTitle || (entityType === 'internship' ? 'Internship Reviews' : 'Company Reviews')}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}

            <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {sortOptions.find(opt => opt.value === sortBy)?.label}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        sortBy === option.value
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Sort Controls (when header is not shown) */}
      {!showHeader && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {sortOptions.find(opt => opt.value === sortBy)?.label}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSortDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowSortDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      sortBy === option.value
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* Reviews */}
      <div className={gridView 
        ? columns === 2 
          ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-4"}>
        {sortedReviews.map((review) => (
          <ReviewCard
            key={review._id || review.id}
            review={review}
            entityType={entityType}
            onMarkHelpful={onMarkHelpful}
            onDelete={onDelete}
            compact={gridView}
          />
        ))}
      </div>
    </div>
  );
};

export default ReviewList;
