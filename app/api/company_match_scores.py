"""
Company Match Score API Endpoints
Handles company match score calculations and updates
"""
from flask import jsonify, request
from app.utils.jwt_auth import token_required
from app.utils.company_match_scorer import CompanyMatchScorer
from app.core.database import DatabaseManager


@token_required
def get_company_match_score(company_id):
    """
    GET /api/companies/<company_id>/match-score
    Get match score for a specific company for the current user
    """
    try:
        current_user = request.current_user
        candidate_id = current_user.get('candidate_id')
        
        if not candidate_id:
            return jsonify({'error': 'Candidate ID not found'}), 400
        
        # Get or calculate match score
        match_score = CompanyMatchScorer.get_company_match_score(
            candidate_id, company_id
        )
        
        return jsonify({
            'company_id': company_id,
            'match_score': match_score
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_required
def recalculate_company_score(company_id):
    """
    POST /api/companies/<company_id>/recalculate-score
    Recalculate match score for current user and company
    """
    try:
        current_user = request.current_user
        candidate_id = current_user.get('candidate_id')
        
        if not candidate_id:
            return jsonify({'error': 'Candidate ID not found'}), 400
        
        # Recalculate score
        score_data = CompanyMatchScorer.calculate_user_company_score(
            candidate_id, company_id
        )
        
        # Save to database
        CompanyMatchScorer.save_company_match_score(
            candidate_id, company_id, score_data
        )
        
        return jsonify({
            'success': True,
            'company_id': company_id,
            'match_score': score_data['match_score'],
            'contributing_factors': score_data['contributing_factors']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def recalculate_all_users_score(company_id):
    """
    POST /api/companies/<company_id>/recalculate-all
    Recalculate match scores for ALL users who have interacted with this company
    (Internal use - can be called after new reviews/interactions)
    """
    try:
        # Recalculate for all affected users
        result = CompanyMatchScorer.recalculate_all_users_for_company(company_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'company_id': company_id,
                'updated_count': result['updated_count']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_required
def get_company_scores_batch():
    """
    POST /api/companies/match-scores/batch
    Get match scores for multiple companies at once
    Body: { "company_ids": ["id1", "id2", ...] }
    """
    try:
        current_user = request.current_user
        candidate_id = current_user.get('candidate_id')
        
        if not candidate_id:
            return jsonify({'error': 'Candidate ID not found'}), 400
        
        data = request.get_json()
        company_ids = data.get('company_ids', [])
        
        if not company_ids:
            return jsonify({'error': 'No company IDs provided'}), 400
        
        # Get scores for all companies
        scores = {}
        for company_id in company_ids:
            score = CompanyMatchScorer.get_company_match_score(
                candidate_id, company_id
            )
            scores[company_id] = score
        
        return jsonify({
            'success': True,
            'scores': scores
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_required
def get_top_matched_companies():
    """
    GET /api/companies/top-matches
    Get top matched companies for current user based on match scores
    """
    try:
        current_user = request.current_user
        candidate_id = current_user.get('candidate_id')
        
        if not candidate_id:
            return jsonify({'error': 'Candidate ID not found'}), 400
        
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        # Get user's top company match scores
        top_scores = list(db.company_match_scores.find(
            {'candidate_id': candidate_id}
        ).sort('match_score', -1).limit(20))
        
        # Get company details
        results = []
        for score_doc in top_scores:
            company = db.companies.find_one({'company_id': score_doc['company_id']})
            if company:
                # Convert ObjectId to string for JSON serialization
                company['_id'] = str(company['_id'])
                
                results.append({
                    'company': company,
                    'match_score': score_doc['match_score'],
                    'last_updated': score_doc.get('last_updated')
                })
        
        return jsonify({
            'success': True,
            'companies': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
