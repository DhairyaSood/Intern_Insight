"""
Database Indexing Setup
Creates indexes for optimal query performance
"""
from app.core.database import DatabaseManager
from app.utils.logger import app_logger


def create_company_match_score_indexes():
    """
    Create indexes for company_match_scores collection
    """
    try:
        db_manager = DatabaseManager()
        db = db_manager.get_db()
        collection = db.company_match_scores
        
        # Create compound index for user-company lookups
        collection.create_index(
            [("candidate_id", 1), ("company_id", 1)],
            unique=True,
            name="idx_candidate_company"
        )
        app_logger.info("Created compound index: candidate_id + company_id")
        
        # Create index for company-based queries (batch updates)
        collection.create_index(
            [("company_id", 1)],
            name="idx_company"
        )
        app_logger.info("Created index: company_id")
        
        # Create index for sorting by match score
        collection.create_index(
            [("match_score", -1)],
            name="idx_match_score"
        )
        app_logger.info("Created index: match_score")
        
        # Create compound index for user's top matches
        collection.create_index(
            [("candidate_id", 1), ("match_score", -1)],
            name="idx_candidate_score"
        )
        app_logger.info("Created compound index: candidate_id + match_score")
        
        return {
            'success': True,
            'message': 'All indexes created successfully'
        }
        
    except Exception as e:
        app_logger.error(f"Error creating indexes: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def create_all_indexes():
    """
    Create all necessary database indexes
    """
    results = []
    
    # Company match scores indexes
    result = create_company_match_score_indexes()
    results.append({
        'collection': 'company_match_scores',
        'result': result
    })
    
    return results


if __name__ == '__main__':
    """
    Run this script to create all indexes
    Usage: python -m app.utils.db_indexes
    """
    print("Creating database indexes...")
    results = create_all_indexes()
    
    for item in results:
        print(f"\n{item['collection']}:")
        if item['result']['success']:
            print(f"  ✓ {item['result']['message']}")
        else:
            print(f"  ✗ Error: {item['result']['error']}")
    
    print("\nIndex creation complete!")
