import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInternshipStore } from '../store/internshipStore';
import { profileService } from '../services/profile';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import InternshipCard from '../components/Internship/InternshipCard';
import { Sparkles, TrendingUp } from 'lucide-react';

const RecommendationsPage = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { internships, isLoading, error, fetchInternships } = useInternshipStore();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    if (!user?.username) return [];
    const bookmarkKey = `bookmarkedInternships_${user.username}`;
    const saved = localStorage.getItem(bookmarkKey);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleBookmark = (internshipId) => {
    if (!user?.username) return;
    
    setBookmarkedIds(prev => {
      const updated = prev.includes(internshipId)
        ? prev.filter(id => id !== internshipId)
        : [...prev, internshipId];
      const bookmarkKey = `bookmarkedInternships_${user.username}`;
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  useEffect(() => {
    const loadProfileAndRecommendations = async () => {
      if (!user?.username) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        
        // Check if navigated from "Show Similar"
        const similarTo = location.state?.similarTo;
        
        if (similarTo && internships.length > 0) {
          // Show similar internships instead of recommendations
          const similar = findSimilarInternships(similarTo);
          setRecommendations(similar);
          setIsLoadingProfile(false);
          return;
        }

        // Fetch user profile for personalized recommendations
        const profile = await profileService.getByUsername(user.username);
        setUserProfile(profile);

        // Generate recommendations based on profile
        if (profile && internships.length > 0) {
          const recommended = generateRecommendations(profile, internships);
          setRecommendations(recommended);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setProfileError('Please complete your profile to get personalized recommendations.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (internships.length > 0) {
      loadProfileAndRecommendations();
    }
  }, [user, internships, location.state]);

  const generateRecommendations = (profile, allInternships) => {
    const userSkills = (profile.skills_possessed || profile.skills || []).map(s => s.toLowerCase());
    const userLocation = (profile.location_preference || profile.location || profile.city || '').toLowerCase();
    
    if (userSkills.length === 0) {
      return [];
    }

    // Score each internship based on skill match and location
    const scored = allInternships.map(internship => {
      let score = 0;
      
      // Skill matching (max 100 points)
      const internshipSkills = (internship.skills_required || []).map(s => s.toLowerCase());
      const matchingSkills = userSkills.filter(userSkill =>
        internshipSkills.some(intSkill => 
          intSkill.includes(userSkill) || userSkill.includes(intSkill)
        )
      );
      score += (matchingSkills.length / Math.max(userSkills.length, 1)) * 100;

      // Location matching (bonus 50 points)
      if (userLocation && internship.location?.toLowerCase().includes(userLocation)) {
        score += 50;
      }

      return { ...internship, matchScore: score, matchingSkills };
    });

    // Filter internships with at least one skill match and sort by score
    return scored
      .filter(item => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20); // Top 20 recommendations
  };

  const findSimilarInternships = (internship) => {
    // Find internships similar to the given one
    const similar = internships
      .filter(i => i.internship_id !== internship.internship_id) // Exclude the current internship
      .map(i => {
        let score = 0;
        
        // Same company (high weight)
        if (i.company === internship.company) score += 50;
        
        // Similar skills
        const currentSkills = (internship.skills_required || []).map(s => s.toLowerCase());
        const candidateSkills = (i.skills_required || []).map(s => s.toLowerCase());
        const commonSkills = currentSkills.filter(s => candidateSkills.includes(s));
        score += (commonSkills.length / Math.max(currentSkills.length, 1)) * 100;
        
        // Same location
        if (i.location === internship.location) score += 30;
        
        // Similar title keywords
        const titleWords = internship.title?.toLowerCase().split(' ') || [];
        const candidateTitleWords = i.title?.toLowerCase().split(' ') || [];
        const commonWords = titleWords.filter(w => candidateTitleWords.includes(w) && w.length > 3);
        score += commonWords.length * 10;
        
        return { ...i, matchScore: score }; // Use matchScore for consistency
      })
      .filter(i => i.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Top 10 similar internships
    
    return similar;
  };

  const handleShowSimilar = (internship) => {
    const similar = findSimilarInternships(internship);
    setRecommendations(similar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading recommendations..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please log in to see recommendations
          </h2>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container-custom">
          <div className="text-center">
            <Sparkles className="h-16 w-16 text-primary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Complete Your Profile
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {profileError}
            </p>
            <a
              href="/profile"
              className="btn-primary inline-flex items-center"
            >
              Go to Profile
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container-custom">
          <div className="text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Recommendations Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Update your profile with skills and preferences to get personalized recommendations.
            </p>
            <a
              href="/profile"
              className="btn-primary inline-flex items-center"
            >
              Update Profile
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-primary-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {location.state?.similarTo ? 'Similar Internships' : 'Recommended For You'}
            </h1>
          </div>
          {!location.state?.similarTo && (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Based on your skills: {(userProfile?.skills_possessed || userProfile?.skills || []).join(', ')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {recommendations.length} personalized recommendations
              </p>
            </>
          )}
          {location.state?.similarTo && (
            <p className="text-gray-600 dark:text-gray-400">
              Similar to: {location.state.similarTo.title} at {location.state.similarTo.company}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        <div className="space-y-6">
          {recommendations.map((internship) => {
            const internshipId = internship.internship_id || internship._id;
            const hasApplied = user?.username ? (() => {
              const appliedKey = `appliedInternships_${user.username}`;
              const appliedIds = JSON.parse(localStorage.getItem(appliedKey) || '[]');
              return appliedIds.includes(internshipId);
            })() : false;
            
            return (
            <div key={internshipId}>
              <InternshipCard 
                internship={internship}
                onShowSimilar={handleShowSimilar}
                showMatchScore={true}
                isBookmarked={bookmarkedIds.includes(internshipId)}
                onToggleBookmark={toggleBookmark}
                hasApplied={hasApplied}
              />
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
