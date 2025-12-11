# app/api/profiles.py
"""
Profile management API endpoints
Handles user profile creation, updating, and retrieval
"""

from flask import request, jsonify
from app.core.database import db_manager
from app.utils.logger import app_logger
from app.utils.response_helpers import success_response, error_response
from app.utils.jwt_auth import token_required, get_current_user
import json
import os
import uuid
from datetime import datetime

def generate_candidate_id():
    """Generate a unique candidate ID"""
    return f"CAND_{uuid.uuid4().hex[:8]}"

@token_required
def create_or_update_profile():
    """Create or update user profile"""
    try:
        # Get authenticated user from JWT
        user = get_current_user()
        username = user.get('username')
        
        if not username:
            return error_response("Username not found in token", 401)
        
        data = request.get_json()
        if not data:
            return error_response("No profile data provided", 400)
        
        # Normalize field names (support both old and new formats)
        if 'skills' in data and 'skills_possessed' not in data:
            data['skills_possessed'] = data['skills']
        if 'location' in data and 'location_preference' not in data:
            data['location_preference'] = data['location']
        elif 'city' in data and 'location_preference' not in data:
            data['location_preference'] = data['city']
        if 'education' in data and 'education_level' not in data:
            data['education_level'] = data['education']
        
        # Validate required fields
        required_fields = ['name', 'skills_possessed', 'location_preference', 'education_level']
        for field in required_fields:
            if field not in data or not data[field]:
                return error_response(f"Field '{field}' is required", 400)
        
        # Check if profile already exists
        existing_profile = None
        candidate_id = None
        
        db = db_manager.get_db()
        if db is not None:
            try:
                existing_profile = db.profiles.find_one({"username": username})
                if existing_profile:
                    candidate_id = existing_profile.get('candidate_id')
            except Exception as e:
                app_logger.warning(f"MongoDB profile check failed: {e}")
        
        # Strict Atlas mode: do not read JSON files
        profile_index = None
        
        # Generate candidate_id if creating new profile
        if not candidate_id:
            candidate_id = generate_candidate_id()
        
        # Prepare profile data
        profile_data = {
            "candidate_id": candidate_id,
            "username": username,
            "name": data['name'],
            "email": data.get('email', ''),
            "phone": data.get('phone', ''),
            "skills_possessed": data['skills_possessed'] if isinstance(data['skills_possessed'], list) else [data['skills_possessed']],
            "location_preference": data['location_preference'],
            "education_level": data['education_level'],
            "field_of_study": data.get('field_of_study', ''),
            "experience": data.get('experience', ''),
            "sector_interests": data.get('sector_interests', []) if isinstance(data.get('sector_interests'), list) else [data.get('sector_interests', '')],
            "created_at": existing_profile.get('created_at', datetime.utcnow().isoformat()) if existing_profile else datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Save to MongoDB if available (upsert to avoid duplicates)
        if db is not None:
            try:
                db.profiles.update_one(
                    {"username": username},
                    {"$set": profile_data},
                    upsert=True
                )
                app_logger.info(f"Upserted profile for {username} in MongoDB")
            except Exception as e:
                app_logger.warning(f"Failed to save profile to MongoDB: {e}")
        
        return success_response(
            {
                "candidate_id": candidate_id,
                "username": username,
                "message": "Profile saved successfully"
            },
            "Profile saved successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Profile creation/update error: {e}")
        return error_response("Internal server error", 500)

def get_profile_by_username(username):
    """Get profile by username"""
    try:
        # Try MongoDB
        profile = None
        db = db_manager.get_db()
        if db is not None:
            try:
                profile = db.profiles.find_one({"username": username})
                if profile and '_id' in profile:
                    profile['_id'] = str(profile['_id'])  # Convert ObjectId to string
            except Exception as e:
                app_logger.warning(f"MongoDB profile retrieval failed: {e}")
        
        if not profile:
            return error_response("Profile not found", 404)
        
        return success_response(profile)
        
    except Exception as e:
        app_logger.error(f"Profile retrieval error: {e}")
        return error_response("Internal server error", 500)

def get_profile_by_candidate_id(candidate_id):
    """Get profile by candidate ID (or MongoDB _id)"""
    try:
        # Try MongoDB
        profile = None
        db = db_manager.get_db()
        if db is not None:
            try:
                # First try by candidate_id field
                profile = db.profiles.find_one({"candidate_id": candidate_id})
                
                # If not found, try by MongoDB _id (for backward compatibility)
                if not profile:
                    try:
                        from bson import ObjectId
                        if ObjectId.is_valid(candidate_id):
                            profile = db.profiles.find_one({"_id": ObjectId(candidate_id)})
                    except:
                        pass
                
                if profile and '_id' in profile:
                    profile['_id'] = str(profile['_id'])  # Convert ObjectId to string
            except Exception as e:
                app_logger.warning(f"MongoDB profile retrieval failed: {e}")
        
        if not profile:
            return error_response("Profile not found", 404)
        
        return success_response(profile)
        
    except Exception as e:
        app_logger.error(f"Profile retrieval error: {e}")
        return error_response("Internal server error", 500)