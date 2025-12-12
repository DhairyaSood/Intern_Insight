import jwt
print(f"JWT module: {jwt}")
print(f"Has encode: {hasattr(jwt, 'encode')}")
print(f"JWT file location: {jwt.__file__}")

# Test encode
try:
    token = jwt.encode({'test': 'data'}, 'secret', algorithm='HS256')
    print(f"Encode works! Token: {token[:50]}...")
except Exception as e:
    print(f"Encode failed: {e}")
