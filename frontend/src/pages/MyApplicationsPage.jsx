import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInternshipStore } from '../store/internshipStore';
import InternshipCard from '../components/Internship/InternshipCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { FileText, Calendar, CheckCircle } from 'lucide-react';

const MyApplicationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { internships, fetchInternships } = useInternshipStore();
  const [appliedInternships, setAppliedInternships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadApplications = async () => {
      setIsLoading(true);
      await fetchInternships();
      
      // Get applied internship IDs from localStorage
      const appliedIds = JSON.parse(localStorage.getItem('appliedInternships') || '[]');
      
      // Filter internships that user has applied to
      const applied = internships.filter(internship => 
        appliedIds.includes(internship.internship_id || internship._id)
      );
      
      setAppliedInternships(applied);
      setIsLoading(false);
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
            {/* Stats Card */}
            <div className="card mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {appliedInternships.length}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Application{appliedInternships.length !== 1 ? 's' : ''} Submitted
                  </p>
                </div>
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
                <div key={internship.internship_id || internship._id} className="relative">
                  <InternshipCard internship={internship} />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Applied
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyApplicationsPage;
