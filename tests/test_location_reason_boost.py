#!/usr/bin/env python3

from app.core.ml_model import get_recommendations


def _score_by_id(recs):
    return {str(r.get("internship_id")): float(r.get("match_score") or 0) for r in (recs or [])}


def test_location_reason_boost_handles_compound_location_strings():
    # Base internship has a compound location string that previously could fail to normalize.
    internships = [
        {
            "internship_id": "A",
            "title": "Role A",
            "organization": "Org",
            "location": "Bangalore / Remote",
            "sector": "tech",
            "skills_required": [],
        },
        {
            "internship_id": "B",
            "title": "Role B",
            "organization": "Org",
            "location": "Bangalore",
            "sector": "tech",
            "skills_required": [],
        },
    ]

    candidate = {
        "skills_possessed": [],
        "sector_interests": [],
        "location_preference": "",
    }

    # Without interaction context, internship B should have no meaningful score.
    recs_no_ctx = get_recommendations(candidate, internships, top_n=None, dedupe_org=False)
    score_no_ctx = _score_by_id(recs_no_ctx).get("B", 0)

    # With a like reason tag for "Great location" on internship A,
    # internship B (same city) should receive a preference boost.
    internship_interactions = {
        "A": {"type": "like", "reason_tags": ["Great location"]}
    }
    recs_with_ctx = get_recommendations(
        candidate,
        internships,
        top_n=None,
        dedupe_org=False,
        internship_interactions=internship_interactions,
    )
    score_with_ctx = _score_by_id(recs_with_ctx).get("B", 0)

    assert score_with_ctx > score_no_ctx
