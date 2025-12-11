"""
Authentication API routes with JWT
Modern token-based authentication for Intern Insight
"""
from flask import request
from app.core.database import db_manager
from app.utils.response_helpers import success_response, error_response
from app.utils.logger import app_logger
from app.utils.jwt_auth import generate_token, token_required, get_current_user
import bcrypt
import hashlib
from werkzeug.security import check_password_hash

def hash_password(password):
    """Hash password using bcrypt with salt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, hashed):
    """Verify password against multiple hash formats for backward compatibility"""
    try:
        # Try bcrypt first (new format - starts with $2b$)
        if hashed.startswith('$2b$') or hashed.startswith('$2a$'):
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        
        # Try Werkzeug scrypt (starts with scrypt:)
        if hashed.startswith('scrypt:'):
            return check_password_hash(hashed, password)
        
        # Try SHA-256 (old format - 64 character hex string)
        if len(hashed) == 64 and not hashed.startswith('$'):
            sha256_hash = hashlib.sha256(password.encode()).hexdigest()
            return sha256_hash == hashed
        
        return False
    except Exception as e:
        app_logger.error(f"Password verification error: {e}")
        return False

def signup():
    """User registration with JWT"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", 400)
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        # Validation
        if not username or not password:
            return error_response("Username and password are required", 400)
        
        if len(username) < 3:
            return error_response("Username must be at least 3 characters", 400)
        
        if len(password) < 6:
            return error_response("Password must be at least 6 characters", 400)
        
        hashed_password = hash_password(password)
        
        # Check if user already exists
        db = db_manager.get_db()
        if db is None:
            return error_response("Database connection failed", 500)
        
        existing_user = db.login_info.find_one({"username": username})
        if existing_user:
            return error_response("Username already exists", 409)
        
        # Create new user
        user_doc = {
            "username": username,
            "password": hashed_password,
        }
        
        result = db.login_info.insert_one(user_doc)
        candidate_id = str(result.inserted_id)
        
        app_logger.info(f"User {username} registered successfully")
        
        return success_response(
            {
                "username": username,
                "candidate_id": candidate_id,
                "message": "Account created successfully"
            },
            "Signup successful"
        )
        
    except Exception as e:
        app_logger.error(f"Signup error: {e}")
        import traceback
        app_logger.error(f"Traceback: {traceback.format_exc()}")
        return error_response(f"Internal server error during signup: {str(e)}", 500)

def login():
    """User login with JWT token generation"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", 400)
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return error_response("Username and password are required", 400)
        
        # Verify credentials
        db = db_manager.get_db()
        if db is None:
            return error_response("Database connection failed", 500)
        
        user = db.login_info.find_one({"username": username})
        
        if not user:
            app_logger.warning(f"Login attempt for non-existent user: {username}")
            return error_response("Invalid username or password", 401)
        
        stored_hash = user.get('password', '')
        app_logger.info(f"Login attempt for {username}, hash type: {stored_hash[:10]}..., length: {len(stored_hash)}")
        
        password_valid = verify_password(password, stored_hash)
        app_logger.info(f"Password verification result for {username}: {password_valid}")
        
        if not password_valid:
            return error_response("Invalid username or password", 401)
        
        candidate_id = str(user['_id'])
        
        # Generate JWT token
        token = generate_token({
            'username': username,
            'candidate_id': candidate_id
        })
        
        app_logger.info(f"User {username} logged in successfully")
        
        return success_response(
            {
                "token": token,
                "username": username,
                "candidate_id": candidate_id,
                "logged_in": True
            },
            "Login successful"
        )
        
    except Exception as e:
        app_logger.error(f"Login error: {e}")
        return error_response("Internal server error during login", 500)

def logout():
    """User logout (client-side token deletion)"""
    try:
        # With JWT, logout is handled client-side by deleting the token
        return success_response(
            {"logged_out": True},
            "Logout successful"
        )
    except Exception as e:
        app_logger.error(f"Logout error: {e}")
        return error_response("Internal server error during logout", 500)

@token_required
def check_login_status():
    """Check authentication status using JWT"""
    try:
        user = get_current_user()
        
        return success_response({
            "logged_in": True,
            "username": user['username'],
            "candidate_id": user['candidate_id']
        })
        
    except Exception as e:
        app_logger.error(f"Status check error: {e}")
        return error_response("Failed to check login status", 500)

@token_required
def verify():
    """Verify JWT token validity"""
    try:
        user = get_current_user()
        return success_response({
            "valid": True,
            "user": user
        })
    except Exception as e:
        return error_response("Token verification failed", 401)
