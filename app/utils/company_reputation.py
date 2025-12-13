"""Global company reputation (all users).

This aggregates company like/dislike interactions into a persisted reputation
record. The ML scorer can use this as a global signal instead of recomputing
aggregations on every request.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional


_REASON_WEIGHTS = {
    # positive
    "Great company culture": 1.0,
    "Excellent benefits": 0.8,
    "Good work-life balance": 1.0,
    "Strong reputation": 1.0,
    "Innovation focused": 0.7,
    "Learning opportunities": 0.9,
    "Career growth potential": 0.9,
    "Good management": 0.8,
    # negative
    "Poor work culture": -1.0,
    "Inadequate benefits": -0.8,
    "Bad work-life balance": -1.0,
    "Negative reviews": -0.9,
    "Limited growth": -0.8,
    "Poor management": -0.9,
    "Low compensation": -0.7,
    "Toxic environment": -1.2,
}


def _score_from_counts(like_count: int, dislike_count: int) -> float:
    total = max(0, int(like_count)) + max(0, int(dislike_count))
    if total <= 0:
        return 50.0
    # Neutral 50, shift by net sentiment with bounded range.
    sentiment = (float(like_count) - float(dislike_count)) / float(total)  # [-1, 1]
    return float(max(0.0, min(100.0, 50.0 + (sentiment * 40.0))))


def build_company_reputation_record(
    *,
    company_id: str,
    interactions: Iterable[Mapping[str, Any]],
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    now = now or datetime.utcnow()

    like_count = 0
    dislike_count = 0
    reason_net = 0.0
    reason_total = 0

    for row in interactions or []:
        itype = str(row.get("interaction_type") or "").lower().strip()
        tags = row.get("reason_tags") or []
        if itype == "like":
            like_count += 1
        elif itype == "dislike":
            dislike_count += 1

        if isinstance(tags, list):
            for t in tags:
                w = _REASON_WEIGHTS.get(str(t))
                if w is None:
                    continue
                reason_net += float(w)
                reason_total += 1

    base = _score_from_counts(like_count, dislike_count)

    # Small reason-tag nudge scaled by how many reason-tags exist.
    reason_adj = 0.0
    if reason_total > 0:
        # normalize reason_net to [-1,1] by clamping
        x = max(-1.0, min(1.0, reason_net / max(3.0, float(reason_total))))
        reason_adj = x * 8.0  # max +/-8

    score = max(0.0, min(100.0, base + reason_adj))

    return {
        "company_id": str(company_id),
        "updated_at": now,
        "counts": {"like": like_count, "dislike": dislike_count, "total": like_count + dislike_count},
        "score": round(float(score), 2),
    }


def rebuild_and_save_company_reputation(db, company_id: str) -> Optional[Dict[str, Any]]:
    if db is None:
        return None

    interactions = list(db["company_interactions"].find({"company_id": str(company_id)}))
    rec = build_company_reputation_record(company_id=str(company_id), interactions=interactions)

    db["company_reputation"].update_one(
        {"company_id": str(company_id)},
        {"$set": rec},
        upsert=True,
    )

    # Also denormalize into companies for easy reads (safe additive fields).
    try:
        db["companies"].update_one(
            {"company_id": str(company_id)},
            {"$set": {"reputation_score": rec.get("score"), "reputation_counts": rec.get("counts"), "reputation_updated_at": rec.get("updated_at")}},
        )
    except Exception:
        pass

    return rec


def load_company_reputation(db, company_id: str) -> Optional[Dict[str, Any]]:
    if db is None:
        return None
    return db["company_reputation"].find_one({"company_id": str(company_id)})
