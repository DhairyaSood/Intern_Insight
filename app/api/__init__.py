# app/api/__init__.py
"""
API Blueprint Package
Contains all API endpoint modules
"""

from flask import Blueprint
from app.api.internships import get_internships, get_internship_by_id
from app.api.recommendations import get_candidate_recommendations, get_internship_recommendations
from app.api.auth import signup, login, logout, check_login_status
from app.api.profiles import create_or_update_profile, get_profile_by_username, get_profile_by_candidate_id
from app.api.cities import list_cities
from app.api.admin import db_stats
from app.api.resume_parser import parse_resume
from app.api.candidate_ranking import get_candidate_ranking
from app.api.companies import get_companies, get_company, get_company_by_name, get_sectors, get_company_stats

# Create API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Register internship routes
@api_bp.route('/internships', methods=['GET'])
def internships_endpoint():
    """Get all internships"""
    return get_internships()

@api_bp.route('/internships/<internship_id>', methods=['GET'])
def internship_by_id_endpoint(internship_id):
    """Get specific internship by ID"""
    return get_internship_by_id(internship_id)

# Register cities route
@api_bp.route('/cities', methods=['GET'])
def cities_endpoint():
    """Get list of cities for dropdown"""
    return list_cities()

# Register recommendation routes
@api_bp.route('/recommendations/<candidate_id>', methods=['GET'])
def candidate_recommendations_endpoint(candidate_id):
    """Get recommendations for a candidate"""
    return get_candidate_recommendations(candidate_id)

@api_bp.route('/recommendations/by_internship/<internship_id>', methods=['GET'])
def internship_recommendations_endpoint(internship_id):
    """Get similar internships"""
    return get_internship_recommendations(internship_id)

# Register authentication routes
@api_bp.route('/auth/signup', methods=['POST'])
def signup_endpoint():
    """User registration"""
    return signup()

@api_bp.route('/auth/login', methods=['POST'])
def login_endpoint():
    """User login"""
    return login()

@api_bp.route('/auth/logout', methods=['POST'])
def logout_endpoint():
    """User logout"""
    return logout()

@api_bp.route('/auth/status', methods=['GET'])
def login_status_endpoint():
    """Check login status"""
    return check_login_status()

# Register profile management routes
@api_bp.route('/profile', methods=['POST'])
def create_profile_endpoint():
    """Create or update user profile"""
    return create_or_update_profile()

@api_bp.route('/profiles/by_username/<username>', methods=['GET'])
def get_profile_by_username_endpoint(username):
    """Get profile by username"""
    return get_profile_by_username(username)

@api_bp.route('/profile/<candidate_id>', methods=['GET'])
def get_profile_by_candidate_id_endpoint(candidate_id):
    """Get profile by candidate ID"""
    return get_profile_by_candidate_id(candidate_id)

# Admin/diagnostics routes
@api_bp.route('/admin/db-stats', methods=['GET'])
def admin_db_stats_endpoint():
    """Basic DB stats for quick verification"""
    return db_stats()

# Resume parser route
@api_bp.route('/parse-resume', methods=['POST'])
def parse_resume_endpoint():
    """Parse resume file and extract data"""
    return parse_resume()

# Candidate ranking route
@api_bp.route('/ranking/<internship_id>', methods=['GET'])
def candidate_ranking_endpoint(internship_id):
    """Get candidate's ranking for a specific internship"""
    return get_candidate_ranking(internship_id)

# Company routes
@api_bp.route('/companies', methods=['GET'])
def companies_endpoint():
    """Get all companies with optional filtering"""
    return get_companies()

@api_bp.route('/companies/<company_id>', methods=['GET'])
def company_by_id_endpoint(company_id):
    """Get specific company by ID"""
    return get_company(company_id)

@api_bp.route('/companies/by-name/<company_name>', methods=['GET'])
def company_by_name_endpoint(company_name):
    """Get company by name"""
    return get_company_by_name(company_name)

@api_bp.route('/companies/sectors', methods=['GET'])
def company_sectors_endpoint():
    """Get all unique sectors with counts"""
    return get_sectors()

@api_bp.route('/companies/stats', methods=['GET'])
def company_stats_endpoint():
    """Get overall company statistics"""
    return get_company_stats()