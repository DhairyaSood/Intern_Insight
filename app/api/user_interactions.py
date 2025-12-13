"""
User Interactions API endpoints
Handles fetching all user interactions (likes/dislikes) and reviews
"""

from flask import Blueprint, jsonify
from app.core.database import DatabaseManager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors
from app.utils.jwt_auth import token_required, get_current_user
from bson import ObjectId
from datetime import datetime

user_interactions_bp = Blueprint('user_interactions', __name__)
db = DatabaseManager()

@user_interactions_bp.route('/interactions/<candidate_id>', methods=['GET'])
@token_required
@handle_errors
def get_user_interactions(candidate_id):
    """
    Get all interactions (likes/dislikes) for a user
    Returns combined list of company and internship interactions with entity details
    """
    try:
        current_user = get_current_user()
        # Only allow users to view their own interactions
        if current_user.get('candidate_id') != candidate_id:
            return error_response("Unauthorized access", 403)
        
        database = db.get_db()
        company_interactions = database['company_interactions']
        internship_interactions = database['internship_interactions']
        companies = database['companies']
        internships = database['internships']
        
        # Get company interactions
        company_inters = list(company_interactions.find({'candidate_id': candidate_id}))
        interactions_list = []
        
        for interaction in company_inters:
            # Get company details
            company = companies.find_one({'company_id': interaction.get('company_id')})
            if company:
                interactions_list.append({
                    'entity_type': 'company',
                    'entity_id': interaction.get('company_id'),
                    'entity_name': company.get('name', 'Unknown Company'),
                    'interaction_type': interaction.get('interaction_type'),
                    'reasons': interaction.get('reason_tags', []),
                    'custom_reason': interaction.get('reason_text', ''),
                    'timestamp': interaction.get('timestamp').isoformat() if interaction.get('timestamp') else None
                })
        
        # Get internship interactions
        internship_inters = list(internship_interactions.find({'candidate_id': candidate_id}))
        
        for interaction in internship_inters:
            # Get internship details
            internship = internships.find_one({'internship_id': interaction.get('internship_id')})
            if internship:
                company_id = internship.get('company_id')
                company_name = internship.get('organization') or internship.get('company')
                if company_id and not company_name:
                    company = companies.find_one({'company_id': company_id})
                    if company:
                        company_name = company.get('name')
                interactions_list.append({
                    'entity_type': 'internship',
                    'entity_id': interaction.get('internship_id'),
                    'entity_name': internship.get('title', 'Unknown Internship'),
                    'company_id': company_id,
                    'company_name': company_name,
                    'interaction_type': interaction.get('interaction_type'),
                    'reasons': interaction.get('reason_tags', []),
                    'custom_reason': interaction.get('reason_text', ''),
                    'timestamp': interaction.get('timestamp').isoformat() if interaction.get('timestamp') else None
                })
        
        # Sort by timestamp (newest first)
        interactions_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return success_response(
            data={'interactions': interactions_list},
            message=f"Found {len(interactions_list)} interactions"
        )
        
    except Exception as e:
        app_logger.error(f"Error fetching user interactions: {e}")
        return error_response(f"Failed to fetch interactions: {str(e)}", 500)


@user_interactions_bp.route('/reviews/user/<candidate_id>', methods=['GET'])
@token_required
@handle_errors
def get_user_reviews(candidate_id):
    """
    Get all reviews written by a user
    Returns combined list of company and internship reviews with entity details
    """
    try:
        current_user = get_current_user()
        # Only allow users to view their own reviews
        if current_user.get('candidate_id') != candidate_id:
            return error_response("Unauthorized access", 403)
        
        database = db.get_db()
        company_reviews = database['company_reviews']
        internship_reviews = database['internship_reviews']
        companies = database['companies']
        internships = database['internships']
        
        reviews_list = []
        
        # Get company reviews
        comp_reviews = list(company_reviews.find({'candidate_id': candidate_id}))
        
        for review in comp_reviews:
            # Get company details
            company = companies.find_one({'company_id': review.get('company_id')})
            if company:
                reviews_list.append({
                    '_id': str(review.get('_id')),
                    'entity_type': 'company',
                    'entity_id': review.get('company_id'),
                    'entity_name': company.get('name', 'Unknown Company'),
                    'rating': review.get('rating'),
                    'title': review.get('title', ''),
                    'review_text': review.get('review_text'),
                    'pros': review.get('pros', ''),
                    'cons': review.get('cons', ''),
                    'timestamp': review.get('timestamp').isoformat() if review.get('timestamp') else None,
                    'helpful_count': review.get('helpful_count', 0)
                })
        
        # Get internship reviews
        intern_reviews = list(internship_reviews.find({'candidate_id': candidate_id}))
        
        for review in intern_reviews:
            # Get internship details
            internship = internships.find_one({'internship_id': review.get('internship_id')})
            if internship:
                company_id = internship.get('company_id')
                company_name = internship.get('organization') or internship.get('company')
                if company_id and not company_name:
                    company = companies.find_one({'company_id': company_id})
                    if company:
                        company_name = company.get('name')
                reviews_list.append({
                    '_id': str(review.get('_id')),
                    'entity_type': 'internship',
                    'entity_id': review.get('internship_id'),
                    'entity_name': internship.get('title', 'Unknown Internship'),
                    'company_id': company_id,
                    'company_name': company_name,
                    'rating': review.get('rating'),
                    'review_text': review.get('review_text'),
                    'tags': review.get('tags', []),
                    'would_recommend': review.get('would_recommend'),
                    'experience_type': review.get('experience_type', ''),
                    'timestamp': review.get('timestamp').isoformat() if review.get('timestamp') else None,
                    'helpful_count': review.get('helpful_count', 0)
                })
        
        # Sort by timestamp (newest first)
        reviews_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return success_response(
            data={'reviews': reviews_list},
            message=f"Found {len(reviews_list)} reviews"
        )
        
    except Exception as e:
        app_logger.error(f"Error fetching user reviews: {e}")
        return error_response(f"Failed to fetch reviews: {str(e)}", 500)
