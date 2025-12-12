import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, Briefcase, Star, ExternalLink } from 'lucide-react';

const CompanyCard = ({ company }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/companies/${company.company_id}`);
  };

  return (
    <div className="card-compact hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        {/* Company Logo */}
        <div className="flex-shrink-0">
          <img
            src={company.logo_url}
            alt={`${company.name} logo`}
            className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&size=64&background=random&bold=true`;
            }}
          />
        </div>

        {/* Company Name and Rating */}
        <div className="flex-grow min-w-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
            {company.name}
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium">
              {company.sector}
            </span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {company.rating}
              </span>
            </div>
          </div>
        </div>

        {/* Hiring Badge */}
        {company.is_hiring && (
          <div className="flex-shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
              Hiring
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
        {company.description}
      </p>

      {/* Company Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{company.headquarters}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Users className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{company.employee_count} employees</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {company.total_internships} {company.total_internships === 1 ? 'internship' : 'internships'}
          </span>
        </div>
      </div>

      {/* Specializations */}
      {company.specializations && company.specializations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {company.specializations.slice(0, 3).map((spec, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {spec}
            </span>
          ))}
          {company.specializations.length > 3 && (
            <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 py-1">
              +{company.specializations.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleViewDetails}
          className="flex-1 btn-primary min-h-[44px] flex items-center justify-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          View Company
        </button>
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 min-h-[44px] border border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
};

export default CompanyCard;
