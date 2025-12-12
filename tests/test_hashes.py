import sys
sys.path.insert(0, 'D:\\College Work\\github projects\\PM_Intern')

import bcrypt
import hashlib
from werkzeug.security import check_password_hash

# Test password verification with different formats
test_password = "kagstro"

# SHA-256 hash from database
sha256_hash = "645e2c593eaf916c217b40219f24eef72f755e20673fc0687b30c949ec0a7f42"

# Test SHA-256
computed_sha256 = hashlib.sha256(test_password.encode()).hexdigest()
print(f"Password: {test_password}")
print(f"SHA-256 from DB: {sha256_hash}")
print(f"SHA-256 computed: {computed_sha256}")
print(f"SHA-256 match: {computed_sha256 == sha256_hash}")

# Test bcrypt hash from database
bcrypt_hash = "$2b$12$qJTOl9hOjtFW9c.gU1KC3ur0yoRCG2RWVcH3RBTMhw2lc1xOAIe2e"
test_password2 = "sanchi101"  # Replace with actual password

print(f"\nTesting bcrypt with password: {test_password2}")
try:
    bcrypt_match = bcrypt.checkpw(test_password2.encode('utf-8'), bcrypt_hash.encode('utf-8'))
    print(f"Bcrypt match: {bcrypt_match}")
except Exception as e:
    print(f"Bcrypt error: {e}")

# Test scrypt
scrypt_hash = "scrypt:32768:8:1$AIvF0c4nZ9LGgXy1$c925682e6c1c863bd2ca80e18e5e71bf5de71cd02af4f1e39c5e1e2e75ef74cd1a0b6ef45a0edc9f46668c44ec5085a81c68b0a91db31e81ba7adef10f49e2e6"
test_password3 = "newuser2"  # Replace with actual password

print(f"\nTesting scrypt with password: {test_password3}")
try:
    scrypt_match = check_password_hash(scrypt_hash, test_password3)
    print(f"Scrypt match: {scrypt_match}")
except Exception as e:
    print(f"Scrypt error: {e}")
