import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { profileService } from '../services/profile';
import { reviewService } from '../services/reviews';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { ThumbsUp, ThumbsDown, MessageSquare, ArrowLeft, ExternalLink, Star, Building2, Briefcase } from 'lucide-react';

const MyInteractionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('likes'); // 'likes' or 'reviews'
  const [isLoading, setIsLoading] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [displayedInteractions, setDisplayedInteractions] = useState(6); // Show 6 initially (3 rows × 2 columns)
  const [displayedReviews, setDisplayedReviews] = useState(6);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'likes') {
        // Fetch likes/dislikes from API
        const response = await profileService.getInteractions(user.candidate_id);
        setInteractions(response.interactions || []);
      } else {
        // Fetch reviews from API
        const response = await reviewService.getUserReviews(user.candidate_id);
        setReviews(response.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleViewEntity = (entityType, entityId, entityName) => {
    if (entityType === 'company') {
      navigate(`/companies/${encodeURIComponent(entityName)}`);
    } else if (entityType === 'internship') {
      navigate(`/internship/${entityId}`);
    }
  };

  const handleLoadMoreInteractions = () => {
    setDisplayedInteractions(prev => prev + 6);
  };

  const handleLoadMoreReviews = () => {
    setDisplayedReviews(prev => prev + 6);
  };

  const visibleInteractions = interactions.slice(0, displayedInteractions);
  const hasMoreInteractions = interactions.length > displayedInteractions;

  const visibleReviews = reviews.slice(0, displayedReviews);
  const hasMoreReviews = reviews.length > displayedReviews;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom max-w-7xl">
        {/* Header */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Profile
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Interactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your likes, dislikes, and reviews
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mb-6 flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('likes')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'likes'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5" />
              My Likes/Dislikes
            </div>
            {activeTab === 'likes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'reviews'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              My Reviews
            </div>
            {activeTab === 'reviews' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'likes' ? (
          <div>
            {interactions.length === 0 ? (
              <div className="card text-center py-12">
                <ThumbsUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No interactions yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start liking or disliking internships and companies to see them here
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleInteractions.map((interaction) => (
                    <div
                      key={interaction._id || interaction.id}
                      className="card hover:shadow-lg transition-shadow min-h-[280px] flex flex-col"
                    >
                      <div className="flex flex-col flex-1 justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {interaction.entity_type === 'company' ? (
                              <Building2 className="h-5 w-5 text-primary-600" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-primary-600" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                              {interaction.entity_name}
                            </h3>
                            {interaction.interaction_type === 'like' ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                                <ThumbsUp className="h-4 w-4 fill-current" />
                                Liked
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium">
                                <ThumbsDown className="h-4 w-4 fill-current" />
                                Disliked
                              </span>
                            )}
                          </div>
                          
                          {/* Show company name for internships */}
                          {interaction.entity_type === 'internship' && interaction.company_name && (
                            <button
                              onClick={() => handleViewEntity('company', interaction.company_id, interaction.company_name)}
                              className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-2 text-left"
                            >
                              at {interaction.company_name}
                            </button>
                          )}
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 capitalize">
                            {interaction.entity_type}
                          </p>

                          {interaction.reasons && interaction.reasons.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Reasons:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {interaction.reasons.map((reason, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {interaction.custom_reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                              "{interaction.custom_reason}"
                            </p>
                          )}

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatDate(interaction.timestamp)}
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-4">
                          <button
                            onClick={() => handleViewEntity(
                              interaction.entity_type,
                              interaction.entity_id,
                              interaction.entity_name
                            )}
                            className="btn-secondary text-sm px-4 py-2 flex items-center justify-center gap-2 w-full"
                          >
                            View {interaction.entity_type === 'company' ? 'Company' : 'Internship'}
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {hasMoreInteractions && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMoreInteractions}
                      className="btn-primary px-8 py-3"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            {reviews.length === 0 ? (
              <div className="card text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No reviews yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Write reviews for companies and internships to see them here
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleReviews.map((review) => (
                    <div
                      key={review._id || review.id}
                      className="card hover:shadow-lg transition-shadow min-h-[280px] flex flex-col"
                    >
                      <div className="flex flex-col flex-1 justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {review.entity_type === 'company' ? (
                              <Building2 className="h-5 w-5 text-primary-600" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-primary-600" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                              {review.entity_name}
                            </h3>
                            <div className="flex items-center gap-1">
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
                              <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                                {review.rating}.0
                              </span>
                            </div>
                          </div>

                          {/* Show company name for internship reviews */}
                          {review.entity_type === 'internship' && review.company_name && (
                            <button
                              onClick={() => handleViewEntity('company', review.company_id, review.company_name)}
                              className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-2 text-left"
                            >
                              at {review.company_name}
                            </button>
                          )}

                          {review.title && (
                            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                              {review.title}
                            </h4>
                          )}

                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                            {review.review_text}
                          </p>

                          {review.entity_type === 'company' && (
                            <div className="space-y-1 mb-3">
                              {review.pros && (
                                <p className="text-sm line-clamp-2">
                                  <span className="font-medium text-green-600 dark:text-green-400">+ Pros:</span>{' '}
                                  <span className="text-gray-600 dark:text-gray-400">{review.pros}</span>
                                </p>
                              )}
                              {review.cons && (
                                <p className="text-sm line-clamp-2">
                                  <span className="font-medium text-red-600 dark:text-red-400">- Cons:</span>{' '}
                                  <span className="text-gray-600 dark:text-gray-400">{review.cons}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {review.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {review.tags.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                  +{review.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                            {formatDate(review.timestamp)}
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-4">
                          <button
                            onClick={() => handleViewEntity(
                              review.entity_type,
                              review.entity_id,
                              review.entity_name
                            )}
                            className="btn-secondary text-sm px-4 py-2 flex items-center justify-center gap-2 w-full"
                          >
                            View {review.entity_type === 'company' ? 'Company' : 'Internship'}
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreReviews && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMoreReviews}
                      className="btn-primary px-8 py-3"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInteractionsPage;
