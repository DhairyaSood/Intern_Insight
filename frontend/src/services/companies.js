import api from './api';

/**
 * Get all companies with optional filtering
 * @param {Object} params - Query parameters (sector, is_hiring, min_rating, search, sort_by, order, limit, offset)
 * @returns {Promise} Company list with pagination info
 */
export const getCompanies = async (params = {}) => {
  const response = await api.get('/companies', { params });
  return response;
};

/**
 * Get a specific company by ID
 * @param {string} companyId - The company ID
 * @returns {Promise} Company details with internships
 */
export const getCompanyById = async (companyId) => {
  const response = await api.get(`/companies/${companyId}`);
  return response;
};

/**
 * Get a company by name
 * @param {string} companyName - The company name
 * @returns {Promise} Company details with internships
 */
export const getCompanyByName = async (companyName) => {
  const response = await api.get(`/companies/by-name/${encodeURIComponent(companyName)}`);
  return response;
};

/**
 * Get all unique sectors with company counts
 * @returns {Promise} List of sectors with counts
 */
export const getSectors = async () => {
  const response = await api.get('/companies/sectors');
  return response;
};

/**
 * Get overall company statistics
 * @returns {Promise} Company statistics
 */
export const getCompanyStats = async () => {
  const response = await api.get('/companies/stats');
  return response;
};
