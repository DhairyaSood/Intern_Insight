#!/usr/bin/env python3

from app.utils.preference_profile import build_personal_preference_profile


def test_preference_profile_learns_work_type_and_seniority():
    internships_by_id = {
        "1": {
            "internship_id": "1",
            "title": "Junior Data Analyst Intern",
            "location": "Mumbai / Remote",
            "skills_required": ["SQL", "Python"],
            "stipend": 15000,
        },
        "2": {
            "internship_id": "2",
            "title": "Senior ML Engineer Internship",
            "location": "Bangalore",
            "skills_required": ["Python", "ML"],
            "stipend": 8000,
        },
    }

    interactions = [
        {"internship_id": "1", "interaction_type": "like", "reason_tags": ["Great location", "Skills match well", "Good stipend"]},
        {"internship_id": "2", "interaction_type": "dislike", "reason_tags": ["Low stipend", "Role doesn't fit"]},
    ]

    profile = build_personal_preference_profile(
        candidate_id="cand",
        interactions=interactions,
        internships_by_id=internships_by_id,
    )

    assert profile["counts"]["total"] == 2
    assert profile["strength"] > 0

    # Work type should prefer remote (from Mumbai / Remote)
    wt = dict(profile["work_type"])
    assert "remote" in wt

    # Seniority should lean junior from the liked role title
    sen = dict(profile["seniority"])
    assert "junior" in sen

    # Preferred skills should include SQL/Python (from Skills match well)
    pref_skills = dict(profile["skills"]["preferred"])
    assert "python" in pref_skills
    assert "sql" in pref_skills
