import React from 'react';
import { Star } from 'lucide-react';

const ReviewStats = ({ reviews = [], showDistribution = true }) => {
  const calculateStats = () => {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / totalReviews).toFixed(1);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    });

    const percentages = {};
    Object.keys(distribution).forEach(rating => {
      percentages[rating] = totalReviews > 0 ? (distribution[rating] / totalReviews) * 100 : 0;
    });

    return { averageRating, totalReviews, distribution, percentages };
  };

  const stats = calculateStats();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Overall Rating */}
      <div className="flex items-center gap-6 mb-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.averageRating}
          </div>
          <div className="flex items-center justify-center mb-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-5 w-5 ${
                  value <= Math.round(stats.averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Distribution */}
        {showDistribution && stats.totalReviews > 0 && (
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                  {rating} ★
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${stats.percentages[rating]}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {stats.distribution[rating]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {stats.totalReviews > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.distribution[5] + stats.distribution[4]}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.distribution[3]}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Neutral</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.distribution[2] + stats.distribution[1]}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Negative</p>
          </div>
        </div>
      )}

      {/* No Reviews State */}
      {stats.totalReviews === 0 && (
        <div className="text-center py-4">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <Star className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">No reviews yet</p>
        </div>
      )}
    </div>
  );
};

export default ReviewStats;
