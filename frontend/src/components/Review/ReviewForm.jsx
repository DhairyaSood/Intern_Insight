import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, AlertCircle } from 'lucide-react';

const ReviewForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  entityType = 'company', // 'company' or 'internship'
  entityName,
  existingReview = null 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [tags, setTags] = useState([]);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [experienceType, setExperienceType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or existingReview changes
  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        // Pre-fill form with existing review data
        setRating(existingReview.rating || 0);
        setTitle(existingReview.title || '');
        setReviewText(existingReview.review_text || '');
        setPros(existingReview.pros || '');
        setCons(existingReview.cons || '');
        setTags(existingReview.tags || []);
        setWouldRecommend(existingReview.would_recommend ?? true);
        setExperienceType(existingReview.experience_type || '');
      } else {
        // Reset to empty form for new review
        setRating(0);
        setTitle('');
        setReviewText('');
        setPros('');
        setCons('');
        setTags([]);
        setWouldRecommend(true);
        setExperienceType('');
      }
      setError('');
    }
  }, [isOpen, existingReview]);

  const companyTags = ['Great Culture', 'Good Benefits', 'Work-Life Balance', 'Career Growth', 
                       'Competitive Pay', 'Innovative', 'Supportive Management', 'Learning Opportunities'];
  
  const internshipTags = ['Well Structured', 'Good Mentorship', 'Real Projects', 'Learning Experience',
                          'Good Stipend', 'Certificate Provided', 'PPO Opportunity', 'Flexible Hours'];

  const availableTags = entityType === 'company' ? companyTags : internshipTags;

  const handleTagToggle = (tag) => {
    setTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      setError('Please write a review');
      return;
    }
    if (reviewText.length < 20) {
      setError('Review must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        rating,
        review_text: reviewText.trim(),
        ...(entityType === 'company' ? {
          title: title.trim(),
          pros: pros.trim(),
          cons: cons.trim()
        } : {
          tags,
          would_recommend: wouldRecommend,
          experience_type: experienceType
        })
      };

      await onSubmit(reviewData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Entity Name */}
          <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Reviewing: <span className="font-semibold text-gray-900 dark:text-white">{entityName}</span>
            </p>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      (hoverRating || rating) >= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {rating > 0 ? `${rating}.0` : 'Select rating'}
              </span>
            </div>
          </div>

          {/* Title (Company only) */}
          {entityType === 'company' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience in one line"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={`Share your experience with ${entityName}...`}
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {reviewText.length}/2000 characters (minimum 20)
            </p>
          </div>

          {entityType === 'company' ? (
            <>
              {/* Pros */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pros
                </label>
                <textarea
                  value={pros}
                  onChange={(e) => setPros(e.target.value)}
                  placeholder="What did you like about this company?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Cons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cons
                </label>
                <textarea
                  value={cons}
                  onChange={(e) => setCons(e.target.value)}
                  placeholder="What could be improved?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Tags (Internship only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Highlight Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        tags.includes(tag)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Would Recommend */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Would you recommend this internship?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      wouldRecommend
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Yes, I recommend
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      !wouldRecommend
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    No, I don't
                  </button>
                </div>
              </div>

              {/* Experience Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Experience Type
                </label>
                <select
                  value={experienceType}
                  onChange={(e) => setExperienceType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select experience type</option>
                  <option value="remote">Remote</option>
                  <option value="in-office">In-Office</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ReviewForm;
