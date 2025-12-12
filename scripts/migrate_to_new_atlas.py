"""
MongoDB Atlas Migration Script
Migrates ONLY internship data from JSON files to MongoDB Atlas
Users will create their own accounts through signup/registration
"""

import os
import json
import sys
from datetime import datetime
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    MONGO_URI = os.getenv("MONGO_URI")  # Fallback to MONGO_URI
if not MONGO_URI:
    print("❌ Error: MONGODB_URI or MONGO_URI not found in environment variables")
    print("Please set MONGODB_URI in your .env file")
    sys.exit(1)

DATABASE_NAME = os.getenv("DB_NAME", "internships")

# Data file paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

FILES = {
    "internships": DATA_DIR / "internships.json"
}

# Collection mappings (matching existing code structure)
COLLECTIONS = {
    "internships": "internships"
}


def load_json_file(filepath):
    """Load and parse JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found - {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {filepath} - {e}")
        return None


def create_indexes(db):
    """Create database indexes for performance"""
    print("\n📊 Creating indexes...")
    
    try:
        # Internships indexes
        db.internships.create_index([("internship_id", ASCENDING)], unique=True)
        db.internships.create_index([("organization", ASCENDING)])
        db.internships.create_index([("location", ASCENDING)])
        db.internships.create_index([("sector", ASCENDING)])
        db.internships.create_index([("application_deadline", ASCENDING)])
        print("✅ Internships indexes created")
        
        # Authentication collection indexes (will be used by signup/login)
        db.login_info.create_index([("username", ASCENDING)], unique=True)
        print("✅ login_info indexes created")
        
        # Profiles collection indexes (will be populated when users create profiles)
        db.profiles.create_index([("username", ASCENDING)], unique=True)
        db.profiles.create_index([("candidate_id", ASCENDING)], unique=True)
        print("✅ profiles indexes created")
        
    except Exception as e:
        print(f"⚠️  Warning: Index creation issue - {e}")


def migrate_data(drop_existing=False):
    """Main migration function"""
    print("=" * 60)
    print("🚀 MongoDB Atlas Migration Script")
    print("=" * 60)
    
    # Connect to MongoDB
    print(f"\n📡 Connecting to MongoDB Atlas...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("✅ Connected successfully")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    db = client[DATABASE_NAME]
    
    # Drop existing collections if requested
    if drop_existing:
        print("\n🗑️  Dropping existing collections...")
        for collection_name in COLLECTIONS.values():
            if collection_name in db.list_collection_names():
                db[collection_name].drop()
                print(f"   Dropped: {collection_name}")
    
    # Load data files
    print("\n📂 Loading data files...")
    internships_data = load_json_file(FILES["internships"])
    
    if not internships_data:
        print("❌ Failed to load internships data file")
        sys.exit(1)
    
    print(f"   ✅ Loaded {len(internships_data)} internships")
    print(f"\n💡 Note: Users will be created through signup/registration")
    print(f"   - login_info collection: Created on first signup")
    print(f"   - profiles collection: Created when users fill their profile")
    
    # Insert data
    print("\n📥 Inserting data into MongoDB...")
    
    results = {
        "internships": 0,
        "errors": []
    }
    
    # Insert internships
    try:
        if internships_data:
            result = db.internships.insert_many(internships_data)
            results["internships"] = len(result.inserted_ids)
            print(f"   ✅ Inserted {results['internships']} internships")
    except Exception as e:
        error_msg = f"Internships insertion error: {e}"
        results["errors"].append(error_msg)
        print(f"   ❌ {error_msg}")
    
    # Create indexes
    create_indexes(db)
    
    # Validation
    print("\n🔍 Validating data...")
    actual_internships = db.internships.count_documents({})
    
    print(f"   Database internships count: {actual_internships}")
    
    # Check collection structure
    print(f"\n📋 Collections in database:")
    collections = db.list_collection_names()
    for coll in collections:
        count = db[coll].count_documents({})
        print(f"   - {coll}: {count} documents")
    
    # Final report
    print("\n" + "=" * 60)
    print("📊 MIGRATION SUMMARY")
    print("=" * 60)
    print(f"✅ Internships migrated: {results['internships']}/{len(internships_data)}")
    print(f"\n💡 User Management:")
    print(f"   - Users will create accounts via signup endpoint")
    print(f"   - Profiles will be created when users fill their information")
    print(f"   - Collections: login_info, profiles (auto-created on first use)")
    
    if results["errors"]:
        print(f"\n⚠️  Errors encountered: {len(results['errors'])}")
        for error in results["errors"]:
            print(f"   - {error}")
    else:
        print("\n✨ Migration completed successfully with no errors!")
    
    print(f"\nDatabase: {DATABASE_NAME}")
    print(f"Primary Collections: internships, login_info, profiles")
    print("=" * 60)
    
    client.close()


def print_setup_instructions():
    """Print setup instructions for testing"""
    print("\n" + "=" * 60)
    print("🚀 NEXT STEPS - USER REGISTRATION")
    print("=" * 60)
    print("\n1. Start your backend server:")
    print("   python run.py")
    print("\n2. Start your frontend:")
    print("   cd frontend")
    print("   npm start")
    print("\n3. Create test accounts via Signup page:")
    print("   - Go to http://localhost:3000/signup")
    print("   - Create accounts with username/password")
    print("   - Fill profile information after login")
    print("\n4. Verify internships are loading:")
    print("   - Go to http://localhost:3000/internships")
    print("   - Should see 50 internships from database")
    print("\n💡 Tip: All user data will be created fresh through the UI")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate internship data to MongoDB Atlas")
    parser.add_argument(
        "--drop", 
        action="store_true", 
        help="Drop existing collections before migration"
    )
    parser.add_argument(
        "--show-instructions",
        action="store_true",
        help="Display setup instructions after migration"
    )
    
    args = parser.parse_args()
    
    # Confirm before dropping
    if args.drop:
        confirm = input("⚠️  Are you sure you want to drop existing data? (yes/no): ")
        if confirm.lower() != "yes":
            print("Migration cancelled")
            sys.exit(0)
    
    # Run migration
    migrate_data(drop_existing=args.drop)
    
    # Show setup instructions
    if args.show_instructions or args.drop:
        print_setup_instructions()
