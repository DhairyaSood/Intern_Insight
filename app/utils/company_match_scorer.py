"""
Company Match Score Calculator
Calculates personalized match scores for companies based on user interactions.
"""
from datetime import datetime
from app.core.database import DatabaseManager
from bson import ObjectId
import re

# ----------------- distance imports (robust) -----------------
try:
    from app.core.distance_matrix import get_distance, normalize_city_name
except Exception:  # pragma: no cover
    try:
        from .distance_matrix import get_distance, normalize_city_name
    except Exception:  # pragma: no cover
        def normalize_city_name(x):
            return (x or '').strip().lower()

        def get_distance(a, b):
            return float('inf')


class CompanyMatchScorer:
    """
    Calculates company match scores for users based on multiple factors:
    1. Average internship match scores from company's internships (40% weight)
    2. Direct company interactions - likes/dislikes (30% weight)
    3. User's company reviews (20% weight)
    4. Indirect internship feedback - interactions/reviews (10% weight)
    """
    
    # Scoring weights
    WEIGHTS = {
        'internship_scores': 0.40,
        'company_interactions': 0.30,
        'company_reviews': 0.20,
        'internship_feedback': 0.10
    }
    
    # Base score adjustments
    INTERACTION_SCORES = {
        'like': 15,  # Boost for liking company
        'dislike': -15  # Penalty for disliking company
    }
    
    @staticmethod
    def calculate_user_company_score(candidate_id, company_id):
        """
        Calculate match score for a specific user-company pair.
        Returns score between 0-100.
        """
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        # Initialize components
        scores = {
            'internship_scores': 0,
            'company_interactions': 0,
            'company_reviews': 0,
            'internship_feedback': 0
        }
        
        # 1. Get average internship match scores for company's internships
        internship_avg = CompanyMatchScorer._get_avg_internship_scores(
            db, candidate_id, company_id
        )
        scores['internship_scores'] = internship_avg
        
        # 2. Get direct company interaction score
        company_interaction_score = CompanyMatchScorer._get_company_interaction_score(
            db, candidate_id, company_id
        )
        scores['company_interactions'] = company_interaction_score
        
        # 3. Get user's company review score
        company_review_score = CompanyMatchScorer._get_company_review_score(
            db, candidate_id, company_id
        )
        scores['company_reviews'] = company_review_score
        
        # 4. Get indirect internship feedback score
        internship_feedback_score = CompanyMatchScorer._get_internship_feedback_score(
            db, candidate_id, company_id
        )
        scores['internship_feedback'] = internship_feedback_score
        
        # Calculate weighted average
        final_score = (
            scores['internship_scores'] * CompanyMatchScorer.WEIGHTS['internship_scores'] +
            scores['company_interactions'] * CompanyMatchScorer.WEIGHTS['company_interactions'] +
            scores['company_reviews'] * CompanyMatchScorer.WEIGHTS['company_reviews'] +
            scores['internship_feedback'] * CompanyMatchScorer.WEIGHTS['internship_feedback']
        )

        # Personal location preference bonus/penalty (only for this user)
        try:
            loc_adjust = CompanyMatchScorer._get_company_location_preference_adjustment(db, candidate_id, company_id)
            final_score += loc_adjust
        except Exception:
            pass
        
        # Ensure score is between 0-100
        final_score = max(0, min(100, final_score))
        
        return {
            'match_score': round(final_score, 2),
            'contributing_factors': scores,
            'last_updated': datetime.utcnow()
        }

    @staticmethod
    def _normalize_city_value(value: str) -> str:
        s = (value or '').strip().lower()
        # take "City" from common compound formats
        if ' - ' in s:
            s = s.split(' - ', 1)[0].strip()
        s = re.split(r'[\,\(\|/;]', s)[0].strip()
        return s

    @staticmethod
    def _distance_decay(dist_km: float, half_life_km: float = 150.0) -> float:
        """Return 0..1 decay with 1 at 0km and ~0.5 at half_life_km."""
        try:
            d = float(dist_km)
        except Exception:
            return 0.0
        if d < 0 or d == float('inf'):
            return 0.0
        if half_life_km <= 0:
            return 0.0
        return float(__import__('math').exp(-0.6931471805599453 * d / half_life_km))

    @staticmethod
    def _get_company_location_preference_adjustment(db, candidate_id, company_id):
        """Small +/- adjustment based on internship like/dislike reasons about location.

        If a user likes an internship for "Great location", boost companies headquartered
        in that location for that user. If they dislike for "Poor location", penalize.
        """
        try:
            company = db.companies.find_one({'company_id': company_id})
            if not company:
                return 0.0

            hq = company.get('headquarters') or company.get('location') or ''
            hq_city_raw = CompanyMatchScorer._normalize_city_value(str(hq))
            try:
                hq_city = normalize_city_name(hq_city_raw)
            except Exception:
                hq_city = hq_city_raw
            if not hq_city:
                return 0.0

            # Pull user's internship interactions that carry location reasons
            interactions = list(db.internship_interactions.find(
                {
                    'candidate_id': candidate_id,
                    'reason_tags': {'$in': ['Great location', 'Perfect location', 'Poor location']}
                },
                {'internship_id': 1, 'interaction_type': 1, 'reason_tags': 1}
            ))
            if not interactions:
                return 0.0

            # Map internship_id -> location
            internship_ids = [i.get('internship_id') for i in interactions if i.get('internship_id')]
            internship_ids = list(dict.fromkeys([str(i) for i in internship_ids if i]))
            if not internship_ids:
                return 0.0

            internship_docs = list(db.internships.find({'internship_id': {'$in': internship_ids}}, {'internship_id': 1, 'location': 1}))
            loc_by_id = {}
            for d in internship_docs:
                raw = CompanyMatchScorer._normalize_city_value(str(d.get('location') or ''))
                try:
                    loc_by_id[str(d.get('internship_id'))] = normalize_city_name(raw)
                except Exception:
                    loc_by_id[str(d.get('internship_id'))] = raw

            liked_cities = set()
            disliked_cities = set()
            for inter in interactions:
                iid = str(inter.get('internship_id') or '')
                city = loc_by_id.get(iid, '')
                if not city:
                    continue

                tags = inter.get('reason_tags') or []
                itype = inter.get('interaction_type')
                if itype == 'like' and ('Great location' in tags or 'Perfect location' in tags):
                    liked_cities.add(city)
                if itype == 'dislike' and ('Poor location' in tags):
                    disliked_cities.add(city)

            # Smooth distance-decay around liked/disliked locations (small nudges)
            max_like = 0.0
            max_dislike = 0.0

            for city in liked_cities:
                if not city:
                    continue
                if city == hq_city:
                    max_like = 1.0
                    break
                try:
                    dist = get_distance(hq_city, city)
                    if dist is None:
                        continue
                    max_like = max(max_like, CompanyMatchScorer._distance_decay(dist, half_life_km=150.0))
                except Exception:
                    continue

            for city in disliked_cities:
                if not city:
                    continue
                if city == hq_city:
                    max_dislike = 1.0
                    break
                try:
                    dist = get_distance(hq_city, city)
                    if dist is None:
                        continue
                    max_dislike = max(max_dislike, CompanyMatchScorer._distance_decay(dist, half_life_km=150.0))
                except Exception:
                    continue

            # Keep the magnitude the same as before (max +/- 5), just smoother.
            adj = (5.0 * max_like) - (5.0 * max_dislike)
            if adj > 5.0:
                adj = 5.0
            if adj < -5.0:
                adj = -5.0
            return float(adj)
        except Exception:
            return 0.0
    
    @staticmethod
    def _get_avg_internship_scores(db, candidate_id, company_id):
        """Get average match score from company's internships."""
        try:
            internship_ids = CompanyMatchScorer._get_company_internship_ids(db, company_id)
            
            if not internship_ids:
                return 50  # Neutral score if no internships
            
            # Get user's recommendation scores for these internships
            recommendations = list(db.recommendations.find({
                'candidate_id': candidate_id,
                'internship_id': {'$in': internship_ids}
            }))
            
            if not recommendations:
                return 50  # Neutral if no recommendations
            
            # Calculate average match score
            total_score = sum(rec.get('match_score', 50) for rec in recommendations)
            avg_score = total_score / len(recommendations) if recommendations else 50
            
            return avg_score
            
        except Exception as e:
            print(f"Error calculating internship scores: {e}")
            return 50

    @staticmethod
    def _get_company_internship_ids(db, company_id):
        """Return a stable list of internship ids for a company.

        Prefers companies.internship_ids when available (works even if internships
        don't store company_id). Falls back to internships.company_id lookup.
        Includes both business internship_id and Mongo _id strings when possible.
        """
        internship_ids = []
        try:
            company_doc = None
            try:
                company_doc = db.companies.find_one({'company_id': company_id})
            except Exception:
                company_doc = None

            if company_doc and company_doc.get('internship_ids'):
                internship_ids.extend([str(i) for i in (company_doc.get('internship_ids') or []) if i])

                # Also include Mongo _id strings for these internships when present.
                try:
                    docs = list(db.internships.find({'internship_id': {'$in': internship_ids}}))
                    for d in docs:
                        if d.get('_id') is not None:
                            internship_ids.append(str(d.get('_id')))
                except Exception:
                    pass
            else:
                internships = list(db.internships.find({'company_id': company_id}))
                for internship in internships:
                    if internship.get('internship_id'):
                        internship_ids.append(str(internship.get('internship_id')))
                    if internship.get('_id') is not None:
                        internship_ids.append(str(internship.get('_id')))

            # Dedupe + remove empties
            return list(dict.fromkeys([i for i in internship_ids if i]))
        except Exception:
            return []
    
    @staticmethod
    def _get_company_interaction_score(db, candidate_id, company_id):
        """Get score based on direct company like/dislike."""
        try:
            # Check for company interaction
            interaction = db.company_interactions.find_one({
                'candidate_id': candidate_id,
                'company_id': company_id
            })
            
            if not interaction:
                return 50  # Neutral if no interaction
            
            interaction_type = interaction.get('interaction_type')
            base_score = 50
            
            if interaction_type == 'like':
                return base_score + CompanyMatchScorer.INTERACTION_SCORES['like']
            elif interaction_type == 'dislike':
                return base_score + CompanyMatchScorer.INTERACTION_SCORES['dislike']
            
            return base_score
            
        except Exception as e:
            print(f"Error calculating company interaction score: {e}")
            return 50
    
    @staticmethod
    def _get_company_review_score(db, candidate_id, company_id):
        """Get score based on global company average rating."""
        try:
            pipeline = [
                {'$match': {'company_id': company_id}},
                {'$group': {'_id': '$company_id', 'average_rating': {'$avg': '$rating'}}}
            ]
            rows = list(db.company_reviews.aggregate(pipeline))
            if not rows:
                return 50

            avg_rating = rows[0].get('average_rating')
            if not avg_rating:
                return 50

            # Convert 1-5 to 0-100
            return float(avg_rating) * 20
            
        except Exception as e:
            print(f"Error calculating company review score: {e}")
            return 50
    
    @staticmethod
    def _get_internship_feedback_score(db, candidate_id, company_id):
        """Get score based on interactions/reviews with company's internships."""
        try:
            internship_ids = CompanyMatchScorer._get_company_internship_ids(db, company_id)
            
            if not internship_ids:
                return 50
            
            # Get internship interactions (likes/dislikes)
            interactions = list(db.internship_interactions.find({
                'candidate_id': candidate_id,
                'internship_id': {'$in': internship_ids}
            }))
            
            # Get internship reviews
            reviews = list(db.internship_reviews.find({
                'candidate_id': candidate_id,
                'internship_id': {'$in': internship_ids}
            }))
            
            if not interactions and not reviews:
                return 50
            
            total_score = 0
            count = 0
            
            # Process interactions
            for interaction in interactions:
                if interaction.get('interaction_type') == 'like':
                    total_score += 70
                else:  # dislike
                    total_score += 30
                count += 1
            
            # Process reviews
            for review in reviews:
                rating = review.get('rating', 3)
                total_score += (rating * 20)
                count += 1
            
            avg_score = total_score / count if count > 0 else 50
            return avg_score
            
        except Exception as e:
            print(f"Error calculating internship feedback score: {e}")
            return 50
    
    @staticmethod
    def save_company_match_score(candidate_id, company_id, score_data):
        """Save or update company match score in database."""
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        try:
            db.company_match_scores.update_one(
                {
                    'candidate_id': candidate_id,
                    'company_id': company_id
                },
                {
                    '$set': {
                        'match_score': score_data['match_score'],
                        'contributing_factors': score_data['contributing_factors'],
                        'last_updated': score_data['last_updated']
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error saving company match score: {e}")
            return False
    
    @staticmethod
    def get_company_match_score(candidate_id, company_id):
        """Get stored company match score or calculate if not exists."""
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        try:
            # Try to get existing score
            stored_score = db.company_match_scores.find_one({
                'candidate_id': candidate_id,
                'company_id': company_id
            })
            
            if stored_score:
                return stored_score['match_score']
            
            # Calculate and save if not exists
            score_data = CompanyMatchScorer.calculate_user_company_score(
                candidate_id, company_id
            )
            CompanyMatchScorer.save_company_match_score(
                candidate_id, company_id, score_data
            )
            
            return score_data['match_score']
            
        except Exception as e:
            print(f"Error getting company match score: {e}")
            return 50  # Return neutral score on error
    
    @staticmethod
    def recalculate_all_users_for_company(company_id):
        """
        Recalculate scores for all users who have interacted with the company.
        Used when company receives new reviews/interactions that should affect all users.
        """
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        try:
            # Find all users who have this company in their match scores
            affected_users = db.company_match_scores.find({'company_id': company_id})
            
            updated_count = 0
            for user_score in affected_users:
                candidate_id = user_score['candidate_id']
                
                # Recalculate score
                score_data = CompanyMatchScorer.calculate_user_company_score(
                    candidate_id, company_id
                )
                
                # Save updated score
                if CompanyMatchScorer.save_company_match_score(
                    candidate_id, company_id, score_data
                ):
                    updated_count += 1
            
            return {
                'success': True,
                'updated_count': updated_count
            }
            
        except Exception as e:
            print(f"Error recalculating company scores: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def apply_global_impact(company_id, interaction_type, rating=None):
        """
        Apply global impact when a user interacts with company directly.
        This affects match scores for OTHER users.
        
        interaction_type: 'like', 'dislike', 'review'
        rating: 1-5 for reviews, None for likes/dislikes
        """
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        
        try:
            # Calculate impact amount based on interaction
            if interaction_type == 'like':
                impact = 2  # Small boost
            elif interaction_type == 'dislike':
                impact = -2  # Small penalty
            elif interaction_type == 'review' and rating:
                # Positive reviews boost, negative reviews reduce
                if rating >= 4:
                    impact = 3
                elif rating == 3:
                    impact = 0
                else:
                    impact = -3
            else:
                impact = 0
            
            if impact == 0:
                return {'success': True, 'impact': 0}
            
            # Get total review count to decay impact
            review_count = db.company_reviews.count_documents({'company_id': company_id})
            
            # Decay impact based on review volume (more reviews = less individual impact)
            if review_count > 50:
                impact *= 0.3
            elif review_count > 20:
                impact *= 0.5
            elif review_count > 10:
                impact *= 0.7
            
            # Apply impact to all existing match scores
            result = db.company_match_scores.update_many(
                {'company_id': company_id},
                {'$inc': {'match_score': impact}}
            )
            
            # Ensure scores stay in 0-100 range
            db.company_match_scores.update_many(
                {'company_id': company_id, 'match_score': {'$gt': 100}},
                {'$set': {'match_score': 100}}
            )
            
            db.company_match_scores.update_many(
                {'company_id': company_id, 'match_score': {'$lt': 0}},
                {'$set': {'match_score': 0}}
            )
            
            return {
                'success': True,
                'impact': impact,
                'affected_users': result.modified_count
            }
            
        except Exception as e:
            print(f"Error applying global impact: {e}")
            return {
                'success': False,
                'error': str(e)
            }
