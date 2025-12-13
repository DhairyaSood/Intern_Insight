"""Bookmarks API endpoints

Bookmarks are per-user and persisted in MongoDB.
They are distinct from like/dislike interactions.

Collection: `bookmarks`
Document shape:
- candidate_id: str (from JWT)
- internship_id: str
- created_at: datetime
"""

from datetime import datetime

from app.core.database import db_manager
from app.utils.jwt_auth import token_required, get_current_user
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response


def _get_collection():
    db = db_manager.get_db()
    if db is None:
        return None
    return db["bookmarks"]


@token_required
def list_bookmarks():
    """List current user's bookmarked internship ids."""
    try:
        user = get_current_user() or {}
        candidate_id = user.get("candidate_id")
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)

        col = _get_collection()
        if col is None:
            return error_response("Database connection failed", 500)

        rows = list(col.find({"candidate_id": str(candidate_id)}, {"internship_id": 1}))
        ids = [str(r.get("internship_id")) for r in rows if r.get("internship_id")]
        return success_response({"bookmarks": ids})
    except Exception as e:
        app_logger.error(f"Error listing bookmarks: {e}")
        return error_response("Failed to list bookmarks", 500)


@token_required
def add_bookmark(internship_id):
    """Add bookmark for current user (idempotent)."""
    try:
        user = get_current_user() or {}
        candidate_id = user.get("candidate_id")
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)

        if not internship_id:
            return error_response("Internship ID is required", 400)

        col = _get_collection()
        if col is None:
            return error_response("Database connection failed", 500)

        col.update_one(
            {"candidate_id": str(candidate_id), "internship_id": str(internship_id)},
            {"$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )

        return success_response({"internship_id": str(internship_id), "bookmarked": True})
    except Exception as e:
        app_logger.error(f"Error adding bookmark {internship_id}: {e}")
        return error_response("Failed to add bookmark", 500)


@token_required
def remove_bookmark(internship_id):
    """Remove bookmark for current user (idempotent)."""
    try:
        user = get_current_user() or {}
        candidate_id = user.get("candidate_id")
        if not candidate_id:
            return error_response("Candidate ID not found in token", 400)

        if not internship_id:
            return error_response("Internship ID is required", 400)

        col = _get_collection()
        if col is None:
            return error_response("Database connection failed", 500)

        col.delete_one({"candidate_id": str(candidate_id), "internship_id": str(internship_id)})
        return success_response({"internship_id": str(internship_id), "bookmarked": False})
    except Exception as e:
        app_logger.error(f"Error removing bookmark {internship_id}: {e}")
        return error_response("Failed to remove bookmark", 500)
