"""
Script to update MongoDB database schema for interaction reason tracking
Adds reason_tags and reason_text fields to existing interactions
Creates indexes for better performance
"""

import os
import sys
from pymongo import MongoClient, ASCENDING
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Config

def update_interaction_schema():
    """
    Update company_interactions collection to add reason fields
    Create internship_interactions collection with proper schema
    """
    print("Connecting to MongoDB...")
    client = MongoClient(Config.MONGO_URI)
    db = client[Config.DB_NAME]
    
    print(f"Connected to database: {Config.DB_NAME}")
    
    # Update existing company_interactions
    print("\n=== Updating company_interactions collection ===")
    company_interactions = db['company_interactions']
    
    # Add reason fields to existing documents
    result = company_interactions.update_many(
        {'reason_tags': {'$exists': False}},
        {'$set': {
            'reason_tags': [],
            'reason_text': ''
        }}
    )
    print(f"Updated {result.modified_count} existing company interaction documents")
    
    # Create indexes for company_interactions
    print("\nCreating indexes for company_interactions...")
    company_interactions.create_index([('candidate_id', ASCENDING), ('company_id', ASCENDING)], unique=True)
    company_interactions.create_index([('candidate_id', ASCENDING)])
    company_interactions.create_index([('company_id', ASCENDING)])
    company_interactions.create_index([('interaction_type', ASCENDING)])
    company_interactions.create_index([('timestamp', ASCENDING)])
    print("Indexes created successfully")
    
    # Create internship_interactions collection if it doesn't exist
    print("\n=== Creating internship_interactions collection ===")
    if 'internship_interactions' not in db.list_collection_names():
        db.create_collection('internship_interactions')
        print("Created internship_interactions collection")
    else:
        print("internship_interactions collection already exists")
    
    internship_interactions = db['internship_interactions']
    
    # Create indexes for internship_interactions
    print("\nCreating indexes for internship_interactions...")
    internship_interactions.create_index([('candidate_id', ASCENDING), ('internship_id', ASCENDING)], unique=True)
    internship_interactions.create_index([('candidate_id', ASCENDING)])
    internship_interactions.create_index([('internship_id', ASCENDING)])
    internship_interactions.create_index([('interaction_type', ASCENDING)])
    internship_interactions.create_index([('timestamp', ASCENDING)])
    print("Indexes created successfully")
    
    # Add sample document structure (commented out - for reference)
    print("\n=== Sample Document Structures ===")
    print("\ncompany_interactions schema:")
    print({
        'candidate_id': 'string',
        'company_id': 'string',
        'interaction_type': 'like|dislike',
        'timestamp': 'datetime',
        'reason_tags': ['string'],
        'reason_text': 'string'
    })
    
    print("\ninternship_interactions schema:")
    print({
        'candidate_id': 'string',
        'internship_id': 'string',
        'interaction_type': 'like|dislike',
        'timestamp': 'datetime',
        'reason_tags': ['string'],
        'reason_text': 'string'
    })
    
    # Print statistics
    print("\n=== Collection Statistics ===")
    company_count = company_interactions.count_documents({})
    internship_count = internship_interactions.count_documents({})
    
    print(f"Company interactions: {company_count} documents")
    print(f"Internship interactions: {internship_count} documents")
    
    # Show sample documents if they exist
    if company_count > 0:
        print("\nSample company interaction:")
        sample = company_interactions.find_one()
        if sample:
            sample.pop('_id', None)
            for key, value in sample.items():
                print(f"  {key}: {value}")
    
    print("\n=== Migration Complete ===")
    print("Database schema updated successfully!")
    
    client.close()

if __name__ == '__main__':
    try:
        update_interaction_schema()
    except Exception as e:
        print(f"\nError during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
