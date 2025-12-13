"""Personal preference profile (per-candidate).

This module converts internship like/dislike interactions into a compact, persisted
preference profile representing *personal* signals only.

The goal is to make scoring responsive without re-processing large histories on
every request, while keeping the logic explainable.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime
import re
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple


_STOPWORDS = {
    "intern",
    "internship",
    "trainee",
    "jr",
    "junior",
    "sr",
    "senior",
    "lead",
    "manager",
    "associate",
    "and",
    "or",
    "the",
    "a",
    "an",
    "of",
    "to",
    "in",
    "for",
    "with",
    "on",
}


def _norm_str(x: Any) -> str:
    return str(x or "").strip()


def _tokenize_title(title: str) -> List[str]:
    s = (title or "").lower()
    tokens = [t for t in re.split(r"[^a-z0-9]+", s) if t and len(t) > 1]
    return [t for t in tokens if t not in _STOPWORDS]


def infer_work_type(location: str) -> str:
    """Infer work type from location text.

    Returns one of: remote|hybrid|onsite|unknown
    """
    s = (location or "").lower()
    if not s:
        return "unknown"
    if "hybrid" in s:
        return "hybrid"
    if "remote" in s or "wfh" in s or "work from home" in s:
        return "remote"
    return "onsite"


def infer_seniority(title: str) -> str:
    """Infer seniority from title text.

    Returns one of: junior|mid|senior|unknown
    """
    s = (title or "").lower()
    if not s:
        return "unknown"
    if any(k in s for k in ("senior", "sr ", " sr", "lead", "principal", "staff")):
        return "senior"
    if any(k in s for k in ("junior", "jr ", " jr", "entry", "fresher")):
        return "junior"
    return "mid"


def _as_list(x: Any) -> List[str]:
    if not x:
        return []
    if isinstance(x, list):
        return [str(i) for i in x if i is not None]
    return [str(x)]


def build_personal_preference_profile(
    *,
    candidate_id: str,
    interactions: Iterable[Mapping[str, Any]],
    internships_by_id: Mapping[str, Mapping[str, Any]],
    now: Optional[datetime] = None,
    max_items: int = 25,
) -> Dict[str, Any]:
    """Build a personal preference profile from internship interactions.

    `interactions` items should include at least:
    - internship_id
    - interaction_type: like|dislike
    - reason_tags: optional list

    The output is designed for storage in MongoDB.
    """
    now = now or datetime.utcnow()

    likes = 0
    dislikes = 0

    preferred_skills = Counter()
    avoided_skills = Counter()
    preferred_roles = Counter()
    avoided_roles = Counter()
    preferred_locations = Counter()
    avoided_locations = Counter()
    work_type_pref = Counter()
    seniority_pref = Counter()

    stipend_min_pref: Optional[float] = None
    low_stipend_floor: Optional[float] = None

    for row in interactions or []:
        iid = _norm_str(row.get("internship_id"))
        itype = _norm_str(row.get("interaction_type") or row.get("type")).lower()
        tags = _as_list(row.get("reason_tags"))

        internship = internships_by_id.get(iid)
        if not internship:
            continue

        title = _norm_str(internship.get("title"))
        location = _norm_str(internship.get("location"))
        skills = _as_list(internship.get("skills_required"))
        stipend = internship.get("stipend")

        # Default mild signal even without explicit reason tags.
        base = 1

        if itype == "like":
            likes += 1
            for t in _tokenize_title(title):
                preferred_roles[t] += base
            for s in skills:
                preferred_skills[str(s).strip().lower()] += 0  # only bump on explicit reasons

            wt = infer_work_type(location)
            if wt != "unknown":
                work_type_pref[wt] += base
            sen = infer_seniority(title)
            if sen != "unknown":
                seniority_pref[sen] += base

            if "Great location" in tags or "Perfect location" in tags:
                if location:
                    preferred_locations[location] += 2

            if "Skills match well" in tags:
                for s in skills:
                    preferred_skills[str(s).strip().lower()] += 2

            if "Perfect role fit" in tags or "Career relevant" in tags:
                for t in _tokenize_title(title):
                    preferred_roles[t] += 2

            if "Good stipend" in tags and isinstance(stipend, (int, float)):
                stipend_min_pref = max(float(stipend_min_pref or 0), float(stipend))

        elif itype == "dislike":
            dislikes += 1

            wt = infer_work_type(location)
            if wt != "unknown":
                work_type_pref[wt] -= base
            sen = infer_seniority(title)
            if sen != "unknown":
                seniority_pref[sen] -= base

            if "Poor location" in tags:
                if location:
                    avoided_locations[location] += 2

            if "Skills mismatch" in tags:
                for s in skills:
                    avoided_skills[str(s).strip().lower()] += 2

            if "Role doesn't fit" in tags:
                for t in _tokenize_title(title):
                    avoided_roles[t] += 2

            if "Low stipend" in tags and isinstance(stipend, (int, float)):
                low_stipend_floor = max(float(low_stipend_floor or 0), float(stipend))

    # Normalize top-N lists
    def _top(counter: Counter, n: int) -> List[Tuple[str, float]]:
        items = [(k, float(v)) for k, v in counter.items() if k and v != 0]
        items.sort(key=lambda x: x[1], reverse=True)
        return items[:n]

    total = likes + dislikes
    strength = 0.0
    if total > 0:
        # 0..1 strength from interaction volume with diminishing returns.
        strength = min(1.0, (total / 10.0))

    profile = {
        "candidate_id": str(candidate_id),
        "updated_at": now,
        "counts": {"likes": likes, "dislikes": dislikes, "total": total},
        "strength": round(float(strength), 3),
        "skills": {
            "preferred": _top(preferred_skills, max_items),
            "avoided": _top(avoided_skills, max_items),
        },
        "roles": {
            "preferred": _top(preferred_roles, max_items),
            "avoided": _top(avoided_roles, max_items),
        },
        "locations": {
            "preferred": _top(preferred_locations, max_items),
            "avoided": _top(avoided_locations, max_items),
        },
        "work_type": _top(work_type_pref, 3),
        "seniority": _top(seniority_pref, 3),
        "stipend": {
            "min_preferred": float(stipend_min_pref) if stipend_min_pref is not None else None,
            "low_floor": float(low_stipend_floor) if low_stipend_floor is not None else None,
        },
    }

    return profile


def rebuild_and_save_personal_preference_profile(db, candidate_id: str) -> Optional[Dict[str, Any]]:
    """Load internship interactions + referenced internships from MongoDB, build profile, upsert it."""
    if db is None:
        return None

    interactions = list(db["internship_interactions"].find({"candidate_id": candidate_id}))
    internship_ids = [str(r.get("internship_id")) for r in interactions if r.get("internship_id")]
    internship_ids = list(dict.fromkeys([i for i in internship_ids if i]))

    internships_by_id: Dict[str, Dict[str, Any]] = {}
    if internship_ids:
        docs = list(
            db["internships"].find(
                {"internship_id": {"$in": internship_ids}},
                {"internship_id": 1, "title": 1, "location": 1, "skills_required": 1, "stipend": 1},
            )
        )
        for d in docs:
            iid = str(d.get("internship_id") or "")
            if iid:
                internships_by_id[iid] = d

    profile = build_personal_preference_profile(
        candidate_id=str(candidate_id),
        interactions=interactions,
        internships_by_id=internships_by_id,
    )

    db["personal_preference_profiles"].update_one(
        {"candidate_id": str(candidate_id)},
        {"$set": profile},
        upsert=True,
    )
    return profile


def load_personal_preference_profile(db, candidate_id: str) -> Optional[Dict[str, Any]]:
    if db is None:
        return None
    return db["personal_preference_profiles"].find_one({"candidate_id": str(candidate_id)})
