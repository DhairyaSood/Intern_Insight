import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { profileService } from '../services/profile';
import ResumeUpload from '../components/Profile/ResumeUpload';
import SkillsInput from '../components/Profile/SkillsInput';
import CountryCodeSelector, { detectCountryFromPhone } from '../components/Profile/CountryCodeSelector';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import { User, Mail, MapPin, Briefcase, GraduationCap, Save, Upload as UploadIcon } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    education: '',
    experience: '',
    skills: [],
  });

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.username) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Try fetching by username first (more reliable)
        let profile = null;
        try {
          profile = await profileService.getByUsername(user.username);
        } catch (err) {
          // If username lookup fails, try candidate_id as fallback
          if (user?.candidate_id) {
            profile = await profileService.getProfile(user.candidate_id);
          }
        }
        
        if (profile) {
          setFormData({
            name: profile.name || user.username || '',
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location_preference || profile.location || profile.city || '',
            education: profile.education_level || profile.education || '',
            experience: profile.experience || '',
            skills: profile.skills_possessed || profile.skills || [],
          });
          
          // Auto-detect country from saved phone number
          if (profile.phone) {
            const detectedCountry = detectCountryFromPhone(profile.phone);
            setSelectedCountry(detectedCountry);
          }
        } else {
          setFormData(prev => ({ ...prev, name: user.username || '' }));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        // If profile doesn't exist, just set username
        setFormData(prev => ({ ...prev, name: user.username || '' }));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.username]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-detect country when phone number changes
    if (name === 'phone' && value) {
      const detectedCountry = detectCountryFromPhone(value);
      setSelectedCountry(detectedCountry);
    }
    
    setSuccess(false);
  };
  
  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    
    // Update phone number with new country code if phone doesn't already have it
    if (formData.phone) {
      const phoneWithoutCode = formData.phone.replace(/^\+\d+\s*/, '').trim();
      setFormData(prev => ({
        ...prev,
        phone: `${country.code} ${phoneWithoutCode}`
      }));
    }
  };

  const handleSkillsChange = (newSkills) => {
    setFormData(prev => ({ ...prev, skills: newSkills }));
    setSuccess(false);
  };

  const handleResumeDataExtracted = (data) => {
    setFormData(prev => ({
      ...prev,
      name: data.name || prev.name,
      email: data.email || prev.email,
      phone: data.phone || prev.phone,
      education: data.education || prev.education,
      experience: data.experience || prev.experience,
      skills: data.skills && data.skills.length > 0 ? data.skills : prev.skills,
    }));
    
    // Auto-detect and set country from extracted phone number
    if (data.phone) {
      const detectedCountry = detectCountryFromPhone(data.phone);
      setSelectedCountry(detectedCountry);
    }
    
    setShowResumeUpload(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (formData.skills.length === 0) {
      setError('Please add at least one skill');
      return;
    }

    try {
      setIsSaving(true);
      
      // Ensure phone has country code
      let phoneWithCode = formData.phone.trim();
      if (selectedCountry && phoneWithCode && !phoneWithCode.startsWith('+')) {
        phoneWithCode = `${selectedCountry.code} ${phoneWithCode}`;
      }
      
      const profileData = {
        candidate_id: user.candidate_id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: phoneWithCode,
        city: formData.location.trim(),
        location: formData.location.trim(),
        education: formData.education.trim(),
        experience: formData.experience.trim(),
        skills: formData.skills,
      };

      await profileService.updateProfile(user.candidate_id, profileData);
      
      // Reload profile using username (more reliable than candidate_id)
      const savedProfile = await profileService.getByUsername(user.username);
      if (savedProfile) {
        setFormData({
          name: savedProfile.name || '',
          email: savedProfile.email || '',
          phone: savedProfile.phone || '',
          location: savedProfile.location_preference || savedProfile.location || savedProfile.city || '',
          education: savedProfile.education_level || savedProfile.education || '',
          experience: savedProfile.experience || '',
          skills: savedProfile.skills_possessed || savedProfile.skills || [],
        });
        
        // Update country selector with saved phone
        if (savedProfile.phone) {
          const detectedCountry = detectCountryFromPhone(savedProfile.phone);
          setSelectedCountry(detectedCountry);
        }
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your profile to get personalized internship recommendations
          </p>
        </div>

        {!showResumeUpload ? (
          <div className="card mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Quick Fill with Resume
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload your resume to automatically fill the form below
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeUpload(true)}
                className="btn-primary"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload Resume
              </button>
            </div>
          </div>
        ) : (
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload Resume
              </h3>
              <button
                type="button"
                onClick={() => setShowResumeUpload(false)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
            </div>
            <ResumeUpload onDataExtracted={handleResumeDataExtracted} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && <ErrorMessage message={error} type="error" />}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200 font-medium">
                ✓ Profile saved successfully!
              </p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <div className="flex">
                  <CountryCodeSelector 
                    selectedCountry={selectedCountry}
                    onCountryChange={handleCountryChange}
                    phoneNumber={formData.phone}
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="98765 43210"
                    className="input-field rounded-l-none flex-1"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Country code auto-detected from your number
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Mumbai, Maharashtra"
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Skills *
            </h3>
            <SkillsInput
              skills={formData.skills}
              onChange={handleSkillsChange}
              placeholder="Type skills and press Enter (e.g., Python, JavaScript, React...)"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
            </h3>
            <textarea
              name="education"
              value={formData.education}
              onChange={handleInputChange}
              placeholder="E.g., B.Tech in Computer Science, XYZ University (2020-2024)"
              rows="3"
              className="input-field resize-none"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Experience
            </h3>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              placeholder="Brief summary of your experience, projects, or achievements"
              rows="4"
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
