"""
Company Interactions API endpoints
Handles like/dislike actions for companies
"""

from flask import Blueprint, request, jsonify
from app.core.database import DatabaseManager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors
from app.utils.jwt_auth import token_required, get_current_user
from app.utils.company_match_scorer import CompanyMatchScorer
from bson import ObjectId
from datetime import datetime

company_interactions_bp = Blueprint('company_interactions', __name__)
db = DatabaseManager()

@company_interactions_bp.route('/<company_id>/like', methods=['POST'])
@token_required
@handle_errors
def like_company(company_id):
    """
    Like a company
    Stores user's positive interaction with a company
    Accepts optional reason_tags (list) and reason_text (string)
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        # Get reason data from request body
        data = request.get_json() or {}
        reason_tags = data.get('reason_tags', [])
        reason_text = data.get('reason_text', '')
        
        database = db.get_db()
        interactions_collection = database['company_interactions']
        
        # Check if interaction already exists
        existing = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'company_id': company_id
        })
        
        interaction_data = {
            'candidate_id': candidate_id,
            'company_id': company_id,
            'interaction_type': 'like',
            'timestamp': datetime.utcnow(),
            'reason_tags': reason_tags if reason_tags else [],
            'reason_text': reason_text if reason_text else ''
        }
        
        if existing:
            # Update existing interaction
            interactions_collection.update_one(
                {'_id': existing['_id']},
                {'$set': interaction_data}
            )
            message = "Company like updated"
        else:
            # Create new interaction
            interactions_collection.insert_one(interaction_data)
            message = "Company liked successfully"
        
        # Recalculate match score for this user-company pair
        try:
            score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
            CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
            
            # Apply global impact to other users' scores
            CompanyMatchScorer.apply_global_impact(company_id, 'like')
        except Exception as score_err:
            app_logger.warning(f"Error updating match scores: {score_err}")
        
        app_logger.info(f"User {candidate_id} liked company {company_id} with reasons: {reason_tags}")
        return success_response(
            data={'interaction_type': 'like', 'company_id': company_id},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error liking company: {e}")
        return error_response(f"Failed to like company: {str(e)}", 500)


@company_interactions_bp.route('/<company_id>/dislike', methods=['POST'])
@token_required
@handle_errors
def dislike_company(company_id):
    """
    Dislike a company
    Stores user's negative interaction with a company
    Accepts optional reason_tags (list) and reason_text (string)
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        # Get reason data from request body
        data = request.get_json() or {}
        reason_tags = data.get('reason_tags', [])
        reason_text = data.get('reason_text', '')
        
        database = db.get_db()
        interactions_collection = database['company_interactions']
        
        # Check if interaction already exists
        existing = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'company_id': company_id
        })
        
        interaction_data = {
            'candidate_id': candidate_id,
            'company_id': company_id,
            'interaction_type': 'dislike',
            'timestamp': datetime.utcnow(),
            'reason_tags': reason_tags if reason_tags else [],
            'reason_text': reason_text if reason_text else ''
        }
        
        if existing:
            # Update existing interaction
            interactions_collection.update_one(
                {'_id': existing['_id']},
                {'$set': interaction_data}
            )
            message = "Company dislike updated"
        else:
            # Create new interaction
            interactions_collection.insert_one(interaction_data)
            message = "Company disliked successfully"
        
        # Recalculate match score for this user-company pair
        try:
            score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
            CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
            
            # Apply global impact to other users' scores
            CompanyMatchScorer.apply_global_impact(company_id, 'dislike')
        except Exception as score_err:
            app_logger.warning(f"Error updating match scores: {score_err}")
        
        app_logger.info(f"User {candidate_id} disliked company {company_id} with reasons: {reason_tags}")
        return success_response(
            data={'interaction_type': 'dislike', 'company_id': company_id},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error disliking company: {e}")
        return error_response(f"Failed to dislike company: {str(e)}", 500)


@company_interactions_bp.route('/<company_id>/interaction', methods=['DELETE'])
@token_required
@handle_errors
def remove_company_interaction(company_id):
    """
    Remove like/dislike from a company
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['company_interactions']
        
        result = interactions_collection.delete_one({
            'candidate_id': candidate_id,
            'company_id': company_id
        })
        
        if result.deleted_count > 0:
            # Recalculate match score for this user-company pair now that interaction is removed
            updated_match_score = None
            try:
                score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
                CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
                updated_match_score = score_data.get('match_score')
            except Exception as score_err:
                app_logger.warning(f"Error updating match score after removing interaction: {score_err}")

            app_logger.info(f"User {candidate_id} removed interaction with company {company_id}")
            return success_response(
                data={
                    'company_id': company_id,
                    'match_score': updated_match_score
                },
                message="Interaction removed successfully"
            )
        else:
            return error_response("No interaction found to remove", 404)
        
    except Exception as e:
        app_logger.error(f"Error removing company interaction: {e}")
        return error_response(f"Failed to remove interaction: {str(e)}", 500)


@company_interactions_bp.route('/<company_id>/interaction', methods=['GET'])
@token_required
@handle_errors
def get_company_interaction(company_id):
    """
    Get user's interaction with a specific company
    Returns: { interaction_type: 'like' | 'dislike' | null }
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['company_interactions']
        
        interaction = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'company_id': company_id
        })
        
        if interaction:
            # Convert ObjectId to string for JSON serialization
            interaction_data = {
                'interaction_type': interaction['interaction_type'],
                'company_id': company_id,
                'timestamp': interaction['timestamp'].isoformat()
            }
            # Return in nested format to match internship API structure
            return success_response(data={'interaction': interaction_data})
        else:
            return success_response(data={'interaction': None, 'company_id': company_id})
        
    except Exception as e:
        app_logger.error(f"Error getting company interaction: {e}")
        return error_response(f"Failed to get interaction: {str(e)}", 500)


@company_interactions_bp.route('/user/interactions', methods=['GET'])
@token_required
@handle_errors
def get_user_interactions():
    """
    Get all company interactions for the current user
    Returns: { liked: [...company_ids], disliked: [...company_ids] }
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['company_interactions']
        
        interactions = list(interactions_collection.find({
            'candidate_id': candidate_id
        }))
        
        liked = [i['company_id'] for i in interactions if i['interaction_type'] == 'like']
        disliked = [i['company_id'] for i in interactions if i['interaction_type'] == 'dislike']
        
        return success_response(data={
            'liked': liked,
            'disliked': disliked,
            'total': len(interactions)
        })
        
    except Exception as e:
        app_logger.error(f"Error getting user interactions: {e}")
        return error_response(f"Failed to get interactions: {str(e)}", 500)
