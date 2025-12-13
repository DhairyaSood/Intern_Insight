# app/core/ml_model.py
from rapidfuzz import fuzz
import difflib
import math
import re

# ----------------- distance imports (robust) -----------------
try:
    from .distance_matrix import get_distance, normalize_city_name
except Exception:
    try:
        from app.core.distance_matrix import get_distance, normalize_city_name
    except Exception:
        # If distance_matrix missing, provide safe fallbacks
        def normalize_city_name(x):
            return (x or "").strip().lower()

        def get_distance(a, b):
            # fallback: unknown distance
            return float('inf')

# ----------------- City Helpers (kept from original) -----------------
def _normalize_city(name: str) -> str:
    return (name or "").strip().lower()

def _get_distance_between_cities(city1: str, city2: str) -> float:
    """Get distance between two cities using hardcoded distance matrix (via get_distance)."""
    if not city1 or not city2:
        return float('inf')

    # Normalize city names using provided helper
    city1_norm = normalize_city_name(city1)
    city2_norm = normalize_city_name(city2)

    try:
        return get_distance(city1_norm, city2_norm)
    except Exception:
        return float('inf')

def find_nearest_city(input_city: str, cities: list[dict]):
    """
    Given input city string and list of cities from internships.json,
    return the best matching city (string match or distance-based nearest).
    Returns (city_name_or_None, distance_or_None)
    """
    print(f"Finding nearest city for: '{input_city}'")
    db_city_names = [c.get("name") for c in cities if c.get("name")]

    if not db_city_names:
        return None, None

    # --- Step 1: Exact/Fuzzy match ---
    input_norm = _normalize_city(input_city)
    norm_db = [_normalize_city(c) for c in db_city_names]

    # Try exact
    if input_norm in norm_db:
        idx = norm_db.index(input_norm)
        return db_city_names[idx], 0.0

    # Try fuzzy (difflib, cutoff=0.8)
    match = difflib.get_close_matches(input_norm, norm_db, n=1, cutoff=0.8)
    if match:
        idx = norm_db.index(match[0])
        return db_city_names[idx], 0.0

    # --- Step 2: Distance-based using hardcoded distances ---
    nearest_city = None
    min_dist = float("inf")

    for city in db_city_names:
        try:
            dist = _get_distance_between_cities(input_city, city)
            if dist < min_dist:
                min_dist = dist
                nearest_city = city
        except Exception as e:
            print(f"❌ Error calculating distance to {city}: {e}")
            continue

    if nearest_city:
        return nearest_city, round(min_dist, 2)
    return None, None

# ----------------- Skill Helpers (from your original file) -----------------
def _load_synonyms():
    """Load skill synonyms strictly from MongoDB (Atlas). No JSON fallback."""
    try:
        from app.core.database import load_data
        syn_rows = load_data('skills_synonyms') or []
        mapping = {}
        for row in syn_rows:
            alias = str(row.get('alias', '')).strip().lower()
            canonical = str(row.get('canonical', '')).strip().lower()
            if alias and canonical:
                mapping[alias] = canonical
        return mapping
    except Exception as e:
        print(f"[ERROR] DB load for skills_synonyms failed: {e}")
        return {}

_SKILL_SYNONYMS = _load_synonyms()

def _normalize_skill(skill: str) -> str:
    """Lowercase, strip, and map synonyms."""
    if not isinstance(skill, str):
        print(f"[DEBUG] Non-string skill passed to _normalize_skill: {repr(skill)} (type: {type(skill)})")
        return ""
    s = skill.strip().lower()
    return _SKILL_SYNONYMS.get(s, s)

def _normalize_skill_list(skills):
    """Return a list of cleaned, lowercase skill strings (unique, ordered)."""
    if not skills:
        return []
    # Deeply flatten skills (arbitrary depth)
    def _deep_flatten(sk):
        if isinstance(sk, list):
            out = []
            for item in sk:
                out.extend(_deep_flatten(item))
            return out
        elif isinstance(sk, str):
            return [sk]
        else:
            return []
    flat_skills = _deep_flatten(skills)
    seen = set()
    out = []
    for s in flat_skills:
        if not isinstance(s, str):
            print(f"[DEBUG] Non-string skill found in skills_possessed: {repr(s)} (type: {type(s)})")
            continue
        norm = _normalize_skill(s)
        if norm and norm not in seen:
            seen.add(norm)
            out.append(norm)
    return out

# ----------------- New similarity helpers (improved) -----------------
def _tokenize(s: str):
    if not s:
        return set()
    tokens = [t for t in re.split(r'[^a-z0-9]+', s.lower()) if len(t) > 1]
    return set(tokens)

def _jaccard(a_tokens: set, b_tokens: set):
    if not a_tokens or not b_tokens:
        return 0.0
    inter = a_tokens & b_tokens
    uni = a_tokens | b_tokens
    return len(inter) / len(uni)

def skill_similarity(candidate_skills, internship_skills, fuzzy_threshold=85):
    """
    Returns a normalized score 0..1 combining:
     - exact/synonym matches (primary)
     - token overlap (Jaccard on skill phrases)
     - fuzzy matches on skill strings
    """
    if not internship_skills:
        return 0.0
    # candidate_skills expected as iterable of normalized strings
    cand = list(candidate_skills)
    intern = list(internship_skills)
    matched = set()

    # exact / synonyms
    for cs in cand:
        if cs in intern:
            matched.add(cs)

    # fuzzy + token overlap for remaining
    for cs in cand:
        if cs in matched:
            continue
        # fuzzy against any internship skill
        if any(fuzz.partial_ratio(cs, s) >= fuzzy_threshold for s in intern):
            matched.add(cs)
            continue
        # token overlap with any internship skill
        cs_tokens = _tokenize(cs)
        if any(_jaccard(cs_tokens, _tokenize(s)) >= 0.5 for s in intern):
            matched.add(cs)

    coverage = min(1.0, len(matched) / max(1, len(intern)))
    return coverage

def location_similarity(candidate_loc, intern_loc):
    """
    Return (score 0..1, distance_km or None, reason_str)
    Tiering: same city -> 1.0, <=50km -> 0.9, <=200km -> 0.6, else 0.0
    """
    if not candidate_loc or not intern_loc:
        return 0.0, None, "no location info"
    try:
        c_norm = normalize_city_name(candidate_loc)
        i_norm = normalize_city_name(intern_loc)
    except Exception:
        c_norm = (candidate_loc or "").strip().lower()
        i_norm = (intern_loc or "").strip().lower()

    if c_norm == i_norm:
        return 1.0, 0.0, "same city"

    try:
        dist = get_distance(c_norm, i_norm)
        if dist is None:
            dist = float('inf')
    except Exception:
        dist = float('inf')

    if dist <= 0:
        return 1.0, 0.0, "same place"
    if dist <= 50:
        return 0.9, dist, f"{int(dist)} km away"
    if dist <= 200:
        return 0.6, dist, f"{int(dist)} km away"
    return 0.0, dist if math.isfinite(dist) else None, f"{int(dist)} km away" if math.isfinite(dist) else "far"

# ----------------- Recommendations (keeps the original function name) -----------------
def get_recommendations(candidate, internships, top_n=10,
                        skill_weight=0.5, loc_weight=0.25,
                        sector_weight=0.15, misc_weight=0.10,
                        company_interactions=None, company_ratings=None,
                        internship_interactions=None,
                        company_interaction_stats=None,
                        dedupe_org=True,
                        min_score=0.0):
    """
    Lightweight, explainable recommendation function that is compatible with
    existing callers in your codebase.
    Returns a list of up to top_n internship dicts with match_score and reason.
    
    New parameters:
    - company_interactions: dict of {company_id: {'type': 'like'|'dislike', 'reason_tags': []}}
    - company_ratings: dict of {company_id: average_rating} from reviews
    - internship_interactions: dict of {internship_id: {'type': 'like'|'dislike', 'reason_tags': []}}
    """
    # company_interactions are the *current user's* company likes/dislikes.
    # Per product rules: company interactions affect all users, so the model
    # should prefer company_interaction_stats (global counts) for scoring.
    company_interactions = company_interactions or {}
    company_ratings = company_ratings or {}
    internship_interactions = internship_interactions or {}
    company_interaction_stats = company_interaction_stats or {}
    
    cand_skills = _normalize_skill_list(candidate.get("skills_possessed", []))
    cand_skill_set = set(cand_skills)
    sector_interests = [s.lower() for s in candidate.get("sector_interests", []) or []]
    location_pref = (candidate.get("location_preference") or "").strip().lower()
    field_of_study = (candidate.get("field_of_study") or "").strip().lower()
    education_level = (candidate.get("education_level") or "").strip().lower()
    is_first_gen = bool(candidate.get("first_generation") or candidate.get("no_experience"))
    
    # Build internship lookup for property-based learning
    internships_by_id = {(i.get("internship_id") or i.get("_id", "")): i for i in internships or []}
    
    # Analyze internships to learn user preferences from interactions
    disliked_patterns = {
        'locations': [],        # Cities/regions to avoid
        'sectors': [],          # Sectors to penalize
        'low_stipend': None,    # Stipend threshold (if user dislikes low stipend roles)
        'skills': []            # Skills user wants to avoid
    }

    liked_patterns = {
        'locations': []  # Cities/regions the user prefers (e.g. liked for "Great location")
    }
    
    for internship_id, interaction in internship_interactions.items():
        if not isinstance(interaction, dict):
            continue
        interaction_type = interaction.get('type')
        reason_tags = interaction.get('reason_tags', [])
        base_internship = internships_by_id.get(internship_id)

        if not base_internship:
            continue

        if interaction_type == 'dislike':
            # Learn location patterns to avoid
            if 'Poor location' in reason_tags or 'Location doesn\'t work for me' in reason_tags:
                loc = (base_internship.get('location') or '').strip().lower()
                if loc:
                    disliked_patterns['locations'].append(loc)

            # Learn sector patterns to avoid
            if 'Wrong sector/industry' in reason_tags or 'Not interested in this sector' in reason_tags:
                sector = (base_internship.get('sector') or '').strip().lower()
                if sector:
                    disliked_patterns['sectors'].append(sector)

            # Learn stipend expectations
            if 'Stipend too low' in reason_tags or 'Low compensation' in reason_tags:
                stipend = base_internship.get('stipend')
                if stipend and isinstance(stipend, (int, float)):
                    if disliked_patterns['low_stipend'] is None or stipend > disliked_patterns['low_stipend']:
                        disliked_patterns['low_stipend'] = stipend

            # Learn skills to avoid
            if 'Skills mismatch' in reason_tags or 'Required skills don\'t match' in reason_tags:
                skills = base_internship.get('skills_required', [])
                disliked_patterns['skills'].extend([s.lower() for s in skills])

        if interaction_type == 'like':
            # Learn preferred locations
            if 'Great location' in reason_tags or 'Perfect location' in reason_tags:
                loc = (base_internship.get('location') or '').strip().lower()
                if loc:
                    liked_patterns['locations'].append(loc)
    
    # Extract liked company sectors for sector preference boost
    liked_sectors = set()
    for company_id, interaction in company_interactions.items():
        if interaction == 'like':
            # This would need company data to get sector - will add in integration
            pass

    scored = []
    for internship in internships or []:
        internship_skills = _normalize_skill_list(internship.get("skills_required", []))
        internship_id = internship.get("internship_id") or internship.get("_id", "")
        company_id = internship.get("company_id") or internship.get("organization", "")

        skill_sim = skill_similarity(cand_skill_set, internship_skills)
        loc_sim, dist_km, loc_reason = location_similarity(location_pref, internship.get("location", ""))
        sector = (internship.get("sector") or "").strip().lower()
        sector_sim = 1.0 if sector in sector_interests else 0.0
        field_sim = 1.0 if field_of_study and field_of_study in sector else 0.0
        edu_sim = 1.0 if education_level and education_level in (internship.get("title") or "").lower() else 0.0
        fg_boost = 0.08 if is_first_gen and internship.get("is_beginner_friendly") else 0.0
        
        # --- Company interaction and rating factors ---
        # Per product rules: company likes/dislikes are global signals.
        company_boost = 0.0
        company_penalty = 0.0
        rating_boost = 0.0

        # Global company like/dislike signal (all users)
        company_key = None
        try:
            if isinstance(company_id, str) and company_id.strip():
                company_key = company_id
        except Exception:
            company_key = None
        if not company_key:
            company_key = (internship.get('organization') or internship.get('company') or '').strip().lower()

        try:
            stats = company_interaction_stats.get(company_key)
            if not stats and isinstance(company_key, str):
                stats = company_interaction_stats.get(company_key.strip().lower())
            if isinstance(stats, dict):
                like_count = float(stats.get('like', 0) or 0)
                dislike_count = float(stats.get('dislike', 0) or 0)
                total = like_count + dislike_count
                if total > 0:
                    # Net sentiment in [-1, 1]
                    sentiment = (like_count - dislike_count) / total
                    # Convert to small boost/penalty (max +/- 5%)
                    impact = max(-0.05, min(0.05, sentiment * 0.05))
                    if impact >= 0:
                        company_boost += impact
                    else:
                        company_penalty += abs(impact)
        except Exception:
            pass
        
        # Company rating boost (global)
        if company_id in company_ratings:
            avg_rating = company_ratings[company_id]
            if avg_rating >= 4.5:
                rating_boost = 0.05  # +5% for highly rated companies
            elif avg_rating < 3.0:
                company_penalty += 0.10  # Additional -10% for low-rated companies
        
        # --- Internship interaction factors (personal preferences - only affects this user) ---
        internship_boost = 0.0
        internship_penalty = 0.0
        pattern_penalty = 0.0  # Penalty from learned patterns
        pattern_boost = 0.0    # Boost from learned patterns
        
        # Check if this internship matches disliked patterns
        current_location = (internship.get('location') or '').strip().lower()
        current_sector = (internship.get('sector') or '').strip().lower()
        current_stipend = internship.get('stipend')
        current_skills = [s.lower() for s in internship.get('skills_required', [])]
        
        # Location-based penalty (fuzzy matching for nearby cities)
        for disliked_loc in disliked_patterns['locations']:
            if disliked_loc in current_location or current_location in disliked_loc:
                pattern_penalty += 0.10  # -10% for similar location
                break
            # Check if cities are close (within 100km) using distance matrix
            try:
                dist = _get_distance_between_cities(disliked_loc, current_location)
                if dist != float('inf') and dist < 100:  # Within 100km
                    pattern_penalty += 0.05  # -5% for nearby location
                    break
            except:
                pass

        # Location-based boost (preferred locations; fuzzy/nearby supported)
        for liked_loc in liked_patterns['locations']:
            if not liked_loc:
                continue
            if liked_loc in current_location or current_location in liked_loc:
                pattern_boost += 0.08  # +8% for preferred location
                break
            try:
                dist = _get_distance_between_cities(liked_loc, current_location)
                if dist != float('inf') and dist < 100:
                    pattern_boost += 0.04  # +4% for nearby preferred location
                    break
            except Exception:
                pass
        
        # Sector-based penalty (exact match)
        if current_sector and current_sector in disliked_patterns['sectors']:
            pattern_penalty += 0.15  # -15% for disliked sector
        
        # Stipend-based penalty (if current stipend is at or below disliked threshold)
        if disliked_patterns['low_stipend'] is not None and current_stipend:
            if isinstance(current_stipend, (int, float)):
                if current_stipend <= disliked_patterns['low_stipend']:
                    pattern_penalty += 0.08  # -8% for low stipend
                elif current_stipend <= disliked_patterns['low_stipend'] * 1.1:  # Within 10% above
                    pattern_penalty += 0.04  # -4% for slightly better but still low stipend
        
        # Skills-based penalty (if significant overlap with disliked skills)
        if disliked_patterns['skills']:
            disliked_skill_set = set(disliked_patterns['skills'])
            current_skill_set = set(current_skills)
            overlap = disliked_skill_set.intersection(current_skill_set)
            if overlap:
                overlap_ratio = len(overlap) / max(len(current_skill_set), 1)
                if overlap_ratio >= 0.5:  # 50%+ skills are disliked
                    pattern_penalty += 0.12  # -12% for high skill overlap
                elif overlap_ratio >= 0.3:  # 30-50% overlap
                    pattern_penalty += 0.06  # -6% for moderate skill overlap
        
        # Direct internship interaction (overrides pattern penalties if explicitly liked/disliked)
        
        if internship_id in internship_interactions:
            interaction = internship_interactions[internship_id]
            interaction_type = interaction.get('type') if isinstance(interaction, dict) else interaction
            reason_tags = interaction.get('reason_tags', []) if isinstance(interaction, dict) else []
            
            if interaction_type == 'like':
                internship_boost = 0.20  # +20% boost for liked internships (personal)
                # Additional boost based on reason tags
                if 'Role fits my skills' in reason_tags or 'Skills match perfectly' in reason_tags:
                    internship_boost += 0.05  # Extra boost if they liked it for skills
            elif interaction_type == 'dislike':
                internship_penalty = 0.30  # -30% penalty for disliked internships (strong personal signal)
                # Don't show if explicitly disliked
                if 'Role doesn\'t fit my career goals' in reason_tags:
                    internship_penalty = 1.0  # Effectively remove from recommendations

        base_score = (
            skill_weight * skill_sim +
            loc_weight * loc_sim +
            sector_weight * sector_sim +
            misc_weight * (0.5 * field_sim + 0.5 * edu_sim)
        )
        # Apply all factors (company global + internship personal + learned patterns)
        score = base_score + fg_boost + company_boost + rating_boost + internship_boost + pattern_boost - company_penalty - internship_penalty - pattern_penalty
        score = min(1.0, max(0.0, score))  # Clamp between 0 and 1
        score_pct = round(score * 100, 1)

        scored.append({
            "internship": internship,
            "score": score_pct,
            "components": {
                "skill_sim": round(skill_sim, 2),
                "loc_sim": round(loc_sim, 2),
                "loc_reason": loc_reason,
                "sector_sim": sector_sim,
                "field_sim": field_sim,
                "edu_sim": edu_sim,
                "fg_boost": fg_boost,
                "company_boost": company_boost,
                "company_penalty": company_penalty,
                "rating_boost": rating_boost,
                "internship_boost": internship_boost,
                "internship_penalty": internship_penalty,
                "pattern_penalty": pattern_penalty,
                "pattern_boost": pattern_boost
            }
        })

    scored.sort(key=lambda x: (-x["score"], x["internship"].get("internship_id") or ""))
    results = []
    seen_orgs = set()
    for item in scored:
        if item.get('score', 0) <= float(min_score or 0):
            continue
        org = (item["internship"].get("organization") or "").strip().lower()
        if dedupe_org:
            if org and org in seen_orgs:
                continue
        comps = item["components"]
        reason = []
        if comps["skill_sim"] >= 0.6:
            reason.append(f"Strong skill fit ({int(comps['skill_sim']*100)}%)")
        elif comps["skill_sim"] > 0:
            reason.append(f"Some skill match ({int(comps['skill_sim']*100)}%)")
        if comps["loc_sim"] >= 0.9:
            reason.append("Close to you")
        elif comps["loc_sim"] >= 0.6:
            reason.append("Within reasonable distance")
        if comps["sector_sim"]:
            reason.append("Sector match")
        if comps["fg_boost"]:
            reason.append("Good for beginners")
        if comps["company_boost"]:
            reason.append("You liked this company")
        if comps["rating_boost"]:
            reason.append("Highly rated company")
        if comps["internship_boost"]:
            reason.append("You showed interest in this")
        if comps["internship_penalty"] and comps["internship_penalty"] < 1.0:
            reason.append("Previously disliked")
        if comps["pattern_penalty"] > 0:
            if comps["pattern_penalty"] >= 0.12:
                reason.append("Similar to disliked roles")
            elif comps["pattern_penalty"] >= 0.08:
                reason.append("May not match preferences")
        if comps.get("pattern_boost", 0) > 0:
            reason.append("Matches your preferences")

        results.append({
            "internship_id": item["internship"].get("internship_id") or item["internship"].get("id"),
            "title": item["internship"].get("title"),
            "organization": item["internship"].get("organization"),
            "location": item["internship"].get("location"),
            "sector": item["internship"].get("sector"),
            "match_score": item["score"],
            "reason": ", ".join(reason) if reason else "Relevant",
            "components": comps
        })
        if org:
            seen_orgs.add(org)
        if top_n is not None:
            try:
                n = int(top_n)
            except Exception:
                n = None
            if n is not None and n > 0 and len(results) >= n:
                break

    return results

# compatibility aliases (if other files import old helpers directly)
location_tier_score = location_similarity
_get_distance_between_cities = _get_distance_between_cities
