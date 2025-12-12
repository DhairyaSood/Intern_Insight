"""
Companies API endpoints
Provides company information and their associated internships
"""

from flask import Blueprint, request, jsonify
from app.core.database import DatabaseManager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors

companies_bp = Blueprint('companies', __name__)
db = DatabaseManager()

@companies_bp.route('/', methods=['GET'])
@handle_errors
def get_companies():
    """
    Get all companies with optional filtering
    Query params:
    - sector: Filter by sector
    - is_hiring: Filter by hiring status (true/false)
    - min_rating: Minimum rating
    - search: Search in company name
    - sort_by: Sort field (name, rating, total_internships)
    - order: Sort order (asc, desc)
    - limit: Number of results
    - offset: Pagination offset
    """
    try:
        # Get query parameters
        sector = request.args.get('sector')
        is_hiring = request.args.get('is_hiring')
        min_rating = request.args.get('min_rating', type=float)
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'name')
        order = request.args.get('order', 'asc')
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', type=int, default=0)
        
        # Build filter query
        filter_query = {}
        
        if sector:
            filter_query['sector'] = sector
        
        if is_hiring is not None:
            filter_query['is_hiring'] = is_hiring.lower() == 'true'
        
        if min_rating is not None:
            filter_query['rating'] = {'$gte': min_rating}
        
        if search:
            filter_query['name'] = {'$regex': search, '$options': 'i'}
        
        # Get companies from database
        companies = db.load_data('companies', filter_query)
        
        # Sort companies
        sort_order = 1 if order == 'asc' else -1
        if sort_by == 'name':
            companies.sort(key=lambda x: x.get('name', '').lower(), reverse=(sort_order == -1))
        elif sort_by == 'rating':
            companies.sort(key=lambda x: x.get('rating', 0), reverse=(sort_order == -1))
        elif sort_by == 'total_internships':
            companies.sort(key=lambda x: x.get('total_internships', 0), reverse=(sort_order == -1))
        
        # Apply pagination
        total = len(companies)
        if limit:
            companies = companies[offset:offset+limit]
        else:
            companies = companies[offset:]
        
        app_logger.info(f"[API] Retrieved {len(companies)} companies (total: {total}, filters: {filter_query})")
        
        return success_response(
            data={
                'companies': companies,
                'total': total,
                'limit': limit,
                'offset': offset
            },
            message=f"Retrieved {len(companies)} companies"
        )
    
    except Exception as e:
        app_logger.error(f"[API] Error fetching companies: {e}")
        return error_response(str(e), 500)


@companies_bp.route('/<company_id>', methods=['GET'])
@handle_errors
def get_company(company_id):
    """
    Get detailed information about a specific company
    Includes full company profile and associated internships
    """
    try:
        # Get company by ID
        companies = db.load_data('companies', {'company_id': company_id})
        
        if not companies:
            return error_response(f"Company with ID {company_id} not found", 404)
        
        company = companies[0]
        
        # Get associated internships
        internship_ids = company.get('internship_ids', [])
        internships = []
        
        if internship_ids:
            internships = db.load_data('internships', {
                'internship_id': {'$in': internship_ids}
            })
        
        # Add internships to company data
        company['internships'] = internships
        
        app_logger.info(f"[API] Retrieved company: {company.get('name')} with {len(internships)} internships")
        
        return success_response(
            data=company,
            message=f"Retrieved company {company.get('name')}"
        )
    
    except Exception as e:
        app_logger.error(f"[API] Error fetching company {company_id}: {e}")
        return error_response(str(e), 500)


@companies_bp.route('/by-name/<company_name>', methods=['GET'])
@handle_errors
def get_company_by_name(company_name):
    """
    Get company by name (case-insensitive)
    Useful for direct lookups from internship organization field
    """
    try:
        # Search for company by name (case-insensitive)
        companies = db.load_data('companies', {
            'name': {'$regex': f'^{company_name}$', '$options': 'i'}
        })
        
        if not companies:
            return error_response(f"Company '{company_name}' not found", 404)
        
        company = companies[0]
        
        # Get associated internships
        internship_ids = company.get('internship_ids', [])
        internships = []
        
        if internship_ids:
            internships = db.load_data('internships', {
                'internship_id': {'$in': internship_ids}
            })
        
        # Add internships to company data
        company['internships'] = internships
        
        app_logger.info(f"[API] Retrieved company by name: {company.get('name')} with {len(internships)} internships")
        
        return success_response(
            data=company,
            message=f"Retrieved company {company.get('name')}"
        )
    
    except Exception as e:
        app_logger.error(f"[API] Error fetching company by name '{company_name}': {e}")
        return error_response(str(e), 500)


@companies_bp.route('/sectors', methods=['GET'])
@handle_errors
def get_sectors():
    """
    Get all unique sectors with company counts
    """
    try:
        companies = db.load_data('companies')
        
        # Count companies by sector
        sector_counts = {}
        for company in companies:
            sector = company.get('sector', 'Other')
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
        
        # Convert to list of objects
        sectors = [
            {'sector': sector, 'count': count}
            for sector, count in sorted(sector_counts.items(), key=lambda x: -x[1])
        ]
        
        app_logger.info(f"[API] Retrieved {len(sectors)} unique sectors")
        
        return success_response(
            data=sectors,
            message=f"Retrieved {len(sectors)} sectors"
        )
    
    except Exception as e:
        app_logger.error(f"[API] Error fetching sectors: {e}")
        return error_response(str(e), 500)


@companies_bp.route('/stats', methods=['GET'])
@handle_errors
def get_company_stats():
    """
    Get overall company statistics
    """
    try:
        companies = db.load_data('companies')
        
        total_companies = len(companies)
        hiring_companies = sum(1 for c in companies if c.get('is_hiring', False))
        total_internships = sum(c.get('total_internships', 0) for c in companies)
        avg_rating = sum(c.get('rating', 0) for c in companies) / total_companies if total_companies > 0 else 0
        
        # Sector distribution
        sectors = {}
        for company in companies:
            sector = company.get('sector', 'Other')
            sectors[sector] = sectors.get(sector, 0) + 1
        
        stats = {
            'total_companies': total_companies,
            'hiring_companies': hiring_companies,
            'total_internships': total_internships,
            'average_rating': round(avg_rating, 2),
            'sectors': len(sectors),
            'sector_distribution': sectors
        }
        
        app_logger.info(f"[API] Retrieved company statistics")
        
        return success_response(
            data=stats,
            message="Retrieved company statistics"
        )
    
    except Exception as e:
        app_logger.error(f"[API] Error fetching company stats: {e}")
        return error_response(str(e), 500)
