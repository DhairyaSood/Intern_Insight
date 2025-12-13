import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { companyInteractionService } from '../../services/interactions';
import { internshipInteractionService } from '../../services/internshipInteractions';
import { profileService } from '../../services/profile';
import { useAuthStore } from '../../store/authStore';
import InteractionReasonModal from '../Common/InteractionReasonModal';
import { useMatchStore } from '../../store/matchStore';

const LikeDislikeButton = ({ 
  companyId, 
  internshipId,
  entityName,
  variant = 'icons', 
  onInteractionChange 
}) => {
  const { user } = useAuthStore();
  const entityType = companyId ? 'company' : 'internship';
  const entityId = companyId || internshipId;
  const interactionService = companyId ? companyInteractionService : internshipInteractionService;
  
  // Initialize from localStorage cache
  const getStorageKey = useCallback(() => {
    if (!user?.username || !entityId) return null;
    return `${entityType}Interaction_${user.username}_${entityId}`;
  }, [user, entityId, entityType]);
  
  const [interaction, setInteraction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'like' or 'dislike'
  const refreshInternshipMatch = useMatchStore((s) => s.refreshInternshipMatch);
  const refreshCompanyMatch = useMatchStore((s) => s.refreshCompanyMatch);
  const [resolvedCandidateId, setResolvedCandidateId] = useState(user?.candidate_id ?? null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setResolvedCandidateId(null);
      return () => { cancelled = true; };
    }

    if (user?.candidate_id) {
      setResolvedCandidateId(user.candidate_id);
      return () => { cancelled = true; };
    }

    if (!user?.username) {
      setResolvedCandidateId(null);
      return () => { cancelled = true; };
    }

    profileService.getByUsername(user.username)
      .then((profile) => {
        if (cancelled) return;
        setResolvedCandidateId(profile?.candidate_id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedCandidateId(null);
      });

    return () => { cancelled = true; };
  }, [user]);

  const ensureCandidateId = useCallback(async () => {
    if (resolvedCandidateId) return resolvedCandidateId;
    if (user?.candidate_id) {
      setResolvedCandidateId(user.candidate_id);
      return user.candidate_id;
    }
    if (!user?.username) return null;
    try {
      const profile = await profileService.getByUsername(user.username);
      const cid = profile?.candidate_id ?? null;
      setResolvedCandidateId(cid);
      return cid;
    } catch {
      return null;
    }
  }, [resolvedCandidateId, user]);

  const dispatchInteractionChanged = useCallback((interactionType, candidateId) => {
    if (entityType === 'internship') {
      window.dispatchEvent(new CustomEvent('internship-interaction-changed', {
        detail: { candidate_id: candidateId, internship_id: entityId, interaction_type: interactionType }
      }));
    } else if (entityType === 'company') {
      window.dispatchEvent(new CustomEvent('company-interaction-changed', {
        detail: { candidate_id: candidateId, company_id: entityId, interaction_type: interactionType }
      }));
    }

    if (entityType === 'internship' && candidateId && entityId) {
      refreshInternshipMatch(candidateId, entityId);
    }
    if (entityType === 'company' && entityId) {
      refreshCompanyMatch(entityId);
    }

    // Backend updates can be eventually-consistent; do quick retries.
    const retryAfterMs = [650, 1600];
    retryAfterMs.forEach((ms, idx) => {
      setTimeout(() => {
        try {
          if (entityType === 'internship' && candidateId && entityId) {
            refreshInternshipMatch(candidateId, entityId);
            window.dispatchEvent(new CustomEvent('internship-interaction-changed', {
              detail: { candidate_id: candidateId, internship_id: entityId, interaction_type: interactionType, retry: idx + 1 }
            }));
          }
          if (entityType === 'company' && entityId) {
            refreshCompanyMatch(entityId);
            window.dispatchEvent(new CustomEvent('company-interaction-changed', {
              detail: { candidate_id: candidateId, company_id: entityId, interaction_type: interactionType, retry: idx + 1 }
            }));
          }
        } catch {
          // ignore
        }
      }, ms);
    });
  }, [entityType, entityId, refreshInternshipMatch, refreshCompanyMatch]);

  const loadInteraction = useCallback(async () => {
    if (!user || !entityId) return;
    
    try {
      // NOTE: interactionService.get() returns the *response body* (response.data),
      // not the full Axios response.
      const body = await interactionService.get(entityId);

      // Expected shapes (depending on endpoint and existence):
      // - { interaction: { interaction_type: 'like'|'dislike' } }
      // - { interaction: null, ... }
      // - { interaction_type: 'like'|'dislike' } (legacy)
      const interactionObj = body?.interaction ?? body;
      const interactionType = interactionObj?.interaction_type ?? body?.interaction_type ?? null;
      
      setInteraction(interactionType);
      
      // Sync with localStorage cache for faster future loads
      const storageKey = getStorageKey();
      if (storageKey) {
        if (interactionType) {
          localStorage.setItem(storageKey, interactionType);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.error(`[LikeDislikeButton] Failed to load ${entityType} interaction:`, err);
      // On error, try to load from localStorage as fallback
      const storageKey = getStorageKey();
      if (storageKey) {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          setInteraction(cached);
        }
      }
    }
  }, [user, entityType, entityId, interactionService, getStorageKey]);

  useEffect(() => {
    if (user && entityId) {
      loadInteraction();
    }
  }, [user, entityId, loadInteraction]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert(`Please login to like ${entityType}s!`);
      return;
    }

    if (interaction === 'like') {
      // Unlike - remove directly without modal
      setIsLoading(true);
      try {
        await interactionService.remove(entityId);
        setInteraction(null);
        const cid = await ensureCandidateId();
        dispatchInteractionChanged(null, cid);
        // Remove from localStorage cache
        const storageKey = getStorageKey();
        if (storageKey) localStorage.removeItem(storageKey);
        if (onInteractionChange) {
          onInteractionChange(null);
        }
      } catch (err) {
        console.error('Failed to remove like:', err);
        alert('Failed to update interaction. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Like - show reason modal
      setPendingAction('like');
      setShowReasonModal(true);
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert(`Please login to dislike ${entityType}s!`);
      return;
    }

    if (interaction === 'dislike') {
      // Remove dislike - remove directly without modal
      setIsLoading(true);
      try {
        await interactionService.remove(entityId);
        setInteraction(null);
        const cid = await ensureCandidateId();
        dispatchInteractionChanged(null, cid);
        // Remove from localStorage cache
        const storageKey = getStorageKey();
        if (storageKey) localStorage.removeItem(storageKey);
        if (onInteractionChange) {
          onInteractionChange(null);
        }
      } catch (err) {
        console.error('Failed to remove dislike:', err);
        alert('Failed to update interaction. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Dislike - show reason modal
      setPendingAction('dislike');
      setShowReasonModal(true);
    }
  };

  const handleReasonSubmit = async (reasonData) => {
    if (!pendingAction) return;

    setIsLoading(true);
    try {
      if (pendingAction === 'like') {
        await interactionService.like(entityId, reasonData);
      } else {
        await interactionService.dislike(entityId, reasonData);
      }
      
      setInteraction(pendingAction);
      const cid = await ensureCandidateId();
      dispatchInteractionChanged(pendingAction, cid);
      // Cache in localStorage immediately
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, pendingAction);
      }
      if (onInteractionChange) {
        onInteractionChange(pendingAction);
      }
    } catch (error) {
      console.error(`Failed to ${pendingAction}:`, error);
      alert(`Failed to ${pendingAction}. Please try again.`);
    } finally {
      setIsLoading(false);
      setShowReasonModal(false);
      setPendingAction(null);
    }
  };

  if (variant === 'heart') {
    // Compact variant (historically used a heart icon)
    return (
      <>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            disabled={isLoading}
            className={`p-2 rounded-full transition-all ${
              interaction === 'like'
                ? 'text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={interaction === 'like' ? 'Unlike' : 'Like'}
          >
            <ThumbsUp
              className={`h-5 w-5 ${interaction === 'like' ? 'fill-current' : ''}`}
            />
          </button>

          <button
            onClick={handleDislike}
            disabled={isLoading}
            className={`p-2 rounded-full transition-all ${
              interaction === 'dislike'
                ? 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={interaction === 'dislike' ? 'Remove dislike' : 'Not interested'}
          >
            <ThumbsDown
              className={`h-5 w-5 ${interaction === 'dislike' ? 'fill-current' : ''}`}
            />
          </button>
        </div>

        <InteractionReasonModal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false);
            setPendingAction(null);
          }}
          interactionType={pendingAction}
          entityType={entityType}
          entityName={entityName}
          onSubmit={handleReasonSubmit}
        />
      </>
    );
  }

  // Icons variant - like and dislike buttons
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-all ${
            interaction === 'like'
              ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={interaction === 'like' ? 'Remove like' : `Like ${entityType}`}
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
          title={interaction === 'dislike' ? 'Remove dislike' : `Dislike ${entityType}`}
        >
          <ThumbsDown
            className={`h-5 w-5 ${interaction === 'dislike' ? 'fill-current' : ''}`}
          />
        </button>
      </div>

      <InteractionReasonModal
        isOpen={showReasonModal}
        onClose={() => {
          setShowReasonModal(false);
          setPendingAction(null);
        }}
        interactionType={pendingAction}
        entityType={entityType}
        entityName={entityName}
        onSubmit={handleReasonSubmit}
      />
    </>
  );
};

export default LikeDislikeButton;
