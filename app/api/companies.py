"""
Companies API endpoints
Provides company information and their associated internships
"""

from flask import Blueprint, request, jsonify
from app.core.database import DatabaseManager, load_data
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors
from app.utils.company_match_scorer import CompanyMatchScorer
from app.utils.jwt_auth import get_current_user

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
        
        # Prefer MongoDB-side filtering/sorting/pagination to reduce network load.
        companies = []
        total = 0
        try:
            db_conn = db.get_db()
            if db_conn is not None:
                collection = db_conn['companies']

                mongo_filter = {}
                if sector:
                    mongo_filter['sector'] = sector
                if is_hiring is not None:
                    mongo_filter['is_hiring'] = is_hiring.lower() == 'true'
                if min_rating is not None:
                    mongo_filter['rating'] = {'$gte': min_rating}
                if search:
                    mongo_filter['name'] = {'$regex': search, '$options': 'i'}

                total = collection.count_documents(mongo_filter)

                sort_order = 1 if order == 'asc' else -1
                sort_field = sort_by
                if sort_field not in ('name', 'rating', 'total_internships'):
                    sort_field = 'name'

                cursor = collection.find(mongo_filter).sort(sort_field, sort_order).skip(offset)
                if limit:
                    cursor = cursor.limit(limit)
                companies = list(cursor)

                # Convert ObjectId for JSON
                for c in companies:
                    if '_id' in c:
                        c['_id'] = str(c['_id'])
        except Exception as e:
            app_logger.warning(f"[API] Mongo pagination failed, falling back to in-memory: {e}")

        # Fallback to in-memory filtering/paging if needed
        if not companies and total == 0:
            companies = load_data('companies', use_cache=False) or []

            # Apply filters manually
            if filter_query:
                filtered = []
                for company in companies:
                    match = True
                    for key, value in filter_query.items():
                        if isinstance(value, dict) and '$gte' in value:
                            if company.get(key, 0) < value['$gte']:
                                match = False
                                break
                        elif isinstance(value, dict) and '$regex' in value:
                            import re
                            pattern = re.compile(value['$regex'], re.IGNORECASE if value.get('$options') == 'i' else 0)
                            if not pattern.search(str(company.get(key, ''))):
                                match = False
                                break
                        elif company.get(key) != value:
                            match = False
                            break
                    if match:
                        filtered.append(company)
                companies = filtered

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
        companies = load_data('companies', use_cache=False) or []
        companies = [c for c in companies if c.get('company_id') == company_id]
        
        if not companies:
            return error_response(f"Company with ID {company_id} not found", 404)
        
        company = companies[0]
        
        # Get associated internships
        internship_ids = company.get('internship_ids', [])
        internships = []
        
        if internship_ids:
            all_internships = load_data('internships', use_cache=False) or []
            internships = [i for i in all_internships if i.get('internship_id') in internship_ids]
        
        # Add internships to company data
        company['internships'] = internships
        
        # Calculate match score if user is authenticated
        from app.utils.company_match_scorer import CompanyMatchScorer
        from flask import request
        import jwt
        from app.config import Config
        
        match_score = None
        try:
            # Manually decode token since this endpoint doesn't require authentication
            auth_header = request.headers.get('Authorization', '')
            app_logger.info(f"[MATCH SCORE DEBUG] Auth header present: {bool(auth_header)}")
            
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                app_logger.info(f"[MATCH SCORE DEBUG] Token extracted: {token[:20]}...")
                
                try:
                    payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
                    app_logger.info(f"[MATCH SCORE DEBUG] Token payload: {payload}")
                    
                    candidate_id = payload.get('candidate_id')
                    if candidate_id:
                        app_logger.info(f"[MATCH SCORE DEBUG] Calculating score for candidate {candidate_id} and company {company_id}")
                        match_score = CompanyMatchScorer.get_company_match_score(candidate_id, company_id)
                        app_logger.info(f"[MATCH SCORE DEBUG] Calculated score: {match_score}")
                    else:
                        app_logger.info("[MATCH SCORE DEBUG] No candidate_id in token payload")
                except jwt.ExpiredSignatureError:
                    app_logger.info("[MATCH SCORE DEBUG] Token expired")
                except jwt.InvalidTokenError as e:
                    app_logger.info(f"[MATCH SCORE DEBUG] Invalid token: {e}")
            else:
                app_logger.info("[MATCH SCORE DEBUG] No Bearer token in Authorization header")
                
        except Exception as score_err:
            app_logger.error(f"[MATCH SCORE DEBUG] Error calculating match score: {score_err}", exc_info=True)
        
        company['match_score'] = match_score
        app_logger.info(f"[API] Retrieved company: {company.get('name')} with {len(internships)} internships and match_score={match_score}")
        app_logger.info(f"[API] Returning company data with keys: {list(company.keys())}")
        
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
        companies = load_data('companies', use_cache=False) or []
        companies = [c for c in companies if c.get('name', '').lower() == company_name.lower()]
        
        if not companies:
            return error_response(f"Company '{company_name}' not found", 404)
        
        company = companies[0]
        
        # Get associated internships
        internship_ids = company.get('internship_ids', [])
        internships = []
        
        if internship_ids:
            all_internships = load_data('internships', use_cache=False) or []
            internships = [i for i in all_internships if i.get('internship_id') in internship_ids]
        
        # Add internships to company data
        company['internships'] = internships
        
        # Add match score if user is authenticated
        from app.utils.company_match_scorer import CompanyMatchScorer
        from flask import request
        import jwt
        from app.config import Config
        
        match_score = None
        try:
            # Manually decode token since this endpoint doesn't require authentication
            auth_header = request.headers.get('Authorization', '')
            app_logger.info(f"[MATCH SCORE DEBUG by-name] Auth header present: {bool(auth_header)}")
            
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                app_logger.info(f"[MATCH SCORE DEBUG by-name] Token extracted")
                
                try:
                    payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
                    app_logger.info(f"[MATCH SCORE DEBUG by-name] Token payload: {payload}")
                    
                    candidate_id = payload.get('candidate_id')
                    company_id = company.get('company_id')
                    if candidate_id and company_id:
                        app_logger.info(f"[MATCH SCORE DEBUG by-name] Calculating for candidate: {candidate_id}, company: {company_id}")
                        match_score = CompanyMatchScorer.get_company_match_score(candidate_id, company_id)
                        app_logger.info(f"[MATCH SCORE DEBUG by-name] Calculated score: {match_score}")
                    else:
                        app_logger.info(f"[MATCH SCORE DEBUG by-name] Missing IDs - candidate: {candidate_id}, company: {company_id}")
                except jwt.ExpiredSignatureError:
                    app_logger.info("[MATCH SCORE DEBUG by-name] Token expired")
                except jwt.InvalidTokenError as e:
                    app_logger.info(f"[MATCH SCORE DEBUG by-name] Invalid token: {e}")
            else:
                app_logger.info("[MATCH SCORE DEBUG by-name] No Bearer token")
                
        except Exception as score_err:
            app_logger.error(f"[MATCH SCORE DEBUG by-name] Error: {score_err}", exc_info=True)
        
        company['match_score'] = match_score
        app_logger.info(f"[API] Retrieved company by name: {company.get('name')} with {len(internships)} internships and match_score={match_score}")
        
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
        companies = load_data('companies', use_cache=False)
        
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
        companies = load_data('companies', use_cache=False)
        
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
