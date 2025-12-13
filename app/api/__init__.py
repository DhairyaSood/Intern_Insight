# app/api/__init__.py
"""
API Blueprint Package
Contains all API endpoint modules
"""

from flask import Blueprint
from app.api.internships import get_internships, get_internship_by_id
from app.api.recommendations import (
    get_candidate_recommendations,
    get_internship_recommendations,
    get_candidate_internship_match,
)
from app.api.auth import signup, login, logout, check_login_status
from app.api.profiles import create_or_update_profile, get_profile_by_username, get_profile_by_candidate_id
from app.api.cities import list_cities
from app.api.admin import db_stats
from app.api.resume_parser import parse_resume
from app.api.candidate_ranking import get_candidate_ranking
from app.api.companies import get_companies, get_company, get_company_by_name, get_sectors, get_company_stats
from app.api.company_interactions import (
    like_company, dislike_company, remove_company_interaction,
    get_company_interaction, get_user_interactions
)
from app.api.internship_interactions import (
    like_internship, dislike_internship, remove_internship_interaction,
    get_internship_interaction, get_user_internship_interactions
)
from app.api.reviews import (
    create_company_review, create_internship_review,
    get_company_reviews, get_internship_reviews,
    mark_review_helpful, delete_review
)
from app.api.user_interactions import (
    get_user_interactions as fetch_user_interactions,
    get_user_reviews as fetch_user_reviews
)
from app.api.company_match_scores import (
    get_company_match_score, recalculate_company_score,
    recalculate_all_users_score, get_company_scores_batch,
    get_top_matched_companies
)

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

@api_bp.route('/recommendations/<candidate_id>/match/<internship_id>', methods=['GET'])
def candidate_internship_match_endpoint(candidate_id, internship_id):
    """Get match score for one internship for a candidate"""
    return get_candidate_internship_match(candidate_id, internship_id)

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

# Company interaction routes
@api_bp.route('/companies/<company_id>/like', methods=['POST'])
def company_like_endpoint(company_id):
    """Like a company"""
    return like_company(company_id)

@api_bp.route('/companies/<company_id>/dislike', methods=['POST'])
def company_dislike_endpoint(company_id):
    """Dislike a company"""
    return dislike_company(company_id)

@api_bp.route('/companies/<company_id>/interaction', methods=['DELETE'])
def company_interaction_delete_endpoint(company_id):
    """Remove interaction with a company"""
    return remove_company_interaction(company_id)

@api_bp.route('/companies/<company_id>/interaction', methods=['GET'])
def company_interaction_get_endpoint(company_id):
    """Get user's interaction with a company"""
    return get_company_interaction(company_id)

@api_bp.route('/companies/interactions/user', methods=['GET'])
def user_company_interactions_endpoint():
    """Get all company interactions for current user"""
    return get_user_interactions()

# Internship interaction routes
@api_bp.route('/internships/<internship_id>/like', methods=['POST'])
def internship_like_endpoint(internship_id):
    """Like an internship"""
    return like_internship(internship_id)

@api_bp.route('/internships/<internship_id>/dislike', methods=['POST'])
def internship_dislike_endpoint(internship_id):
    """Dislike an internship"""
    return dislike_internship(internship_id)

@api_bp.route('/internships/<internship_id>/interaction', methods=['DELETE'])
def internship_interaction_delete_endpoint(internship_id):
    """Remove interaction with an internship"""
    return remove_internship_interaction(internship_id)

@api_bp.route('/internships/<internship_id>/interaction', methods=['GET'])
def internship_interaction_get_endpoint(internship_id):
    """Get user's interaction with an internship"""
    return get_internship_interaction(internship_id)

@api_bp.route('/internships/interactions/user', methods=['GET'])
def user_internship_interactions_endpoint():
    """Get all internship interactions for current user"""
    return get_user_internship_interactions()

# Review routes
@api_bp.route('/companies/<company_id>/reviews', methods=['POST'])
def create_company_review_endpoint(company_id):
    """Create a review for a company"""
    return create_company_review(company_id)

@api_bp.route('/companies/<company_id>/reviews', methods=['GET'])
def get_company_reviews_endpoint(company_id):
    """Get all reviews for a company"""
    return get_company_reviews(company_id)

@api_bp.route('/internships/<internship_id>/reviews', methods=['POST'])
def create_internship_review_endpoint(internship_id):
    """Create a review for an internship"""
    return create_internship_review(internship_id)

@api_bp.route('/internships/<internship_id>/reviews', methods=['GET'])
def get_internship_reviews_endpoint(internship_id):
    """Get all reviews for an internship"""
    return get_internship_reviews(internship_id)

@api_bp.route('/reviews/<review_id>/helpful', methods=['POST'])
def mark_review_helpful_endpoint(review_id):
    """Mark a review as helpful"""
    return mark_review_helpful(review_id)

@api_bp.route('/reviews/<review_id>', methods=['DELETE'])
def delete_review_endpoint(review_id):
    """Delete a review"""
    return delete_review(review_id)

# User interactions and reviews endpoints
@api_bp.route('/interactions/<candidate_id>', methods=['GET'])
def get_user_interactions_endpoint(candidate_id):
    """Get all user interactions (likes/dislikes)"""
    return fetch_user_interactions(candidate_id)

@api_bp.route('/reviews/user/<candidate_id>', methods=['GET'])
def get_user_reviews_endpoint(candidate_id):
    """Get all reviews by a user"""
    return fetch_user_reviews(candidate_id)

# Company match score endpoints
@api_bp.route('/companies/<company_id>/match-score', methods=['GET'])
def get_company_match_score_endpoint(company_id):
    """Get match score for a company"""
    return get_company_match_score(company_id)

@api_bp.route('/companies/<company_id>/recalculate-score', methods=['POST'])
def recalculate_company_score_endpoint(company_id):
    """Recalculate match score for current user"""
    return recalculate_company_score(company_id)

@api_bp.route('/companies/<company_id>/recalculate-all', methods=['POST'])
def recalculate_all_users_score_endpoint(company_id):
    """Recalculate match scores for all users (internal)"""
    return recalculate_all_users_score(company_id)

@api_bp.route('/companies/match-scores/batch', methods=['POST'])
def get_company_scores_batch_endpoint():
    """Get match scores for multiple companies"""
    return get_company_scores_batch()

@api_bp.route('/companies/top-matches', methods=['GET'])
def get_top_matched_companies_endpoint():
    """Get top matched companies for current user"""
    return get_top_matched_companies()