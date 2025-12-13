# app/api/recommendations.py
"""
Recommendations API endpoints
Direct implementation to replace legacy imports
"""

from flask import jsonify, request
from app.core.database import db_manager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
try:
    from bson import ObjectId
except Exception:  # pragma: no cover
    ObjectId = None
try:
    # Prefer the improved ML logic
    from app.core.ml_model import get_recommendations as ml_get_recommendations
except Exception as _e:
    ml_get_recommendations = None
    app_logger.error(f"Failed to import ML recommender: {__name__}: {_e}")

def get_candidate_recommendations(candidate_id):
    """Get recommendations for a specific candidate"""
    try:
        # Query params
        limit = request.args.get('limit', default=10, type=int)
        # min_score is in percentage units (0..100)
        min_score = request.args.get('min_score', default=0.0, type=float)
        dedupe_org = request.args.get('dedupe_org', default='1')
        dedupe_org = str(dedupe_org).lower() not in ('0', 'false', 'no')

        # limit<=0 means "no cap" (return all)
        top_n = None if (limit is None or int(limit) <= 0) else int(limit)

        # Load candidate profile
        candidate = load_candidate_by_id(candidate_id)
        if not candidate:
            return error_response("Candidate not found", 404)
        
        # Load internships
        internships = load_all_internships()
        if not internships:
            return error_response("No internships available", 404)
        
        # Load company interactions for this candidate + global stats
        company_interactions = {}
        company_ratings = {}
        internship_interactions = {}
        company_interaction_stats = {}
        try:
            db = db_manager.get_db()
            
            # Get user's company interactions (like/dislike)
            interactions_collection = db['company_interactions']
            user_interactions = list(interactions_collection.find({'candidate_id': candidate_id}))
            for interaction in user_interactions:
                company_id = interaction.get('company_id')
                interaction_type = interaction.get('interaction_type')
                reason_tags = interaction.get('reason_tags', [])
                if company_id and interaction_type:
                    company_interactions[company_id] = {
                        'type': interaction_type,
                        'reason_tags': reason_tags
                    }
            
            # Get user's internship interactions (like/dislike) - personal preferences
            internship_interactions_collection = db['internship_interactions']
            user_internship_interactions = list(internship_interactions_collection.find({'candidate_id': candidate_id}))
            for interaction in user_internship_interactions:
                internship_id = interaction.get('internship_id')
                interaction_type = interaction.get('interaction_type')
                reason_tags = interaction.get('reason_tags', [])
                if internship_id and interaction_type:
                    internship_interactions[internship_id] = {
                        'type': interaction_type,
                        'reason_tags': reason_tags
                    }
            
            # Get company average ratings
            reviews_collection = db['company_reviews']
            pipeline = [
                {'$group': {
                    '_id': '$company_id',
                    'average_rating': {'$avg': '$rating'}
                }}
            ]
            rating_results = list(reviews_collection.aggregate(pipeline))
            for result in rating_results:
                company_id = result.get('_id')
                avg_rating = result.get('average_rating')
                if company_id and avg_rating:
                    company_ratings[company_id] = round(avg_rating, 2)

            # Global company like/dislike stats (affects all users)
            try:
                stats = list(db['company_interactions'].aggregate([
                    {'$group': {
                        '_id': {
                            'company_id': '$company_id',
                            'interaction_type': '$interaction_type'
                        },
                        'count': {'$sum': 1}
                    }}
                ]))
                tmp = {}
                for row in stats:
                    key = row.get('_id') or {}
                    cid = key.get('company_id')
                    it = key.get('interaction_type')
                    if not cid or not it:
                        continue
                    tmp.setdefault(cid, {'like': 0, 'dislike': 0})
                    if it == 'like':
                        tmp[cid]['like'] += int(row.get('count') or 0)
                    elif it == 'dislike':
                        tmp[cid]['dislike'] += int(row.get('count') or 0)

                # Also expose stats by company name (normalized) to support internships that
                # only have organization/company strings.
                company_interaction_stats = dict(tmp)
                try:
                    companies = list(db['companies'].find({}, {'company_id': 1, 'name': 1}))
                    for c in companies:
                        cid = c.get('company_id')
                        name = (c.get('name') or '').strip().lower()
                        if cid in tmp and name:
                            company_interaction_stats[name] = tmp[cid]
                except Exception:
                    pass
            except Exception as e:
                app_logger.warning(f"Could not compute global company interaction stats: {e}")
                    
        except Exception as e:
            app_logger.warning(f"Could not load company/internship interactions/ratings: {e}")
        
        # Generate recommendations using improved ML logic
        recommendations = []
        if ml_get_recommendations is not None:
            ml_recs = ml_get_recommendations(
                candidate, 
                internships, 
                top_n=top_n,
                company_interactions=company_interactions,
                company_ratings=company_ratings,
                internship_interactions=internship_interactions,
                company_interaction_stats=company_interaction_stats,
                dedupe_org=dedupe_org,
                # min_score is percent; ML expects percent threshold too.
                min_score=min_score,
            )
            # Enrich with skills/description for UI compatibility
            by_id = {i.get("internship_id"): i for i in internships}
            for r in ml_recs:
                base = by_id.get(r.get("internship_id"), {})
                enriched = {
                    **r,
                    "skills_required": base.get("skills_required", r.get("skills_required", [])),
                    "description": base.get("description", r.get("description", "")),
                }
                recommendations.append(enriched)
        else:
            # Fallback to simple overlap if ML import failed
            recommendations = generate_recommendations(candidate, internships)
        
        return success_response({
            "candidate": candidate.get("name"),
            "candidate_id": candidate.get("candidate_id"),
            "recommendations": recommendations
        })
        
    except Exception as e:
        app_logger.error(f"Error generating recommendations for {candidate_id}: {e}")
        return error_response("Failed to generate recommendations", 500)


def get_candidate_internship_match(candidate_id, internship_id):
    """Get match score for a specific internship for a candidate (not top-N limited)."""
    try:
        candidate = load_candidate_by_id(candidate_id)
        if not candidate:
            return error_response("Candidate not found", 404)

        internship = load_internship_by_any_id(internship_id)
        if not internship:
            return error_response("Internship not found", 404)

        company_interactions, company_ratings, internship_interactions = load_candidate_context(candidate_id)

        # Global company stats to keep scores consistent with list endpoint
        company_interaction_stats = {}
        try:
            db = db_manager.get_db()
            if db is not None:
                stats = list(db['company_interactions'].aggregate([
                    {'$group': {
                        '_id': {
                            'company_id': '$company_id',
                            'interaction_type': '$interaction_type'
                        },
                        'count': {'$sum': 1}
                    }}
                ]))
                tmp = {}
                for row in stats:
                    key = row.get('_id') or {}
                    cid = key.get('company_id')
                    it = key.get('interaction_type')
                    if not cid or not it:
                        continue
                    tmp.setdefault(cid, {'like': 0, 'dislike': 0})
                    if it == 'like':
                        tmp[cid]['like'] += int(row.get('count') or 0)
                    elif it == 'dislike':
                        tmp[cid]['dislike'] += int(row.get('count') or 0)
                company_interaction_stats = dict(tmp)
                try:
                    companies = list(db['companies'].find({}, {'company_id': 1, 'name': 1}))
                    for c in companies:
                        cid = c.get('company_id')
                        name = (c.get('name') or '').strip().lower()
                        if cid in tmp and name:
                            company_interaction_stats[name] = tmp[cid]
                except Exception:
                    pass
        except Exception:
            pass

        match_score = 0
        recommendation = None

        if ml_get_recommendations is not None:
            ml_recs = ml_get_recommendations(
                candidate,
                [internship],
                top_n=1,
                company_interactions=company_interactions,
                company_ratings=company_ratings,
                internship_interactions=internship_interactions,
                company_interaction_stats=company_interaction_stats,
                dedupe_org=False,
                min_score=0.0,
            )
            if ml_recs:
                r = ml_recs[0]
                match_score = r.get("match_score", r.get("matchScore", 0)) or 0
                recommendation = {
                    **r,
                    "skills_required": internship.get("skills_required", r.get("skills_required", [])),
                    "description": internship.get("description", r.get("description", "")),
                }
        else:
            # Fallback: simple overlap
            candidate_skills = set([s.strip().lower() for s in candidate.get("skills_possessed", []) if isinstance(s, str)])
            internship_skills = set([s.strip().lower() for s in internship.get("skills_required", []) if isinstance(s, str)])
            if internship_skills:
                match_score = (len(candidate_skills & internship_skills) / len(internship_skills)) * 100

        return success_response({
            "candidate_id": candidate_id,
            "internship_id": internship.get("internship_id") or str(internship.get("_id")),
            "match_score": round(float(match_score), 2) if match_score is not None else 0,
            "recommendation": recommendation,
        })
    except Exception as e:
        app_logger.error(f"Error generating internship match for {candidate_id}/{internship_id}: {e}")
        return error_response("Failed to generate match score", 500)


def get_internship_recommendations(internship_id):
    """Get similar internships for a given internship"""
    try:
        # Load all internships
        internships = load_all_internships()
        if not internships:
            return error_response("No internships available", 404)
        
        # Find the base internship
        base_internship = next((i for i in internships if i.get("internship_id") == internship_id), None)
        if not base_internship:
            return error_response("Internship not found", 404)
        
        # Generate similar internship recommendations using ML by creating a pseudo-candidate
        recommendations = []
        if ml_get_recommendations is not None:
            pseudo_candidate = {
                "skills_possessed": base_internship.get("skills_required", []),
                "sector_interests": [str(base_internship.get("sector", "")).lower()] if base_internship.get("sector") else [],
                "location_preference": base_internship.get("location", ""),
                # keep other fields empty; ML handles missing gracefully
            }
            pool = [i for i in internships if i.get("internship_id") != internship_id]
            # Slightly tilt weights towards skill/sector for "similarity" use-case
            ml_recs = ml_get_recommendations(
                pseudo_candidate,
                pool,
                top_n=10,
                skill_weight=0.6,
                loc_weight=0.15,
                sector_weight=0.2,
                misc_weight=0.05,
            )
            # Enrich with skills/description for UI compatibility
            by_id = {i.get("internship_id"): i for i in pool}
            for r in ml_recs:
                base = by_id.get(r.get("internship_id"), {})
                recommendations.append({
                    **r,
                    "skills_required": base.get("skills_required", r.get("skills_required", [])),
                    "description": base.get("description", r.get("description", "")),
                })
        else:
            recommendations = generate_similar_internships(base_internship, internships)
        
        return success_response({
            "base_internship": base_internship.get("title"),
            "recommendations": recommendations
        })
        
    except Exception as e:
        app_logger.error(f"Error generating internship recommendations for {internship_id}: {e}")
        return error_response("Failed to generate recommendations", 500)


def load_candidate_by_id(candidate_id):
    """Load candidate profile by ID"""
    try:
        # Try MongoDB first
        db = db_manager.get_db()
        if db is not None:
            try:
                candidate = db.profiles.find_one({"candidate_id": candidate_id})
                if candidate:
                    if '_id' in candidate:
                        candidate['_id'] = str(candidate['_id'])
                    return candidate
            except Exception as e:
                app_logger.warning(f"MongoDB query failed: {e}")
        
        # Strict Atlas mode: do not read JSON files
        return None
    except Exception as e:
        app_logger.error(f"Error loading candidate {candidate_id}: {e}")
        return None


def load_all_internships():
    """Load all internships"""
    try:
        # Try MongoDB first
        db = db_manager.get_db()
        if db is not None:
            try:
                internships = list(db.internships.find({}))
                # Convert ObjectId to string for JSON serialization
                for internship in internships:
                    if '_id' in internship:
                        internship['_id'] = str(internship['_id'])
                return internships
            except Exception as e:
                app_logger.warning(f"MongoDB query failed: {e}")
        
        # Strict Atlas mode: do not read JSON files
        return []
    except Exception as e:
        app_logger.error(f"Error loading internships: {e}")
        return []


def load_internship_by_any_id(internship_id):
    """Load an internship by either internship_id or Mongo _id string."""
    try:
        db = db_manager.get_db()
        if db is None:
            return None

        query = {"$or": [{"internship_id": internship_id}]}
        if ObjectId is not None:
            try:
                if ObjectId.is_valid(internship_id):
                    query["$or"].append({"_id": ObjectId(internship_id)})
            except Exception:
                pass

        internship = db.internships.find_one(query)
        if internship and '_id' in internship:
            internship['_id'] = str(internship['_id'])
        return internship
    except Exception as e:
        app_logger.error(f"Error loading internship {internship_id}: {e}")
        return None


def load_candidate_context(candidate_id):
    """Load interaction/rating context used by the ML model."""
    company_interactions = {}
    company_ratings = {}
    internship_interactions = {}
    try:
        db = db_manager.get_db()
        if db is None:
            return company_interactions, company_ratings, internship_interactions

        interactions_collection = db['company_interactions']
        user_interactions = list(interactions_collection.find({'candidate_id': candidate_id}))
        for interaction in user_interactions:
            company_id = interaction.get('company_id')
            interaction_type = interaction.get('interaction_type')
            reason_tags = interaction.get('reason_tags', [])
            if company_id and interaction_type:
                company_interactions[company_id] = {'type': interaction_type, 'reason_tags': reason_tags}

        internship_interactions_collection = db['internship_interactions']
        user_internship_interactions = list(internship_interactions_collection.find({'candidate_id': candidate_id}))
        for interaction in user_internship_interactions:
            iid = interaction.get('internship_id')
            interaction_type = interaction.get('interaction_type')
            reason_tags = interaction.get('reason_tags', [])
            if iid and interaction_type:
                internship_interactions[iid] = {'type': interaction_type, 'reason_tags': reason_tags}

        reviews_collection = db['company_reviews']
        pipeline = [{'$group': {'_id': '$company_id', 'average_rating': {'$avg': '$rating'}}}]
        for result in list(reviews_collection.aggregate(pipeline)):
            cid = result.get('_id')
            avg_rating = result.get('average_rating')
            if cid and avg_rating:
                company_ratings[cid] = round(avg_rating, 2)
    except Exception as e:
        app_logger.warning(f"Could not load candidate context: {e}")

    return company_interactions, company_ratings, internship_interactions


def generate_recommendations(candidate, internships):
    """Generate recommendations for a candidate"""
    try:
        recommendations = []
        candidate_skills = set([s.strip().lower() for s in candidate.get("skills_possessed", []) if isinstance(s, str)])
        
        for internship in internships:
            internship_skills = set([s.strip().lower() for s in internship.get("skills_required", []) if isinstance(s, str)])
            common_skills = candidate_skills & internship_skills
            
            # Calculate match score as percentage (0-100)
            if len(internship_skills) > 0:
                match_score = (len(common_skills) / len(internship_skills)) * 100
            else:
                match_score = 0
            
            # Only include internships with some match
            if match_score > 0:
                recommendations.append({
                    "internship_id": internship.get("internship_id"),
                    "title": internship.get("title"),
                    "organization": internship.get("organization"),
                    "location": internship.get("location"),
                    "sector": internship.get("sector"),
                    "skills_required": internship.get("skills_required", []),
                    "description": internship.get("description", ""),
                    "match_score": round(match_score, 2)
                })
        
        # Sort by match score in descending order
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations[:10]  # Top 10 matches
        
    except Exception as e:
        app_logger.error(f"Error generating recommendations: {e}")
        return []


def generate_similar_internships(base_internship, internships):
    """Generate similar internship recommendations"""
    try:
        base_skills = set([s.strip().lower() for s in base_internship.get("skills_required", []) if isinstance(s, str)])
        recommendations = []
        
        for internship in internships:
            if internship.get("internship_id") == base_internship.get("internship_id"):
                continue
                
            intern_skills = set([s.strip().lower() for s in internship.get("skills_required", []) if isinstance(s, str)])
            common_skills = base_skills & intern_skills
            
            # Calculate match score as percentage of base internship skills (0-100)
            match_score = (len(common_skills) / len(base_skills) * 100) if base_skills else 0
            
            if match_score > 0:
                recommendations.append({
                    "internship_id": internship.get("internship_id"),
                    "title": internship.get("title"),
                    "organization": internship.get("organization"),
                    "location": internship.get("location"),
                    "sector": internship.get("sector"),
                    "skills_required": internship.get("skills_required", []),
                    "description": internship.get("description", "")[:200] + "..." if len(internship.get("description", "")) > 200 else internship.get("description", ""),
                    "match_score": round(match_score, 2)
                })
        
        # Sort by match score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations[:10]  # Top 10 matches
        
    except Exception as e:
        app_logger.error(f"Error generating similar internships: {e}")
        return []