"""
Quick test script to verify MongoDB migration was successful
Run this after migration to check everything is working
"""

import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.core.database import db_manager
    from dotenv import load_dotenv
    
    load_dotenv()
    
    print("=" * 60)
    print("🔍 MongoDB Migration Verification")
    print("=" * 60)
    
    # Test database connection
    print("\n1. Testing database connection...")
    db = db_manager.get_db()
    
    if db is None:
        print("   ❌ Failed to connect to MongoDB")
        print("   → Check your MONGO_URI in .env file")
        sys.exit(1)
    else:
        print("   ✅ Successfully connected to MongoDB")
    
    # Check internships collection
    print("\n2. Checking internships collection...")
    internship_count = db.internships.count_documents({})
    
    if internship_count == 0:
        print(f"   ❌ No internships found in database")
        print("   → Run migration: python scripts/migrate_to_new_atlas.py --drop")
        sys.exit(1)
    else:
        print(f"   ✅ Found {internship_count} internships")
        
        # Show sample internship
        sample = db.internships.find_one()
        if sample:
            print(f"\n   Sample internship:")
            print(f"   - ID: {sample.get('internship_id')}")
            print(f"   - Title: {sample.get('title')}")
            print(f"   - Organization: {sample.get('organization')}")
            print(f"   - Location: {sample.get('location')}")
            print(f"   - Stipend: {sample.get('stipend')}")
    
    # Check login_info collection
    print("\n3. Checking login_info collection...")
    user_count = db.login_info.count_documents({})
    print(f"   ℹ️  Found {user_count} users (will grow as users signup)")
    
    # Check profiles collection
    print("\n4. Checking profiles collection...")
    profile_count = db.profiles.count_documents({})
    print(f"   ℹ️  Found {profile_count} profiles (will grow as users fill profiles)")
    
    # Check indexes
    print("\n5. Checking indexes...")
    
    # Internships indexes
    internship_indexes = list(db.internships.list_indexes())
    print(f"   ✅ Internships has {len(internship_indexes)} indexes")
    
    # Login info indexes
    login_indexes = list(db.login_info.list_indexes())
    print(f"   ✅ login_info has {len(login_indexes)} indexes")
    
    # Profiles indexes
    profile_indexes = list(db.profiles.list_indexes())
    print(f"   ✅ profiles has {len(profile_indexes)} indexes")
    
    # List all collections
    print("\n6. Database collections:")
    collections = db.list_collection_names()
    for coll_name in collections:
        count = db[coll_name].count_documents({})
        print(f"   - {coll_name}: {count} documents")
    
    # Final summary
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    
    if internship_count >= 50:
        print("✅ Migration successful!")
        print(f"✅ {internship_count} internships loaded")
        print("✅ Database connection working")
        print("✅ Indexes created")
        print("\n💡 Next steps:")
        print("   1. Start backend: python run.py")
        print("   2. Start frontend: cd frontend && npm start")
        print("   3. Create account at http://localhost:3000/signup")
        print("   4. Browse internships at http://localhost:3000/internships")
    else:
        print(f"⚠️  Warning: Only {internship_count} internships found")
        print("   Expected: 50 internships")
        print("   → Re-run migration: python scripts/migrate_to_new_atlas.py --drop")
    
    print("=" * 60)

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("\n💡 Make sure you have installed required packages:")
    print("   pip install pymongo python-dotenv")
    sys.exit(1)

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)
