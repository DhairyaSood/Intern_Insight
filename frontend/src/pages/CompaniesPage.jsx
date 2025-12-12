import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, TrendingUp, Award, Users } from 'lucide-react';
import { getCompanies, getSectors, getCompanyStats } from '../services/companies';
import CompanyCard from '../components/Company/CompanyCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorMessage from '../components/Common/ErrorMessage';

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [hiringOnly, setHiringOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Run filter whenever companies or filter values change
    if (!companies || companies.length === 0) {
      setFilteredCompanies([]);
      return;
    }

    let filtered = [...companies];

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company =>
        (company.name && company.name.toLowerCase().includes(query)) ||
        (company.description && company.description.toLowerCase().includes(query))
      );
    }

    // Apply sector filter
    if (selectedSector && selectedSector.trim()) {
      filtered = filtered.filter(company => company.sector === selectedSector);
    }

    // Apply hiring filter
    if (hiringOnly) {
      filtered = filtered.filter(company => company.is_hiring === true);
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(company => (company.rating || 0) >= minRating);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'internships':
          return (b.total_internships || 0) - (a.total_internships || 0);
        default:
          return 0;
      }
    });

    setFilteredCompanies(filtered);
  }, [companies, searchQuery, selectedSector, hiringOnly, minRating, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [companiesRes, sectorsRes, statsRes] = await Promise.all([
        getCompanies(),
        getSectors(),
        getCompanyStats()
      ]);

      console.log('Companies API Response:', companiesRes);
      console.log('Sectors API Response:', sectorsRes);
      console.log('Stats API Response:', statsRes);

      // Handle different response structures
      const companiesData = companiesRes.data?.companies || companiesRes.data || [];
      // Backend returns sectors array directly in data, not nested
      const sectorsData = Array.isArray(sectorsRes.data) ? sectorsRes.data : (sectorsRes.data?.sectors || sectorsRes.data || []);
      const statsData = statsRes.data || null;

      console.log('Parsed companies:', companiesData);
      console.log('Parsed sectors:', sectorsData);
      console.log('Sectors count:', sectorsData.length);
      
      setCompanies(companiesData);
      setSectors(sectorsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSector('');
    setHiringOnly(false);
    setMinRating(0);
    setSortBy('name');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && companies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <ErrorMessage message={error} type="error" onClose={() => setError('')} />
          <div className="text-center mt-8">
            <button 
              onClick={fetchData}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Companies
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Explore {stats?.total_companies || companies.length} companies offering internship opportunities
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card-compact bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Companies</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total_companies}</p>
                </div>
              </div>
            </div>

            <div className="card-compact bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Actively Hiring</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.hiring_companies}</p>
                </div>
              </div>
            </div>

            <div className="card-compact bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Internships</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.total_internships}</p>
                </div>
              </div>
            </div>

            <div className="card-compact bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Avg Rating</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.average_rating}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <ErrorMessage message={error} type="error" onClose={() => setError('')} />}

        {/* Quick Filters - Mobile Only (Horizontal Scroll) */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
            <button
              onClick={() => setHiringOnly(!hiringOnly)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                hiringOnly
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-2 border-green-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Hiring Now
            </button>
            <button
              onClick={() => setMinRating(minRating === 4.0 ? 0 : 4.0)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                minRating === 4.0
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              4.0+ Rating
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'rating' ? 'name' : 'rating')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                sortBy === 'rating'
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-2 border-primary-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Top Rated
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'internships' ? 'name' : 'internships')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                sortBy === 'internships'
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-2 border-primary-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Most Internships
            </button>
            {(searchQuery || selectedSector || hiringOnly || minRating > 0 || sortBy !== 'name') && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search companies..."
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sector
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="input-field rounded-lg"
              >
                <option value="">All Sectors</option>
                {sectors.map((sector, index) => {
                  // Handle both string and object formats
                  const sectorName = typeof sector === 'string' ? sector : (sector.sector || sector.name || 'Unknown');
                  const sectorCount = typeof sector === 'object' ? sector.count : '';
                  return (
                    <option key={index} value={sectorName}>
                      {sectorName}{sectorCount ? ` (${sectorCount})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="input-field rounded-lg"
              >
                <option value="0">Any Rating</option>
                <option value="3.5">3.5+</option>
                <option value="4.0">4.0+</option>
                <option value="4.5">4.5+</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field rounded-lg"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="internships">Internships</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hiringOnly}
                onChange={(e) => setHiringOnly(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Hiring Now
              </span>
            </label>

            {(searchQuery || selectedSector || hiringOnly || minRating > 0 || sortBy !== 'name') && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear Filters
              </button>
            )}

            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} found
            </span>
          </div>
        </div>

        {/* Companies Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No companies found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters to see more results
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company, index) => (
              <CompanyCard key={company.company_id || company._id || index} company={company} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
