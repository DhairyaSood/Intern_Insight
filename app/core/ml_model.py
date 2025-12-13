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

def _city_only(value: str) -> str:
    s = (value or "").strip()
    if not s:
        return ""
    # Take "City" from common compound formats:
    # - "City, State" / "City (Region)"
    # - "City / Remote" / "City | Remote" / "City; Remote"
    # - "City - State" (only when clearly a separator)
    if " - " in s:
        s = s.split(" - ", 1)[0].strip()
    s = re.split(r"[,\(\|/;]", s)[0].strip()
    return s

def _safe_normalize_city(value: str) -> str:
    base = _city_only(value)
    if not base:
        return ""
    try:
        return normalize_city_name(base)
    except Exception:
        return _normalize_city(base)

def _distance_decay(dist_km: float, half_life_km: float = 150.0) -> float:
    """Return 0..1 decay with 1 at 0km and ~0.5 at half_life_km."""
    try:
        d = float(dist_km)
    except Exception:
        return 0.0
    if not math.isfinite(d) or d < 0:
        return 0.0
    if half_life_km <= 0:
        return 0.0
    # exp(-ln(2) * d / half_life)
    return math.exp(-0.6931471805599453 * d / half_life_km)

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
    c_norm = _safe_normalize_city(candidate_loc)
    i_norm = _safe_normalize_city(intern_loc)
    if not c_norm or not i_norm:
        return 0.0, None, "no location info"

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
                        company_reason_stats=None,
                        preference_profile=None,
                        company_reputation=None,
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
    company_reason_stats = company_reason_stats or {}
    
    cand_skills = _normalize_skill_list(candidate.get("skills_possessed", []))
    cand_skill_set = set(cand_skills)
    sector_interests = [s.lower() for s in candidate.get("sector_interests", []) or []]
    location_pref = (candidate.get("location_preference") or "").strip().lower()

    # ----------------- Dynamic weights (context-aware) -----------------
    # The system avoids a single fixed formula by adjusting weights based on:
    # - availability of candidate data
    # - strength of learned preference profile
    def _clamp01(x: float) -> float:
        try:
            return max(0.0, min(1.0, float(x)))
        except Exception:
            return 0.0

    pref_strength = 0.0
    try:
        if isinstance(preference_profile, dict):
            pref_strength = float(preference_profile.get('strength') or 0.0)
    except Exception:
        pref_strength = 0.0
    pref_strength = _clamp01(pref_strength)

    has_skills = bool(cand_skill_set)
    has_loc = bool(location_pref)
    has_sector = bool(sector_interests)

    # Start from provided defaults, then adapt.
    w_skill = float(skill_weight)
    w_loc = float(loc_weight)
    w_sector = float(sector_weight)
    w_misc = float(misc_weight)

    # If resume fields are missing, shift weight toward learned preferences.
    if not has_skills:
        w_skill *= 0.6
        w_misc += 0.10 * (0.5 + 0.5 * pref_strength)
    if not has_loc:
        # If user provided no location_preference but they liked/disliked locations,
        # location should still matter.
        if pref_strength > 0:
            w_loc = max(w_loc, 0.20)
        else:
            w_loc *= 0.5
            w_misc += 0.05
    if not has_sector:
        w_sector *= 0.7
        w_misc += 0.05

    # If preference profile is strong, slightly emphasize preference-sensitive channels.
    # Keep changes small to avoid destabilizing scores.
    w_skill *= (1.0 - 0.08 * pref_strength)
    w_loc *= (1.0 + 0.10 * pref_strength)
    w_sector *= (1.0 + 0.06 * pref_strength)
    w_misc *= (1.0 + 0.12 * pref_strength)

    # Normalize to sum to 1.0
    s_w = max(1e-9, w_skill + w_loc + w_sector + w_misc)
    w_skill, w_loc, w_sector, w_misc = (w_skill / s_w, w_loc / s_w, w_sector / s_w, w_misc / s_w)

    field_of_study = (candidate.get("field_of_study") or "").strip().lower()
    education_level = (candidate.get("education_level") or "").strip().lower()
    is_first_gen = bool(candidate.get("first_generation") or candidate.get("no_experience"))
    
    # Build internship lookup for property-based learning
    internships_by_id = {(i.get("internship_id") or i.get("_id", "")): i for i in internships or []}
    
    # Analyze internships to learn user preferences from interactions
    disliked_patterns = {
        'locations': [],        # Cities to avoid
        'sectors': [],          # Sectors to penalize
        'low_stipend': None,    # Stipend threshold (if user dislikes low stipend roles)
        'skills': [],           # Skills user wants to avoid
        'duration_buckets': [], # Short/medium/long buckets to avoid
        'complexity': [],       # basic/medium/advanced to avoid
        'learning': 0           # dislike count for learning-related reasons
    }

    liked_patterns = {
        'locations': [],        # Cities the user prefers
        'sectors': [],          # Sectors to prefer
        'skills': [],           # Skills the user tends to like
        'min_stipend': None,    # Preferred minimum stipend
        'learning': 0,          # like count for learning-related reasons
        'reputable': 0,         # likes due to reputable company
        'career': 0,            # likes due to career relevance / role fit
        'skills_focus': 0       # likes due to skills fit
    }

    def _duration_bucket(v):
        if v is None:
            return None
        months = None
        if isinstance(v, (int, float)):
            months = int(v)
        elif isinstance(v, str):
            m = re.search(r"(\d+)", v)
            if m:
                months = int(m.group(1))
        if months is None or months <= 0:
            return None
        if months <= 2:
            return 'short'
        if months <= 4:
            return 'medium'
        return 'long'

    def _complexity_label(intern):
        try:
            skill_count = len(_normalize_skill_list(intern.get('skills_required', [])))
        except Exception:
            skill_count = 0
        beginner = bool(intern.get('is_beginner_friendly'))
        if beginner or skill_count <= 3:
            return 'basic'
        if (not beginner) and skill_count >= 6:
            return 'advanced'
        return 'medium'

    def _learning_proxy(intern):
        if intern.get('is_beginner_friendly'):
            return True
        desc = (intern.get('description') or '')
        if isinstance(desc, str) and re.search(r"\b(learn|learning|training|mentor|mentorship)\b", desc.lower()):
            return True
        return False
    
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
            if 'Poor location' in reason_tags:
                loc = _safe_normalize_city(base_internship.get('location') or '')
                if loc:
                    disliked_patterns['locations'].append(loc)

            # Learn sector patterns to avoid
            if 'Not interested in sector' in reason_tags:
                sector = (base_internship.get('sector') or '').strip().lower()
                if sector:
                    disliked_patterns['sectors'].append(sector)

            # Learn stipend expectations
            if 'Low stipend' in reason_tags:
                stipend = base_internship.get('stipend')
                if stipend and isinstance(stipend, (int, float)):
                    if disliked_patterns['low_stipend'] is None or stipend > disliked_patterns['low_stipend']:
                        disliked_patterns['low_stipend'] = stipend

            # Learn skills to avoid
            if 'Skills mismatch' in reason_tags:
                skills = _normalize_skill_list(base_internship.get('skills_required', []))
                disliked_patterns['skills'].extend(skills)

            if 'Duration issues' in reason_tags:
                bucket = _duration_bucket(base_internship.get('duration'))
                if bucket:
                    disliked_patterns['duration_buckets'].append(bucket)

            if 'Too advanced/basic' in reason_tags:
                disliked_patterns['complexity'].append(_complexity_label(base_internship))

            if 'Limited learning' in reason_tags:
                disliked_patterns['learning'] += 1

            if 'Role doesn\'t fit' in reason_tags:
                sector = (base_internship.get('sector') or '').strip().lower()
                if sector:
                    disliked_patterns['sectors'].append(sector)

        if interaction_type == 'like':
            # Location preference
            if 'Great location' in reason_tags:
                loc = _safe_normalize_city(base_internship.get('location') or '')
                if loc:
                    liked_patterns['locations'].append(loc)

            # Skills and role fit
            if 'Skills match well' in reason_tags:
                liked_patterns['skills_focus'] += 1
                skills = _normalize_skill_list(base_internship.get('skills_required', []))
                liked_patterns['skills'].extend(skills)
            if 'Perfect role fit' in reason_tags or 'Career relevant' in reason_tags:
                liked_patterns['career'] += 1
                sector = (base_internship.get('sector') or '').strip().lower()
                if sector:
                    liked_patterns['sectors'].append(sector)

            # Compensation preference
            if 'Good stipend' in reason_tags:
                stipend = base_internship.get('stipend')
                if isinstance(stipend, (int, float)):
                    liked_patterns['min_stipend'] = max(float(liked_patterns['min_stipend'] or 0), float(stipend))

            # Learning preference
            if 'Learning opportunity' in reason_tags:
                liked_patterns['learning'] += 1

            # Reputation preference (use global ratings/sentiment as proxy later)
            if 'Reputable company' in reason_tags:
                liked_patterns['reputable'] += 1
    
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

        # Persisted global reputation (optional): small additional nudge, confidence-weighted by counts.
        try:
            rep_score = None
            if isinstance(company_reputation, dict):
                rep_score = company_reputation.get(company_key)
                if rep_score is None and isinstance(company_key, str):
                    rep_score = company_reputation.get(company_key.strip().lower())

            if rep_score is None and isinstance(company_reputation, dict):
                # if keyed strictly by company_id but internship has it separately
                cid = internship.get('company_id')
                if cid:
                    rep_score = company_reputation.get(str(cid))

            if rep_score is not None:
                rep = float(rep_score)
                # Convert 0..100 -> [-1,1] around neutral 50
                sentiment = max(-1.0, min(1.0, (rep - 50.0) / 50.0))
                # Confidence based on available global counts if present
                conf = 0.3
                if isinstance(stats, dict):
                    total = float((stats.get('like', 0) or 0) + (stats.get('dislike', 0) or 0))
                    conf = max(0.2, min(1.0, total / 25.0))
                impact = max(-0.06, min(0.06, sentiment * 0.06 * conf))
                if impact >= 0:
                    company_boost += impact
                else:
                    company_penalty += abs(impact)
        except Exception:
            pass

        # Global company reason-tag signal (all users): small extra nudge based on why
        # people like/dislike the company.
        try:
            rs = company_reason_stats.get(company_key)
            if not rs and isinstance(company_key, str):
                rs = company_reason_stats.get(company_key.strip().lower())
            if isinstance(rs, dict):
                like_map = rs.get('like') or {}
                dislike_map = rs.get('dislike') or {}

                reason_weights = {
                    # positive
                    'Great company culture': 1.0,
                    'Excellent benefits': 0.8,
                    'Good work-life balance': 1.0,
                    'Strong reputation': 1.0,
                    'Innovation focused': 0.7,
                    'Learning opportunities': 0.9,
                    'Career growth potential': 0.9,
                    'Good management': 0.8,
                    # negative
                    'Poor work culture': -1.0,
                    'Inadequate benefits': -0.8,
                    'Bad work-life balance': -1.0,
                    'Negative reviews': -0.9,
                    'Limited growth': -0.8,
                    'Poor management': -0.9,
                    'Low compensation': -0.7,
                    'Toxic environment': -1.2,
                }

                weighted = 0.0
                total = 0.0
                for tag, cnt in (like_map or {}).items():
                    w = float(reason_weights.get(tag, 0.3))
                    c = float(cnt or 0)
                    if c <= 0:
                        continue
                    weighted += abs(w) * c
                    total += abs(w) * c
                for tag, cnt in (dislike_map or {}).items():
                    w = float(reason_weights.get(tag, -0.3))
                    c = float(cnt or 0)
                    if c <= 0:
                        continue
                    weighted -= abs(w) * c
                    total += abs(w) * c

                if total > 0:
                    # Normalize into [-1, 1], then cap to a small magnitude.
                    s = max(-1.0, min(1.0, weighted / total))
                    extra = max(-0.02, min(0.02, s * 0.02))
                    if extra >= 0:
                        company_boost += extra
                    else:
                        company_penalty += abs(extra)
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
        current_location = _safe_normalize_city(internship.get('location') or '')
        current_sector = (internship.get('sector') or '').strip().lower()
        current_stipend = internship.get('stipend')
        current_skills = internship_skills
        
        # Location-based preference: smooth decay via distance matrix
        if current_location:
            try:
                max_like = 0.0
                for liked_loc in liked_patterns['locations']:
                    if not liked_loc:
                        continue
                    if liked_loc == current_location:
                        max_like = 1.0
                        break
                    d = _get_distance_between_cities(liked_loc, current_location)
                    if math.isfinite(d) and d >= 0:
                        max_like = max(max_like, _distance_decay(d, half_life_km=150.0))
                if max_like > 0:
                    pattern_boost += 0.08 * max_like
            except Exception:
                pass

            try:
                max_dislike = 0.0
                for disliked_loc in disliked_patterns['locations']:
                    if not disliked_loc:
                        continue
                    if disliked_loc == current_location:
                        max_dislike = 1.0
                        break
                    d = _get_distance_between_cities(disliked_loc, current_location)
                    if math.isfinite(d) and d >= 0:
                        max_dislike = max(max_dislike, _distance_decay(d, half_life_km=150.0))
                if max_dislike > 0:
                    pattern_penalty += 0.10 * max_dislike
            except Exception:
                pass
        
        # Sector-based penalty (exact match)
        if current_sector and current_sector in disliked_patterns['sectors']:
            pattern_penalty += 0.15  # -15% for disliked sector

        # Sector-based boost from likes
        if current_sector and liked_patterns['sectors'] and current_sector in set(liked_patterns['sectors']):
            pattern_boost += 0.06
        
        # Stipend-based penalty (if current stipend is at or below disliked threshold)
        if disliked_patterns['low_stipend'] is not None and current_stipend:
            if isinstance(current_stipend, (int, float)):
                if current_stipend <= disliked_patterns['low_stipend']:
                    pattern_penalty += 0.08  # -8% for low stipend
                elif current_stipend <= disliked_patterns['low_stipend'] * 1.1:  # Within 10% above
                    pattern_penalty += 0.04  # -4% for slightly better but still low stipend
        
        # Skills-based penalty (if significant overlap with disliked skills)
        if disliked_patterns['skills']:
            disliked_skill_set = set(_normalize_skill_list(disliked_patterns['skills']))
            current_skill_set = set(current_skills)
            overlap = disliked_skill_set & current_skill_set
            if overlap:
                overlap_ratio = len(overlap) / max(len(current_skill_set), 1)
                if overlap_ratio >= 0.5:  # 50%+ skills are disliked
                    pattern_penalty += 0.12  # -12% for high skill overlap
                elif overlap_ratio >= 0.3:  # 30-50% overlap
                    pattern_penalty += 0.06  # -6% for moderate skill overlap

        # Skills-based boost from likes (nudge towards similar skill stacks)
        if liked_patterns['skills']:
            liked_skill_set = set(_normalize_skill_list(liked_patterns['skills']))
            current_skill_set = set(current_skills)
            overlap = liked_skill_set & current_skill_set
            if overlap:
                overlap_ratio = len(overlap) / max(len(current_skill_set), 1)
                pattern_boost += min(0.06, 0.06 * overlap_ratio)

        # Duration and complexity nudges
        try:
            if disliked_patterns['duration_buckets']:
                b = _duration_bucket(internship.get('duration'))
                if b and b in set(disliked_patterns['duration_buckets']):
                    pattern_penalty += 0.04
        except Exception:
            pass

        try:
            if disliked_patterns['complexity']:
                cplx = _complexity_label(internship)
                if cplx in set(disliked_patterns['complexity']):
                    pattern_penalty += 0.04
        except Exception:
            pass

        # Learning preference nudges (proxy-based)
        try:
            if liked_patterns.get('learning', 0) > 0 and _learning_proxy(internship):
                pattern_boost += 0.04
            if disliked_patterns.get('learning', 0) > 0 and (not _learning_proxy(internship)):
                pattern_penalty += 0.04
        except Exception:
            pass

        # Compensation preference: if they liked "Good stipend", prefer roles >= that level
        try:
            pref = liked_patterns.get('min_stipend')
            if pref and isinstance(current_stipend, (int, float)):
                if current_stipend >= float(pref):
                    pattern_boost += 0.04
                elif current_stipend >= float(pref) * 0.9:
                    pattern_boost += 0.02
        except Exception:
            pass
        
        # Direct internship interaction (overrides pattern penalties if explicitly liked/disliked)
        
        if internship_id in internship_interactions:
            interaction = internship_interactions[internship_id]
            interaction_type = interaction.get('type') if isinstance(interaction, dict) else interaction
            reason_tags = interaction.get('reason_tags', []) if isinstance(interaction, dict) else []
            
            if interaction_type == 'like':
                internship_boost = 0.20  # +20% boost for liked internships (personal)
                # Additional boost based on reason tags
                if 'Skills match well' in reason_tags or 'Perfect role fit' in reason_tags:
                    internship_boost += 0.05
            elif interaction_type == 'dislike':
                internship_penalty = 0.30  # -30% penalty for disliked internships (strong personal signal)
                # Don't show if explicitly disliked
                if 'Role doesn\'t fit' in reason_tags:
                    internship_penalty = 1.0

        # Preference-profile extras (personal): work type + seniority nudges.
        try:
            if isinstance(preference_profile, dict) and preference_profile.get('strength', 0) and pref_strength > 0:
                # work type
                wt_list = preference_profile.get('work_type') or []
                wt_map = {k: float(v) for k, v in wt_list if k}
                intern_wt = 'unknown'
                loc_text = (internship.get('location') or '')
                s_loc = str(loc_text).lower()
                if 'hybrid' in s_loc:
                    intern_wt = 'hybrid'
                elif 'remote' in s_loc or 'wfh' in s_loc or 'work from home' in s_loc:
                    intern_wt = 'remote'
                elif s_loc.strip():
                    intern_wt = 'onsite'
                wt_score = wt_map.get(intern_wt, 0.0)
                if wt_score:
                    pattern_boost += max(-0.03, min(0.03, 0.02 * wt_score * pref_strength))

                # seniority
                sen_list = preference_profile.get('seniority') or []
                sen_map = {k: float(v) for k, v in sen_list if k}
                title_text = str(internship.get('title') or '').lower()
                intern_sen = 'mid'
                if any(k in title_text for k in ('senior', 'lead', 'principal', 'staff')):
                    intern_sen = 'senior'
                elif any(k in title_text for k in ('junior', 'entry', 'fresher')):
                    intern_sen = 'junior'
                sen_score = sen_map.get(intern_sen, 0.0)
                if sen_score:
                    pattern_boost += max(-0.03, min(0.03, 0.02 * sen_score * pref_strength))

                # stipend minimum preference (slight)
                try:
                    pref_min = (preference_profile.get('stipend') or {}).get('min_preferred')
                    if pref_min and isinstance(current_stipend, (int, float)):
                        if float(current_stipend) >= float(pref_min):
                            pattern_boost += 0.02 * pref_strength
                except Exception:
                    pass
        except Exception:
            pass

        base_score = (
            w_skill * skill_sim +
            w_loc * loc_sim +
            w_sector * sector_sim +
            w_misc * (0.5 * field_sim + 0.5 * edu_sim)
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
