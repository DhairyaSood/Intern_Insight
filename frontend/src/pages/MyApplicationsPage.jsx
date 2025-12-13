import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInternshipStore } from '../store/internshipStore';
import { profileService } from '../services/profile';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { FileText, CheckCircle } from 'lucide-react';
import { useMatchStore } from '../store/matchStore';

const MyApplicationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { internships, fetchInternships } = useInternshipStore();
  const [appliedInternships, setAppliedInternships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const refreshInternshipMatches = useMatchStore((s) => s.refreshInternshipMatches);
  const [candidateIdForMatches, setCandidateIdForMatches] = useState(null);
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
      setFetchComplete(false);
      
      try {
        // Fetch all internships
        await fetchInternships();
      } catch (err) {
        console.error('Error loading internships:', err);
      } finally {
        setFetchComplete(true);
      }
    };

    loadApplications();
  }, [user, navigate, fetchInternships]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.username) {
      setCandidateIdForMatches(null);
      return () => { cancelled = true; };
    }
    if (user?.candidate_id) {
      setCandidateIdForMatches(user.candidate_id);
      return () => { cancelled = true; };
    }
    profileService.getByUsername(user.username)
      .then((p) => {
        if (cancelled) return;
        setCandidateIdForMatches(p?.candidate_id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setCandidateIdForMatches(null);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Separate effect to process internships when they load
  useEffect(() => {
    if (!user || !fetchComplete) return;

    const processApplications = async () => {
      setIsLoading(true);
      try {
        // Get applied internship IDs from user-specific localStorage
        const storageKey = `appliedInternships_${user.username}`;
        const appliedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Filter internships that user has applied to
        let applied = internships.filter(internship => 
          appliedIds.includes(internship.internship_id || internship._id)
        );
        
        setAppliedInternships(applied.map((internship) => ({ ...internship, match_score: internship.match_score ?? 0 })));

        // Refresh accurate match scores for these applied internships (not top-N limited).
        if (user?.username && applied.length > 0) {
          try {
            const candidateId = user?.candidate_id || (await profileService.getByUsername(user.username))?.candidate_id;
            if (candidateId) {
              const ids = applied.map((i) => i.internship_id || i._id).filter(Boolean);
              await refreshInternshipMatches(candidateId, ids);
            }
          } catch (err) {
            console.warn('Could not refresh per-internship match scores:', err);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    processApplications();
  }, [user, internships, fetchComplete]);

  useEffect(() => {
    const handler = async (e) => {
      const detail = e?.detail || {};
      const cid = candidateIdForMatches || user?.candidate_id || detail?.candidate_id;
      if (!cid) return;
      const ids = (appliedInternships || []).map((i) => i?.internship_id || i?._id).filter(Boolean);
      if (ids.length === 0) return;
      refreshInternshipMatches(cid, ids);
    };

    window.addEventListener('internship-interaction-changed', handler);
    return () => window.removeEventListener('internship-interaction-changed', handler);
  }, [candidateIdForMatches, user, appliedInternships, refreshInternshipMatches]);

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
