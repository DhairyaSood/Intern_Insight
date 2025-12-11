import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸', country: 'US' },
  { code: '+1', name: 'Canada', flag: '🇨🇦', country: 'CA' },
  { code: '+91', name: 'India', flag: '🇮🇳', country: 'IN' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', country: 'GB' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', country: 'AU' },
  { code: '+86', name: 'China', flag: '🇨🇳', country: 'CN' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', country: 'JP' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', country: 'DE' },
  { code: '+33', name: 'France', flag: '🇫🇷', country: 'FR' },
  { code: '+971', name: 'UAE', flag: '🇦🇪', country: 'AE' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', country: 'SG' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', country: 'MY' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', country: 'LK' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', country: 'BD' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰', country: 'PK' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', country: 'NP' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', country: 'ID' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', country: 'PH' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭', country: 'TH' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', country: 'KR' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', country: 'ZA' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', country: 'NG' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', country: 'EG' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', country: 'MX' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', country: 'BR' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', country: 'AR' },
  { code: '+7', name: 'Russia', flag: '🇷🇺', country: 'RU' },
  { code: '+34', name: 'Spain', flag: '🇪🇸', country: 'ES' },
  { code: '+39', name: 'Italy', flag: '🇮🇹', country: 'IT' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', country: 'NL' },
];

export const detectCountryFromPhone = (phoneNumber) => {
  if (!phoneNumber) return COUNTRIES[2]; // Default to India
  
  const cleaned = phoneNumber.replace(/\s+/g, '');
  
  // Sort by code length (longest first) to match longer codes like +971 before +1
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  
  for (const country of sortedCountries) {
    if (cleaned.startsWith(country.code)) {
      return country;
    }
  }
  
  return COUNTRIES[2]; // Default to India
};

const CountryCodeSelector = ({ selectedCountry, onCountryChange, phoneNumber }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Auto-detect country from phone number
  useEffect(() => {
    if (phoneNumber && !selectedCountry) {
      const detected = detectCountryFromPhone(phoneNumber);
      onCountryChange(detected);
    }
  }, [phoneNumber, selectedCountry, onCountryChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm)
  );

  const handleSelect = (country) => {
    onCountryChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <span className="text-xl">{selectedCountry?.flag || '🇮🇳'}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedCountry?.code || '+91'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-80">
            {filteredCountries.map((country, index) => (
              <button
                key={`${country.code}-${country.country}-${index}`}
                type="button"
                onClick={() => handleSelect(country)}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedCountry?.code === country.code && selectedCountry?.country === country.country
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {country.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {country.code}
                  </div>
                </div>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;
