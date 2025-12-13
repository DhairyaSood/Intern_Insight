import React, { useState } from 'react';
import { Star, ThumbsUp, CheckCircle, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ReviewCard = ({ 
  review, 
  entityType = 'company',
  onMarkHelpful,
  onDelete,
  showActions = true,
  compact = false
}) => {
  const { user } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDelete(review._id || review.id);
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnReview = user && review.candidate_id === user.candidate_id;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${compact ? 'h-full flex flex-col' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Rating */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`h-4 w-4 ${
                    value <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {review.rating}.0
            </span>
            {review.verified_intern && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Verified</span>
              </div>
            )}
          </div>

          {/* Title (Company reviews) */}
          {entityType === 'company' && review.title && (
            <h4 className={`font-semibold text-gray-900 dark:text-white mb-1 ${compact ? 'truncate' : ''}`}>
              {review.title}
            </h4>
          )}

          {/* Recommendation badge (Internship reviews) */}
          {entityType === 'internship' && review.would_recommend !== undefined && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              review.would_recommend
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {review.would_recommend ? '✓ Recommends' : '✗ Doesn\'t Recommend'}
            </div>
          )}

          {/* Date and Experience Type */}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatDate(review.timestamp)}</span>
            {review.experience_type && (
              <>
                <span>•</span>
                <span className="capitalize">{review.experience_type}</span>
              </>
            )}
          </div>
        </div>

        {/* Delete button (own reviews only) */}
        {showActions && isOwnReview && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Delete review"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Review Text */}
      <p className={`text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap ${compact ? 'line-clamp-3' : ''}`}>
        {review.review_text}
      </p>

      {/* Pros & Cons (Company reviews) */}
      {entityType === 'company' && (review.pros || review.cons) && (
        <div className="space-y-2 mb-3">
          {review.pros && (
            <div className="flex gap-2">
              <span className="text-green-600 dark:text-green-400 font-semibold text-sm flex-shrink-0">+</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pros</p>
                <p className={`text-sm text-gray-600 dark:text-gray-400 ${compact ? 'line-clamp-2' : ''}`}>{review.pros}</p>
              </div>
            </div>
          )}
          {review.cons && (
            <div className="flex gap-2">
              <span className="text-red-600 dark:text-red-400 font-semibold text-sm flex-shrink-0">-</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cons</p>
                <p className={`text-sm text-gray-600 dark:text-gray-400 ${compact ? 'line-clamp-2' : ''}`}>{review.cons}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags (Internship reviews) */}
      {entityType === 'internship' && review.tags && review.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {review.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Helpful Button */}
      {showActions && !isOwnReview && onMarkHelpful && (
        <div className={`flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700 ${compact ? 'mt-auto' : ''}`}>
          <button
            onClick={() => onMarkHelpful(review._id || review.id)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful</span>
            {(review.helpful_count || review.helpful_votes) > 0 && (
              <span className="text-xs">({review.helpful_count || review.helpful_votes})</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
