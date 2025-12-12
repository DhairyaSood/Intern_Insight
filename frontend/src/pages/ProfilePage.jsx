import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { profileService } from '../services/profile';
import ResumeUpload from '../components/Profile/ResumeUpload';
import SkillsInput from '../components/Profile/SkillsInput';
import CountryCodeSelector, { detectCountryFromPhone } from '../components/Profile/CountryCodeSelector';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';
import { User, Mail, MapPin, Briefcase, GraduationCap, Save, Upload as UploadIcon, CheckCircle2, Award, Target } from 'lucide-react';

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
    sector_interests: []
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
          // Extract and separate country code from phone number
          let phoneNumber = profile.phone || '';
          let detectedCountry = null;
          
          if (phoneNumber) {
            detectedCountry = detectCountryFromPhone(phoneNumber);
            // Remove country code from phone number for display
            phoneNumber = phoneNumber.replace(/^\+\d+\s*/, '').trim();
          }
          
          setFormData({
            name: profile.name || user.username || '',
            email: profile.email || '',
            phone: phoneNumber,
            location: profile.location_preference || profile.location || profile.city || '',
            education: profile.education_level || profile.education || '',
            experience: profile.experience || '',
            skills: profile.skills_possessed || profile.skills || [],
            field_of_study: profile.field_of_study || '',
            sector_interests: profile.sector_interests || [],
          });
          
          // Auto-detect country from saved phone number
          if (detectedCountry) {
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
    // Phone number already doesn't have country code (we strip it on load/extract)
    // So no need to modify the phone field here
  };

  const handleSkillsChange = (newSkills) => {
    setFormData(prev => ({ ...prev, skills: newSkills }));
    setSuccess(false);
  };

  const handleSectorInterestsChange = (newInterests) => {
    setFormData(prev => ({ ...prev, sector_interests: newInterests }));
    setSuccess(false);
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      formData.name,
      formData.email,
      formData.phone,
      formData.location,
      formData.education,
      formData.experience,
      formData.skills.length > 0,
      formData.sector_interests.length > 0,
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const handleResumeDataExtracted = (data) => {
    // Extract phone without country code for cleaner input
    let phoneNumber = data.phone || '';
    let detectedCountry = null;
    
    if (phoneNumber) {
      detectedCountry = detectCountryFromPhone(phoneNumber);
      // Remove country code from phone number since it's shown separately
      phoneNumber = phoneNumber.replace(/^\+\d+\s*/, '').trim();
    }
    
    // Normalize name: capitalize first letter of each word, rest lowercase
    const normalizeName = (name) => {
      if (!name) return name;
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    setFormData(prev => ({
      ...prev,
      name: normalizeName(data.name) || prev.name,
      email: data.email || prev.email,
      phone: phoneNumber || prev.phone,
      location: data.location || prev.location,
      education: data.education || prev.education,
      experience: data.experience || prev.experience,
      skills: data.skills && data.skills.length > 0 ? data.skills : prev.skills,
      sector_interests: data.sector_interests && data.sector_interests.length > 0 ? data.sector_interests : prev.sector_interests,
    }));
    
    // Auto-detect and set country from extracted phone number
    if (detectedCountry) {
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
      
      // Handle phone number: if country code is selected, check if it's already in the number
      let phoneWithCode = formData.phone.trim();
      if (selectedCountry && phoneWithCode) {
        // Remove existing country code if present (to avoid duplication)
        const phoneWithoutCode = phoneWithCode.replace(/^\+\d+\s*/, '').trim();
        // Add the selected country code
        phoneWithCode = `${selectedCountry.code} ${phoneWithoutCode}`;
      }
      
      const profileData = {
        candidate_id: user.candidate_id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: phoneWithCode,
        location_preference: formData.location.trim(),
        education_level: formData.education.trim(),
        experience: formData.experience.trim(),
        skills_possessed: formData.skills,
        sector_interests: formData.sector_interests || []
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-custom max-w-7xl">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </div>
    );
  }

  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom max-w-7xl">
        {/* Header with Resume Upload */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              My Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Complete your profile to get personalized internship recommendations
            </p>
          </div>
          {!showResumeUpload && (
            <button
              type="button"
              onClick={() => setShowResumeUpload(true)}
              className="btn-primary whitespace-nowrap"
            >
              Upload Resume
            </button>
          )}
        </div>

        {/* Resume Upload Section */}
        {showResumeUpload && (
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorMessage message={error} type="error" />}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Profile saved successfully!
                  </p>
                </div>
              )}

              {/* Personal Information Card */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name <span className="text-red-500">*</span>
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
                      Email <span className="text-red-500">*</span>
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
                      Phone Number
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

              {/* Skills Card - Full Width */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Skills <span className="text-red-500">*</span>
                </h3>
                <SkillsInput
                  skills={formData.skills}
                  onChange={handleSkillsChange}
                  placeholder="Type skills and press Enter (e.g., Python, React...)"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {formData.skills.length} skill{formData.skills.length !== 1 ? 's' : ''} added
                </p>
              </div>

              {/* Education and Sector Interests Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Education Card */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    Education
                  </h3>
                  <textarea
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    placeholder="E.g., B.Tech in Computer Science&#10;XYZ University (2020-2024)&#10;CGPA: 8.5/10"
                    rows="6"
                    className="input-field resize-none"
                  />
                </div>

                {/* Sector Interests Card */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    Sector Interests
                  </h3>
                  <SkillsInput
                    skills={formData.sector_interests}
                    onChange={handleSectorInterestsChange}
                    placeholder="Type sectors and press Enter (e.g., Technology, Finance...)"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {formData.sector_interests.length} sector{formData.sector_interests.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              </div>

              {/* Experience Card - Full Width */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Experience
                </h3>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="Brief summary of your experience, projects, or achievements&#10;&#10;E.g.,&#10;Software Engineer Intern - ABC Corp (Jun 2023 - Aug 2023)&#10;- Built web applications using React and Node.js&#10;- Improved API performance by 40%"
                  rows="8"
                  className="input-field resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="card">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary w-full"
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

          {/* Right Column - Profile Summary Sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Combined Profile Completion & Stats Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Profile Overview
              </h3>
              
              {/* Completion Circle */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
                      className="text-primary-600 dark:text-primary-400 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                {completionPercentage === 100 
                  ? '🎉 Profile is complete!' 
                  : `Complete your profile to get better recommendations`}
              </p>
              
              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Total Skills
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formData.skills.length}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right text-sm">
                    {formData.location || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right text-sm">
                    {formData.education ? 'Added' : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Interests
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formData.sector_interests.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
