import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Briefcase, TrendingUp, MapPin, Sparkles, Target, Shield, Zap, Github, Linkedin, Mail } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Internship Matching</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Find Your Perfect<br />
              <span className="text-primary-200">Internship Match</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Intern Insight uses advanced AI to match you with internships that align with your skills, 
              preferences, and career goals. Stop searching, start matching.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/internships')}
                  className="btn-primary bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
                >
                  Browse Internships
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/signup')}
                    className="btn-primary bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-3 text-lg border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-medium"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container-custom py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex justify-center mb-3">
                <Briefcase className="h-10 w-10 text-primary-600" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">1000+</div>
              <div className="text-gray-600 dark:text-gray-400">Active Internships</div>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <TrendingUp className="h-10 w-10 text-primary-600" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">90%</div>
              <div className="text-gray-600 dark:text-gray-400">Match Accuracy</div>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <MapPin className="h-10 w-10 text-primary-600" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">3000+</div>
              <div className="text-gray-600 dark:text-gray-400">Cities Covered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container-custom py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose Intern Insight?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Our platform combines cutting-edge AI technology with user-friendly design 
            to revolutionize your internship search experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full">
                <Sparkles className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              AI-Powered Matching
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our intelligent algorithm analyzes your skills and preferences to find the perfect 
              internships tailored just for you.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full">
                <Target className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Personalized Recommendations
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get curated internship suggestions based on your profile, experience level, 
              and career aspirations.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full">
                <Zap className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Smart Search & Filters
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Advanced search capabilities with location, skills, and company filters to 
              quickly find what you're looking for.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white dark:bg-gray-800 py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get started in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Create Your Profile
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sign up and build your profile with skills, education, and preferences. 
                  Upload your resume for instant profile completion.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Get AI Recommendations
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our AI analyzes your profile and matches you with internships that align 
                  with your skills and career goals.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Apply & Track
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Apply to internships directly through the platform and track your applications 
                  all in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="container-custom py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900 px-4 py-2 rounded-full mb-6">
            <Shield className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">About the Project</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Built with Passion & Innovation
          </h2>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Intern Insight is a modern internship matching platform that leverages artificial intelligence 
            to connect aspiring professionals with their ideal opportunities. The platform analyzes your 
            unique skills, preferences, and career goals to provide personalized internship recommendations, 
            making your job search smarter and more efficient.
          </p>

          <div className="card">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  DS
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Dhairya Sood
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Full-Stack Developer & AI Enthusiast
                </p>
                <div className="flex gap-4 justify-center md:justify-start">
                  <a 
                    href="https://github.com/DhairyaSood" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Github className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/dhairya-sood" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Linkedin className="h-6 w-6" />
                  </a>
                  <a 
                    href="mailto:dhairyasood20042006@gmail.com"
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Mail className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="container-custom text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Find Your Perfect Internship?
            </h2>
            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students already using Intern Insight to discover 
              and apply to their dream internships.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="btn-primary bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
            >
              Get Started for Free
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
