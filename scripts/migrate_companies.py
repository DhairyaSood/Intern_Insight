"""
Migration script to upload company data to MongoDB Atlas.
Creates a 'companies' collection in the internships database.
"""

import json
import os
import sys
from pymongo import MongoClient
from datetime import datetime

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    from app.config import get_config
    config = get_config()
    MONGO_URI = config.MONGO_URI
    DATABASE_NAME = config.DB_NAME
except ImportError:
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    DATABASE_NAME = os.getenv('DB_NAME', 'internships')

COLLECTION_NAME = "companies"

def migrate_companies():
    """Upload company data to MongoDB Atlas"""
    
    print("="*60)
    print("Company Data Migration to MongoDB Atlas")
    print("="*60)
    
    # Load company data
    print("\n[1/4] Loading company data from companies.json...")
    try:
        with open('data/companies.json', 'r', encoding='utf-8') as f:
            companies = json.load(f)
        print(f"✓ Loaded {len(companies)} companies")
    except FileNotFoundError:
        print("✗ Error: companies.json not found. Please run generate_company_data.py first.")
        return
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing JSON: {e}")
        return
    
    # Connect to MongoDB
    print("\n[2/4] Connecting to MongoDB Atlas...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        print("✓ Connected to MongoDB Atlas successfully")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        return
    
    # Access database and collection
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    print("\n[3/4] Clearing existing company data...")
    result = collection.delete_many({})
    print(f"✓ Deleted {result.deleted_count} existing documents")
    
    # Insert company data
    print("\n[4/4] Inserting company data...")
    try:
        result = collection.insert_many(companies)
        print(f"✓ Successfully inserted {len(result.inserted_ids)} companies")
    except Exception as e:
        print(f"✗ Error inserting data: {e}")
        client.close()
        return
    
    # Create indexes for better query performance
    print("\n[5/4] Creating indexes...")
    try:
        collection.create_index("company_id", unique=True)
        collection.create_index("name")
        collection.create_index("sector")
        collection.create_index("is_hiring")
        collection.create_index([("rating", -1)])
        print("✓ Indexes created successfully")
    except Exception as e:
        print(f"⚠ Warning: Error creating indexes: {e}")
    
    # Verify insertion
    print("\n" + "="*60)
    print("Verification")
    print("="*60)
    count = collection.count_documents({})
    print(f"Total companies in database: {count}")
    
    # Show sample companies
    print("\nSample companies:")
    for company in collection.find().limit(5):
        print(f"  - {company['name']} ({company['sector']}): {company['total_internships']} internships")
    
    # Show statistics
    print("\nDatabase Statistics:")
    sectors = collection.distinct("sector")
    print(f"  Unique sectors: {len(sectors)}")
    
    hiring_count = collection.count_documents({"is_hiring": True})
    print(f"  Companies hiring: {hiring_count}")
    
    avg_rating = list(collection.aggregate([
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]))
    if avg_rating:
        print(f"  Average rating: {avg_rating[0]['avg_rating']:.2f}")
    
    # Close connection
    client.close()
    print("\n" + "="*60)
    print("✓ Migration completed successfully!")
    print("="*60)

if __name__ == "__main__":
    migrate_companies()
