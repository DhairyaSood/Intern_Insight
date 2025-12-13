import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import ThemeToggle from './ThemeToggle';
import { Menu, X, User, LogOut, Home, Briefcase, FileText, Building2 } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const ensureBookmarksLoaded = useBookmarkStore((s) => s.ensureLoaded);

  useEffect(() => {
    ensureBookmarksLoaded(user?.username, !!isAuthenticated);
  }, [user?.username, isAuthenticated, ensureBookmarksLoaded]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <Briefcase className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Intern Insight
            </span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center space-x-4 flex-1">
            <Link to="/" className="btn-ghost">
              <Home className="h-5 w-5 mr-2 inline" />
              Home
            </Link>
            <Link to="/internships" className="btn-ghost">
              <Briefcase className="h-5 w-5 mr-2 inline" />
              Internships
            </Link>
            <Link to="/companies" className="btn-ghost">
              <Building2 className="h-5 w-5 mr-2 inline" />
              Companies
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/profile" className="btn-ghost">
                  <User className="h-5 w-5 mr-2 inline" />
                  Profile
                </Link>
                <Link to="/my-applications" className="btn-ghost">
                  <FileText className="h-5 w-5 mr-2 inline" />
                  Applications
                </Link>
              </>
            )}
          </div>

          {/* Right Side - Theme Toggle, Username, Logout */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.username}
                </span>
                <button onClick={handleLogout} className="btn-secondary">
                  <LogOut className="h-5 w-5 mr-2 inline" />
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2 ml-auto">
            <ThemeToggle />
            <button
              onClick={toggleMobileMenu}
              className="btn-icon"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slideDown">
            <div className="flex flex-col py-2">
              <Link 
                to="/" 
                className="btn-ghost justify-start min-h-[48px] touch-manipulation" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5 mr-3" />
                Home
              </Link>
              <Link 
                to="/internships" 
                className="btn-ghost justify-start min-h-[48px] touch-manipulation" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Briefcase className="h-5 w-5 mr-3" />
                Internships
              </Link>
              <Link 
                to="/companies" 
                className="btn-ghost justify-start min-h-[48px] touch-manipulation" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Building2 className="h-5 w-5 mr-3" />
                Companies
              </Link>
              
              {isAuthenticated && (
                <>
                  <Link 
                    to="/profile" 
                    className="btn-ghost justify-start min-h-[48px] touch-manipulation" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5 mr-3" />
                    Profile
                  </Link>
                  <Link 
                    to="/my-applications" 
                    className="btn-ghost justify-start min-h-[48px] touch-manipulation" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FileText className="h-5 w-5 mr-3" />
                    Applications
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <>
                  <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Logged in as</span>
                    <div className="font-medium">{user?.username}</div>
                  </div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }} 
                    className="btn-secondary justify-start min-h-[48px] touch-manipulation mx-2 mt-2 mb-2"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="btn-primary min-h-[48px] touch-manipulation mx-2 my-2" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
