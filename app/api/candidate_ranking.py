"""
Candidate Ranking API
Calculates and returns a user's rank among all applicants for an internship
"""

from flask import jsonify, request
from app.core.database import get_database
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)


def calculate_candidate_score(profile, internship):
    """
    Calculate a comprehensive score for a candidate based on their profile and the internship requirements.
    Higher score = better match.
    
    Scoring factors:
    - Skills match (0-40 points)
    - Education level (0-20 points)
    - Past experience relevance (0-20 points)
    - Location match (0-10 points)
    - Profile completeness (0-10 points)
    """
    score = 0
    
    # 1. Skills Match (0-40 points)
    required_skills = [s.lower() for s in (internship.get('skills_required') or [])]
    possessed_skills = [s.lower() for s in (profile.get('skills_possessed') or profile.get('skills') or [])]
    
    if required_skills and possessed_skills:
        matched_skills = set(required_skills) & set(possessed_skills)
        skills_match_percentage = len(matched_skills) / len(required_skills)
        score += skills_match_percentage * 40
    
    # 2. Education Level (0-20 points)
    education = (profile.get('education') or '').lower()
    eligibility = (internship.get('eligibility_criteria') or '').lower()
    
    education_score_map = {
        'phd': 20,
        'doctorate': 20,
        'masters': 18,
        'master': 18,
        'mba': 18,
        'bachelor': 15,
        'undergraduate': 15,
        'diploma': 10,
        'high school': 5
    }
    
    for edu_level, points in education_score_map.items():
        if edu_level in education:
            score += points
            break
    
    # 3. Past Experience (0-20 points)
    past_experience = profile.get('past_experience', '')
    
    # Check if past experience mentions relevant keywords
    experience_keywords = required_skills + [
        internship.get('sector', '').lower(),
        (internship.get('title') or '').lower().split()[0]  # First word of title
    ]
    
    if past_experience:
        experience_lower = past_experience.lower()
        relevant_mentions = sum(1 for keyword in experience_keywords if keyword and keyword in experience_lower)
        
        # Base points for having experience
        score += 10
        
        # Additional points for relevant experience
        if relevant_mentions > 0:
            score += min(relevant_mentions * 2, 10)  # Cap at 10 additional points
    
    # 4. Location Match (0-10 points)
    profile_location = (profile.get('location') or '').lower()
    internship_location = (internship.get('location') or '').lower()
    
    if profile_location and internship_location:
        # Exact match
        if profile_location == internship_location:
            score += 10
        # City match (if location contains comma, compare cities)
        elif ',' in profile_location and ',' in internship_location:
            profile_city = profile_location.split(',')[0].strip()
            internship_city = internship_location.split(',')[0].strip()
            if profile_city == internship_city:
                score += 8
        # Partial match
        elif profile_location in internship_location or internship_location in profile_location:
            score += 5
    
    # 5. Profile Completeness (0-10 points)
    completeness_fields = [
        profile.get('skills_possessed') or profile.get('skills'),
        profile.get('education'),
        profile.get('past_experience'),
        profile.get('location'),
        profile.get('certifications')
    ]
    
    filled_fields = sum(1 for field in completeness_fields if field)
    score += (filled_fields / len(completeness_fields)) * 10
    
    return round(score, 2)


def get_candidate_ranking(internship_id):
    """
    Get the current user's ranking among all applicants for a specific internship.
    
    Returns:
    - rank: User's rank (1 = best)
    - total_applicants: Total number of applicants
    - percentile: What percentile the user is in (0-100, higher is better)
    - score: User's calculated score
    """
    try:
        db = get_database()
        username = request.args.get('username')
        
        if not username:
            return jsonify({'error': 'Username required'}), 400
        
        # Get the internship
        internship = db.internships.find_one({'internship_id': internship_id})
        if not internship:
            internship = db.internships.find_one({'_id': ObjectId(internship_id)})
        
        if not internship:
            return jsonify({'error': 'Internship not found'}), 404
        
        # Get the user's profile
        user_profile = db.profiles.find_one({'username': username})
        if not user_profile:
            return jsonify({
                'error': 'Profile not found',
                'message': 'Please complete your profile to see your ranking'
            }), 404
        
        # Get all profiles (potential applicants)
        all_profiles = list(db.profiles.find({}))
        
        if not all_profiles:
            return jsonify({
                'rank': 1,
                'total_applicants': 1,
                'percentile': 100,
                'score': calculate_candidate_score(user_profile, internship),
                'message': 'You are the only applicant with a profile'
            }), 200
        
        # Calculate scores for all candidates
        candidate_scores = []
        for profile in all_profiles:
            score = calculate_candidate_score(profile, internship)
            candidate_scores.append({
                'username': profile.get('username'),
                'score': score
            })
        
        # Sort by score (descending - highest score first)
        candidate_scores.sort(key=lambda x: x['score'], reverse=True)
        
        # Find user's rank
        user_rank = None
        user_score = None
        
        for idx, candidate in enumerate(candidate_scores, start=1):
            if candidate['username'] == username:
                user_rank = idx
                user_score = candidate['score']
                break
        
        if user_rank is None:
            return jsonify({'error': 'User not found in rankings'}), 404
        
        total_applicants = len(candidate_scores)
        
        # Calculate percentile (what % of candidates you're better than)
        # Higher percentile = better ranking
        percentile = ((total_applicants - user_rank) / total_applicants) * 100
        
        # Determine rank category
        if user_rank == 1:
            rank_category = 'Top Candidate'
        elif percentile >= 90:
            rank_category = 'Excellent'
        elif percentile >= 75:
            rank_category = 'Strong'
        elif percentile >= 50:
            rank_category = 'Good'
        elif percentile >= 25:
            rank_category = 'Average'
        else:
            rank_category = 'Below Average'
        
        # Generate improvement suggestions based on profile gaps
        improvement_suggestions = []
        
        # Check skills match
        required_skills = [s.lower() for s in (internship.get('skills_required') or [])]
        possessed_skills = [s.lower() for s in (user_profile.get('skills_possessed') or user_profile.get('skills') or [])]
        missing_skills = [s for s in required_skills if s not in possessed_skills]
        
        if missing_skills and len(missing_skills) > 0:
            improvement_suggestions.append({
                'type': 'skills',
                'priority': 'high',
                'message': f'Add these required skills: {", ".join(missing_skills[:3])}',
                'impact': 'Can improve ranking by up to 40%'
            })
        
        # Check experience
        if not user_profile.get('past_experience') or len(user_profile.get('past_experience', '')) < 50:
            improvement_suggestions.append({
                'type': 'experience',
                'priority': 'medium',
                'message': f'Add relevant experience in {internship.get("sector", "this field")}',
                'impact': 'Can improve ranking by up to 20%'
            })
        
        # Check profile completeness
        completeness_fields = [
            user_profile.get('skills_possessed') or user_profile.get('skills'),
            user_profile.get('education'),
            user_profile.get('past_experience'),
            user_profile.get('location'),
            user_profile.get('certifications')
        ]
        filled_fields = sum(1 for field in completeness_fields if field)
        
        if filled_fields < len(completeness_fields):
            improvement_suggestions.append({
                'type': 'completeness',
                'priority': 'medium',
                'message': 'Complete missing profile sections (certifications, education details)',
                'impact': 'Can improve ranking by up to 10%'
            })
        
        # Check location match
        profile_location = (user_profile.get('location') or '').lower()
        internship_location = (internship.get('location') or '').lower()
        
        if profile_location != internship_location and internship_location:
            improvement_suggestions.append({
                'type': 'location',
                'priority': 'low',
                'message': f'Update location preference to {internship.get("location")}',
                'impact': 'Can improve ranking by up to 10%'
            })
        
        return jsonify({
            'success': True,
            'rank': user_rank,
            'total_applicants': total_applicants,
            'percentile': round(percentile, 1),
            'score': user_score,
            'rank_category': rank_category,
            'message': f'You rank #{user_rank} out of {total_applicants} candidates',
            'improvement_suggestions': improvement_suggestions
        }), 200
        
    except Exception as e:
        logger.error(f'Error calculating candidate ranking: {str(e)}', exc_info=True)
        return jsonify({'error': 'Failed to calculate ranking', 'details': str(e)}), 500
