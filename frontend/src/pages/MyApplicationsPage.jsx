import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInternshipStore } from '../store/internshipStore';
import { internshipService } from '../services/internships';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { FileText, Calendar, CheckCircle } from 'lucide-react';

const MyApplicationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { internships, fetchInternships } = useInternshipStore();
  const [appliedInternships, setAppliedInternships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    if (!user) {
      navigate('/login');
      return;
    }

    const loadApplications = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all internships
        await fetchInternships();
        
        // Get applied internship IDs from user-specific localStorage
        const storageKey = `appliedInternships_${user.username}`;
        const appliedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Filter internships that user has applied to
        let applied = internships.filter(internship => 
          appliedIds.includes(internship.internship_id || internship._id)
        );
        
        // Fetch recommendations to get match scores
        if (user.candidate_id) {
          try {
            const recommendations = await internshipService.getRecommendations(user.candidate_id);
            const recWithScores = recommendations.recommendations || [];
            
            // Create a map of internship_id to match_score
            const scoreMap = {};
            recWithScores.forEach(rec => {
              const id = rec.internship_id || rec._id;
              scoreMap[id] = rec.match_score || rec.matchScore;
            });
            
            // Add match scores to applied internships
            applied = applied.map(internship => ({
              ...internship,
              match_score: scoreMap[internship.internship_id || internship._id] || internship.match_score
            }));
          } catch (err) {
            console.warn('Could not fetch match scores:', err);
            // Continue without match scores
          }
        }
        
        setAppliedInternships(applied);
      } catch (err) {
        console.error('Error loading applications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, [user, navigate, internships, fetchInternships]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your applications..." />;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container-custom py-8 md:py-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8" />
            <h1 className="text-3xl md:text-4xl font-bold">My Applications</h1>
          </div>
          <p className="text-white/90 text-lg">
            Track all the internships you've applied to
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-8">
        {appliedInternships.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Applications Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't applied to any internships yet. Start exploring opportunities!
            </p>
            <button
              onClick={() => navigate('/internships')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <span>Browse Internships</span>
            </button>
          </div>
        ) : (
          <>
            {/* Stats Card - Compact */}
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {appliedInternships.length} Application{appliedInternships.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Submitted
                </p>
              </div>
            </div>

            {/* Applications Grid */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Your Applications
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appliedInternships.map((internship) => (
                <InternshipCard 
                  key={internship.internship_id || internship._id}
                  internship={internship}
                  isBookmarked={bookmarkedIds.includes(internship.internship_id || internship._id)}
                  onToggleBookmark={toggleBookmark}
                  hasApplied={true}
                  showMatchScore={true}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyApplicationsPage;
