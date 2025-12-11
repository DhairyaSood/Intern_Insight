import sys
sys.path.insert(0, 'D:\\College Work\\github projects\\PM_Intern')

from pymongo import MongoClient
import os

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['internship_recommender']

# Check existing users
users = list(db.login_info.find())
print(f"Total users in database: {len(users)}")

for user in users:
    print(f"\nUsername: {user.get('username')}")
    pwd = user.get('password', '')
    print(f"Password hash: {pwd[:50]}...")
    print(f"Hash length: {len(pwd)}")
    print(f"Starts with $2b$ (bcrypt): {pwd.startswith('$2b$')}")
    print(f"Looks like SHA256 (64 chars): {len(pwd) == 64 and not pwd.startswith('$')}")
