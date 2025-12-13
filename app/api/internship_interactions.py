"""
Internship Interactions API endpoints
Handles like/dislike actions for internships (personal preferences)
"""

from flask import Blueprint, request, jsonify
from app.core.database import DatabaseManager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors
from app.utils.jwt_auth import token_required, get_current_user
from app.utils.company_match_scorer import CompanyMatchScorer
from app.utils.preference_profile import rebuild_and_save_personal_preference_profile
from bson import ObjectId
from datetime import datetime
import re

internship_interactions_bp = Blueprint('internship_interactions', __name__)
db = DatabaseManager()

@internship_interactions_bp.route('/<internship_id>/like', methods=['POST'])
@token_required
@handle_errors
def like_internship(internship_id):
    """
    Like an internship
    Stores user's positive interaction with an internship (personal preference)
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
        interactions_collection = database['internship_interactions']
        
        # Check if interaction already exists
        existing = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'internship_id': internship_id
        })
        
        interaction_data = {
            'candidate_id': candidate_id,
            'internship_id': internship_id,
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
            message = "Internship like updated"
        else:
            # Create new interaction
            interactions_collection.insert_one(interaction_data)
            message = "Internship liked successfully"

        # Rebuild personal preference profile for this candidate
        try:
            rebuild_and_save_personal_preference_profile(database, candidate_id)
        except Exception as pref_err:
            app_logger.warning(f"Error updating personal preference profile: {pref_err}")
        
        # Recalculate company match score (internship feedback affects company score)
        try:
            # Get internship to find company mapping (try both string ID and ObjectId)
            internship = database.internships.find_one({'internship_id': internship_id})
            if not internship:
                try:
                    internship = database.internships.find_one({'_id': ObjectId(internship_id)})
                except Exception:
                    internship = None

            company_id = None
            if internship:
                company_id = internship.get('company_id')

                # If company_id is an ObjectId, resolve to stable companies.company_id when possible.
                if isinstance(company_id, ObjectId):
                    company_doc = database.companies.find_one({'_id': company_id})
                    company_id = (company_doc or {}).get('company_id') or str(company_id)

                # If internship doesn't carry company_id, map by organization/company name.
                if not company_id:
                    org = internship.get('organization') or internship.get('company')
                    if org:
                        company_doc = database.companies.find_one({
                            'name': {'$regex': f'^{re.escape(str(org))}$', '$options': 'i'}
                        })
                        if company_doc:
                            company_id = company_doc.get('company_id')

            if company_id:
                company_id = str(company_id)
                score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
                CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
                app_logger.info(
                    f"Successfully updated company {company_id} match score from internship {internship_id} like"
                )
        except Exception as score_err:
            app_logger.warning(f"Error updating company match score from internship like: {score_err}")
        
        app_logger.info(f"User {candidate_id} liked internship {internship_id} with reasons: {reason_tags}")
        return success_response(
            data={'interaction_type': 'like', 'internship_id': internship_id},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error liking internship: {e}")
        return error_response(f"Failed to like internship: {str(e)}", 500)


@internship_interactions_bp.route('/<internship_id>/dislike', methods=['POST'])
@token_required
@handle_errors
def dislike_internship(internship_id):
    """
    Dislike an internship
    Stores user's negative interaction with an internship (personal preference)
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
        interactions_collection = database['internship_interactions']
        
        # Check if interaction already exists
        existing = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'internship_id': internship_id
        })
        
        interaction_data = {
            'candidate_id': candidate_id,
            'internship_id': internship_id,
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
            message = "Internship dislike updated"
        else:
            # Create new interaction
            interactions_collection.insert_one(interaction_data)
            message = "Internship disliked successfully"

        # Rebuild personal preference profile for this candidate
        try:
            rebuild_and_save_personal_preference_profile(database, candidate_id)
        except Exception as pref_err:
            app_logger.warning(f"Error updating personal preference profile: {pref_err}")
        
        # Recalculate company match score (internship feedback affects company score)
        try:
            internship = database.internships.find_one({'internship_id': internship_id})
            if not internship:
                try:
                    internship = database.internships.find_one({'_id': ObjectId(internship_id)})
                except Exception:
                    internship = None

            company_id = None
            if internship:
                company_id = internship.get('company_id')
                if isinstance(company_id, ObjectId):
                    company_doc = database.companies.find_one({'_id': company_id})
                    company_id = (company_doc or {}).get('company_id') or str(company_id)

                if not company_id:
                    org = internship.get('organization') or internship.get('company')
                    if org:
                        company_doc = database.companies.find_one({
                            'name': {'$regex': f'^{re.escape(str(org))}$', '$options': 'i'}
                        })
                        if company_doc:
                            company_id = company_doc.get('company_id')

            if company_id:
                company_id = str(company_id)
                score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
                CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
                app_logger.info(
                    f"Successfully updated company {company_id} match score from internship {internship_id} dislike"
                )
        except Exception as score_err:
            app_logger.warning(f"Error updating company match score from internship dislike: {score_err}")
        
        app_logger.info(f"User {candidate_id} disliked internship {internship_id} with reasons: {reason_tags}")
        return success_response(
            data={'interaction_type': 'dislike', 'internship_id': internship_id},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error disliking internship: {e}")
        return error_response(f"Failed to dislike internship: {str(e)}", 500)


@internship_interactions_bp.route('/<internship_id>/interaction', methods=['DELETE'])
@token_required
@handle_errors
def remove_internship_interaction(internship_id):
    """
    Remove user's interaction with an internship
    (Unlike or undislike)
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['internship_interactions']
        
        result = interactions_collection.delete_one({
            'candidate_id': candidate_id,
            'internship_id': internship_id
        })
        
        if result.deleted_count > 0:
            # Rebuild personal preference profile for this candidate
            try:
                rebuild_and_save_personal_preference_profile(database, candidate_id)
            except Exception as pref_err:
                app_logger.warning(f"Error updating personal preference profile: {pref_err}")

            # Recalculate company match score (internship feedback affects company score)
            try:
                internship = database.internships.find_one({'internship_id': internship_id})
                if not internship:
                    try:
                        internship = database.internships.find_one({'_id': ObjectId(internship_id)})
                    except Exception:
                        internship = None

                company_id = None
                if internship:
                    company_id = internship.get('company_id')
                    if isinstance(company_id, ObjectId):
                        company_doc = database.companies.find_one({'_id': company_id})
                        company_id = (company_doc or {}).get('company_id') or str(company_id)

                    if not company_id:
                        org = internship.get('organization') or internship.get('company')
                        if org:
                            company_doc = database.companies.find_one({
                                'name': {'$regex': f'^{re.escape(str(org))}$', '$options': 'i'}
                            })
                            if company_doc:
                                company_id = company_doc.get('company_id')

                if company_id:
                    company_id = str(company_id)
                    score_data = CompanyMatchScorer.calculate_user_company_score(candidate_id, company_id)
                    CompanyMatchScorer.save_company_match_score(candidate_id, company_id, score_data)
                    app_logger.info(
                        f"Successfully updated company {company_id} match score from internship {internship_id} interaction removal"
                    )
            except Exception as score_err:
                app_logger.warning(f"Error updating company match score from internship interaction removal: {score_err}")

            app_logger.info(f"User {candidate_id} removed interaction with internship {internship_id}")
            return success_response(
                data={'internship_id': internship_id},
                message="Interaction removed successfully"
            )
        else:
            return error_response("No interaction found to remove", 404)
            
    except Exception as e:
        app_logger.error(f"Error removing internship interaction: {e}")
        return error_response(f"Failed to remove interaction: {str(e)}", 500)


@internship_interactions_bp.route('/<internship_id>/interaction', methods=['GET'])
@token_required
@handle_errors
def get_internship_interaction(internship_id):
    """
    Get user's current interaction with a specific internship
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['internship_interactions']
        
        app_logger.info(f"[GET INTERACTION] Looking for interaction: candidate_id={candidate_id}, internship_id={internship_id}")
        
        # Debug: Check what's actually in the database
        sample_interaction = interactions_collection.find_one({'internship_id': internship_id})
        if sample_interaction:
            app_logger.info(f"[GET INTERACTION DEBUG] Sample interaction found for {internship_id}")
            app_logger.info(f"[GET INTERACTION DEBUG] Sample candidate_id type: {type(sample_interaction.get('candidate_id'))}, value: {sample_interaction.get('candidate_id')}")
            app_logger.info(f"[GET INTERACTION DEBUG] Query candidate_id type: {type(candidate_id)}, value: {candidate_id}")
        
        interaction = interactions_collection.find_one({
            'candidate_id': candidate_id,
            'internship_id': internship_id
        })
        
        app_logger.info(f"[GET INTERACTION] Found interaction: {interaction is not None}")
        if interaction:
            app_logger.info(f"[GET INTERACTION] Interaction type: {interaction.get('interaction_type')}")
        
        if interaction:
            # Convert ObjectId to string
            interaction['_id'] = str(interaction['_id'])
            
            # Add company info for frontend display
            try:
                internship = database.internships.find_one({'internship_id': internship_id})
                if internship:
                    interaction['company_name'] = internship.get('organization', '')
                    interaction['company_id'] = internship.get('company_id', '')
            except Exception as e:
                app_logger.warning(f"Could not fetch company info: {e}")
            
            return success_response(
                data={'interaction': interaction},
                message="Interaction retrieved successfully"
            )
        else:
            return success_response(
                data={'interaction': None},
                message="No interaction found"
            )
            
    except Exception as e:
        app_logger.error(f"Error getting internship interaction: {e}")
        return error_response(f"Failed to get interaction: {str(e)}", 500)


@internship_interactions_bp.route('/interactions/user', methods=['GET'])
@token_required
@handle_errors
def get_user_internship_interactions():
    """
    Get all internship interactions for the current user
    Useful for filtering/personalization
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        interactions_collection = database['internship_interactions']
        
        # Get all interactions, sorted by timestamp descending for deduplication
        interactions = list(interactions_collection.find({
            'candidate_id': candidate_id
        }).sort('timestamp', -1))
        
        # Deduplicate - keep only the most recent interaction per internship
        seen_internships = set()
        unique_interactions = []
        
        for interaction in interactions:
            internship_id = interaction.get('internship_id')
            if internship_id not in seen_internships:
                seen_internships.add(internship_id)
                interaction['_id'] = str(interaction['_id'])
                
                # Add company info
                try:
                    internship = database.internships.find_one({'internship_id': internship_id})
                    if internship:
                        interaction['company_name'] = internship.get('organization', '')
                        interaction['company_id'] = internship.get('company_id', '')
                except Exception as e:
                    app_logger.warning(f"Could not fetch company info: {e}")
                
                unique_interactions.append(interaction)
        
        app_logger.info(f"Retrieved {len(unique_interactions)} unique internship interactions (from {len(interactions)} total)")
        return success_response(
            data={'interactions': unique_interactions},
            message=f"Retrieved {len(unique_interactions)} interactions"
        )
    
    except Exception as e:
        app_logger.error(f"Error getting user internship interactions: {e}")
        return error_response(f"Failed to get interactions: {str(e)}", 500)
