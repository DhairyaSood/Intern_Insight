"""
Reviews API endpoints
Handles company and internship reviews
"""

from flask import Blueprint, request, jsonify
from app.core.database import DatabaseManager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.error_handler import handle_errors
from app.utils.jwt_auth import token_required, get_current_user
from bson import ObjectId
from datetime import datetime

reviews_bp = Blueprint('reviews', __name__)
db = DatabaseManager()

@reviews_bp.route('/companies/<company_id>/reviews', methods=['POST'])
@token_required
@handle_errors
def create_company_review(company_id):
    """
    Create a review for a company
    Body: { rating, review_text, title, pros, cons }
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        data = request.get_json()
        
        # Validate required fields
        if 'rating' not in data:
            return error_response("Rating is required", 400)
        
        rating = data.get('rating')
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return error_response("Rating must be between 1 and 5", 400)
        
        database = db.get_db()
        reviews_collection = database['company_reviews']
        
        # Check if user already reviewed this company
        existing = reviews_collection.find_one({
            'candidate_id': candidate_id,
            'company_id': company_id
        })
        
        review_data = {
            'candidate_id': candidate_id,
            'company_id': company_id,
            'rating': float(rating),
            'review_text': data.get('review_text', ''),
            'title': data.get('title', ''),
            'pros': data.get('pros', []),
            'cons': data.get('cons', []),
            'helpful_count': 0,
            'verified_intern': data.get('verified_intern', False),
            'timestamp': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        if existing:
            # Update existing review
            reviews_collection.update_one(
                {'_id': existing['_id']},
                {'$set': review_data}
            )
            message = "Review updated successfully"
            review_id = str(existing['_id'])
        else:
            # Create new review
            result = reviews_collection.insert_one(review_data)
            message = "Review created successfully"
            review_id = str(result.inserted_id)
        
        # Update company average rating
        _update_company_rating(company_id)
        
        app_logger.info(f"User {candidate_id} reviewed company {company_id}")
        return success_response(
            data={'review_id': review_id, 'rating': rating},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error creating company review: {e}")
        return error_response(f"Failed to create review: {str(e)}", 500)


@reviews_bp.route('/internships/<internship_id>/reviews', methods=['POST'])
@token_required
@handle_errors
def create_internship_review(internship_id):
    """
    Create a review for an internship
    Body: { rating, review_text, would_recommend, tags, experience_type }
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        data = request.get_json()
        
        # Validate required fields
        if 'rating' not in data:
            return error_response("Rating is required", 400)
        
        rating = data.get('rating')
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return error_response("Rating must be between 1 and 5", 400)
        
        database = db.get_db()
        reviews_collection = database['internship_reviews']
        
        # Check if user already reviewed this internship
        existing = reviews_collection.find_one({
            'candidate_id': candidate_id,
            'internship_id': internship_id
        })
        
        review_data = {
            'candidate_id': candidate_id,
            'internship_id': internship_id,
            'rating': float(rating),
            'review_text': data.get('review_text', ''),
            'would_recommend': data.get('would_recommend', True),
            'tags': data.get('tags', []),
            'experience_type': data.get('experience_type', 'applied'),  # current, past, applied
            'helpful_votes': 0,
            'verified': data.get('verified', False),
            'timestamp': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        if existing:
            # Update existing review
            reviews_collection.update_one(
                {'_id': existing['_id']},
                {'$set': review_data}
            )
            message = "Review updated successfully"
            review_id = str(existing['_id'])
        else:
            # Create new review
            result = reviews_collection.insert_one(review_data)
            message = "Review created successfully"
            review_id = str(result.inserted_id)
        
        app_logger.info(f"User {candidate_id} reviewed internship {internship_id}")
        return success_response(
            data={'review_id': review_id, 'rating': rating},
            message=message
        )
        
    except Exception as e:
        app_logger.error(f"Error creating internship review: {e}")
        return error_response(f"Failed to create review: {str(e)}", 500)


@reviews_bp.route('/companies/<company_id>/reviews', methods=['GET'])
@handle_errors
def get_company_reviews(company_id):
    """
    Get all reviews for a company
    Query params: limit, offset, sort_by (rating, helpful, recent)
    """
    try:
        limit = request.args.get('limit', type=int, default=20)
        offset = request.args.get('offset', type=int, default=0)
        sort_by = request.args.get('sort_by', 'recent')
        
        database = db.get_db()
        reviews_collection = database['company_reviews']
        
        # Determine sort order
        if sort_by == 'helpful':
            sort_field = [('helpful_count', -1), ('timestamp', -1)]
        elif sort_by == 'rating':
            sort_field = [('rating', -1), ('timestamp', -1)]
        else:  # recent
            sort_field = [('timestamp', -1)]
        
        # Get reviews
        reviews_cursor = reviews_collection.find({
            'company_id': company_id
        }).sort(sort_field).skip(offset).limit(limit)
        
        reviews = []
        for review in reviews_cursor:
            review['_id'] = str(review['_id'])
            review['timestamp'] = review['timestamp'].isoformat()
            review['updated_at'] = review.get('updated_at', review['timestamp'])
            if isinstance(review['updated_at'], datetime):
                review['updated_at'] = review['updated_at'].isoformat()
            reviews.append(review)
        
        # Get total count
        total = reviews_collection.count_documents({'company_id': company_id})
        
        # Calculate average rating
        avg_rating = _calculate_average_rating(company_id, 'company')
        
        return success_response(data={
            'reviews': reviews,
            'total': total,
            'average_rating': avg_rating,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        app_logger.error(f"Error getting company reviews: {e}")
        return error_response(f"Failed to get reviews: {str(e)}", 500)


@reviews_bp.route('/internships/<internship_id>/reviews', methods=['GET'])
@handle_errors
def get_internship_reviews(internship_id):
    """
    Get all reviews for an internship
    Query params: limit, offset, sort_by (rating, helpful, recent)
    """
    try:
        limit = request.args.get('limit', type=int, default=20)
        offset = request.args.get('offset', type=int, default=0)
        sort_by = request.args.get('sort_by', 'recent')
        
        database = db.get_db()
        reviews_collection = database['internship_reviews']
        
        # Determine sort order
        if sort_by == 'helpful':
            sort_field = [('helpful_votes', -1), ('timestamp', -1)]
        elif sort_by == 'rating':
            sort_field = [('rating', -1), ('timestamp', -1)]
        else:  # recent
            sort_field = [('timestamp', -1)]
        
        # Get reviews
        reviews_cursor = reviews_collection.find({
            'internship_id': internship_id
        }).sort(sort_field).skip(offset).limit(limit)
        
        reviews = []
        for review in reviews_cursor:
            review['_id'] = str(review['_id'])
            review['timestamp'] = review['timestamp'].isoformat()
            review['updated_at'] = review.get('updated_at', review['timestamp'])
            if isinstance(review['updated_at'], datetime):
                review['updated_at'] = review['updated_at'].isoformat()
            reviews.append(review)
        
        # Get total count
        total = reviews_collection.count_documents({'internship_id': internship_id})
        
        # Calculate average rating
        avg_rating = _calculate_average_rating(internship_id, 'internship')
        
        return success_response(data={
            'reviews': reviews,
            'total': total,
            'average_rating': avg_rating,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        app_logger.error(f"Error getting internship reviews: {e}")
        return error_response(f"Failed to get reviews: {str(e)}", 500)


@reviews_bp.route('/reviews/<review_id>/helpful', methods=['POST'])
@token_required
@handle_errors
def mark_review_helpful(review_id):
    """
    Mark a review as helpful
    """
    try:
        database = db.get_db()
        
        # Try company reviews first
        companies_collection = database['company_reviews']
        result = companies_collection.update_one(
            {'_id': ObjectId(review_id)},
            {'$inc': {'helpful_count': 1}}
        )
        
        if result.modified_count == 0:
            # Try internship reviews
            internships_collection = database['internship_reviews']
            result = internships_collection.update_one(
                {'_id': ObjectId(review_id)},
                {'$inc': {'helpful_votes': 1}}
            )
        
        if result.modified_count > 0:
            return success_response(message="Review marked as helpful")
        else:
            return error_response("Review not found", 404)
        
    except Exception as e:
        app_logger.error(f"Error marking review helpful: {e}")
        return error_response(f"Failed to mark review as helpful: {str(e)}", 500)


@reviews_bp.route('/reviews/<review_id>', methods=['DELETE'])
@token_required
@handle_errors
def delete_review(review_id):
    """
    Delete a review (only by the author)
    """
    try:
        current_user = get_current_user()
        candidate_id = current_user.get('candidate_id')
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)
        
        database = db.get_db()
        
        # Try company reviews first
        companies_collection = database['company_reviews']
        review = companies_collection.find_one({'_id': ObjectId(review_id)})
        
        if review:
            if review['candidate_id'] != candidate_id:
                return error_response("You can only delete your own reviews", 403)
            companies_collection.delete_one({'_id': ObjectId(review_id)})
            # Update company rating
            _update_company_rating(review['company_id'])
            return success_response(message="Review deleted successfully")
        
        # Try internship reviews
        internships_collection = database['internship_reviews']
        review = internships_collection.find_one({'_id': ObjectId(review_id)})
        
        if review:
            if review['candidate_id'] != candidate_id:
                return error_response("You can only delete your own reviews", 403)
            internships_collection.delete_one({'_id': ObjectId(review_id)})
            return success_response(message="Review deleted successfully")
        
        return error_response("Review not found", 404)
        
    except Exception as e:
        app_logger.error(f"Error deleting review: {e}")
        return error_response(f"Failed to delete review: {str(e)}", 500)


# Helper functions

def _calculate_average_rating(entity_id, entity_type='company'):
    """Calculate average rating for a company or internship"""
    try:
        database = db.get_db()
        collection_name = f'{entity_type}_reviews'
        reviews_collection = database[collection_name]
        
        field_name = f'{entity_type}_id'
        reviews = list(reviews_collection.find({field_name: entity_id}))
        
        if not reviews:
            return 0.0
        
        total_rating = sum(r['rating'] for r in reviews)
        avg_rating = total_rating / len(reviews)
        return round(avg_rating, 2)
        
    except Exception as e:
        app_logger.error(f"Error calculating average rating: {e}")
        return 0.0


def _update_company_rating(company_id):
    """Update average rating in companies collection"""
    try:
        database = db.get_db()
        companies_collection = database['companies']
        
        avg_rating = _calculate_average_rating(company_id, 'company')
        
        companies_collection.update_one(
            {'_id': company_id} if isinstance(company_id, ObjectId) else {'company_id': company_id},
            {'$set': {'average_rating': avg_rating}}
        )
        
    except Exception as e:
        app_logger.error(f"Error updating company rating: {e}")
