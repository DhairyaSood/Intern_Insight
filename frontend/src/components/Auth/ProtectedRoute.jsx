import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../Common/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, checkAuth, initAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verify = async () => {
      // First initialize from localStorage
      initAuth();
      
      // Then verify with backend
      await checkAuth();
      
      setIsChecking(false);
    };
    
    verify();
  }, [checkAuth, initAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Verifying authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
