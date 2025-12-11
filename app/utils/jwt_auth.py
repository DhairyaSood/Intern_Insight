"""
JWT Authentication Utilities
Modern token-based authentication for Intern Insight
"""
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
import os

# Secret key for JWT - in production, use environment variable
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 24

def generate_token(user_data):
    """Generate JWT token for authenticated user"""
    payload = {
        'username': user_data['username'],
        'candidate_id': user_data['candidate_id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
        'iat': datetime.datetime.utcnow()
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        # Verify token
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.current_user = {
            'username': payload['username'],
            'candidate_id': payload['candidate_id']
        }
        
        return f(*args, **kwargs)
    
    return decorated

def get_current_user():
    """Get current authenticated user from request context"""
    return getattr(request, 'current_user', None)
