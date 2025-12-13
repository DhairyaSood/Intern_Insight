#!/usr/bin/env python3

from app.utils.company_reputation import build_company_reputation_record


def test_company_reputation_score_moves_with_likes_dislikes_and_reasons():
    interactions = [
        {"interaction_type": "like", "reason_tags": ["Great company culture"]},
        {"interaction_type": "like", "reason_tags": ["Strong reputation"]},
        {"interaction_type": "dislike", "reason_tags": ["Toxic environment"]},
    ]

    rec = build_company_reputation_record(company_id="c1", interactions=interactions)

    assert rec["company_id"] == "c1"
    assert rec["counts"]["total"] == 3
    assert 0 <= rec["score"] <= 100

    # Net is still positive (2 likes vs 1 dislike) so should be above neutral.
    assert rec["score"] > 50
