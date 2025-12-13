import React, { useState, useEffect } from 'react';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import { companyInteractionService } from '../../services/interactions';
import { useAuthStore } from '../../store/authStore';

const LikeDislikeButton = ({ companyId, variant = 'icons', onInteractionChange }) => {
  const { user } = useAuthStore();
  const [interaction, setInteraction] = useState(null); // null, 'like', 'dislike'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && companyId) {
      loadInteraction();
    }
  }, [user, companyId]);

  const loadInteraction = async () => {
    try {
      const response = await companyInteractionService.get(companyId);
      setInteraction(response.data?.interaction_type || null);
    } catch (err) {
      console.error('Failed to load interaction:', err);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert('Please login to like companies!');
      return;
    }

    setIsLoading(true);
    try {
      if (interaction === 'like') {
        // Unlike
        await companyInteractionService.remove(companyId);
        setInteraction(null);
      } else {
        // Like
        await companyInteractionService.like(companyId);
        setInteraction('like');
      }
      if (onInteractionChange) {
        onInteractionChange(interaction === 'like' ? null : 'like');
      }
    } catch (err) {
      console.error('Failed to update like:', err);
      alert('Failed to update interaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert('Please login to dislike companies!');
      return;
    }

    setIsLoading(true);
    try {
      if (interaction === 'dislike') {
        // Remove dislike
        await companyInteractionService.remove(companyId);
        setInteraction(null);
      } else {
        // Dislike
        await companyInteractionService.dislike(companyId);
        setInteraction('dislike');
      }
      if (onInteractionChange) {
        onInteractionChange(interaction === 'dislike' ? null : 'dislike');
      }
    } catch (err) {
      console.error('Failed to update dislike:', err);
      alert('Failed to update interaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'heart') {
    // Heart variant - just like/unlike
    return (
      <button
        onClick={handleLike}
        disabled={isLoading}
        className={`p-2 rounded-full transition-all ${
          interaction === 'like'
            ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20'
            : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={interaction === 'like' ? 'Unlike' : 'Like'}
      >
        <Heart
          className={`h-5 w-5 ${interaction === 'like' ? 'fill-current' : ''}`}
        />
      </button>
    );
  }

  // Icons variant - like and dislike buttons
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLike}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all ${
          interaction === 'like'
            ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
            : 'text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={interaction === 'like' ? 'Remove like' : 'Like company'}
      >
        <ThumbsUp
          className={`h-5 w-5 ${interaction === 'like' ? 'fill-current' : ''}`}
        />
      </button>

      <button
        onClick={handleDislike}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all ${
          interaction === 'dislike'
            ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
            : 'text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={interaction === 'dislike' ? 'Remove dislike' : 'Dislike company'}
      >
        <ThumbsDown
          className={`h-5 w-5 ${interaction === 'dislike' ? 'fill-current' : ''}`}
        />
      </button>
    </div>
  );
};

export default LikeDislikeButton;
