# Company Match Score System - Setup Instructions

## Overview
The company match score system has been fully implemented. This document explains how to set it up and use it.

## Database Indexes Setup

To ensure optimal performance, create the necessary MongoDB indexes:

### Method 1: Run the index creation script
```bash
cd "d:\College Work\github projects\PM_Intern"
python -m app.utils.db_indexes
```

### Method 2: Manual index creation in MongoDB shell
```javascript
use your_database_name

// Create indexes for company_match_scores collection
db.company_match_scores.createIndex(
  { "candidate_id": 1, "company_id": 1 },
  { unique: true, name: "idx_candidate_company" }
);

db.company_match_scores.createIndex(
  { "company_id": 1 },
  { name: "idx_company" }
);

db.company_match_scores.createIndex(
  { "match_score": -1 },
  { name: "idx_match_score" }
);

db.company_match_scores.createIndex(
  { "candidate_id": 1, "match_score": -1 },
  { name: "idx_candidate_score" }
);
```

## Features Implemented

### 1. **Company Match Score Calculation**
Scores are calculated based on 4 weighted factors:
- **40%** - Average internship match scores from company's internships
- **30%** - Direct company interactions (like/dislike)
- **20%** - User's company review rating
- **10%** - Indirect internship feedback (interactions/reviews on company's internships)

### 2. **Automatic Score Updates**
Scores are automatically recalculated when users:
- Like/dislike a company
- Review a company
- Like/dislike an internship from that company
- Review an internship from that company

### 3. **Global Impact System**
When users interact with companies, it affects other users' scores:
- **Like**: +2 points to others
- **Dislike**: -2 points to others
- **Positive review (4-5 stars)**: +3 points to others
- **Negative review (1-2 stars)**: -3 points to others
- Impact decays based on total review count (prevents manipulation)

### 4. **Frontend Display**
Match scores are displayed on:
- **Company Detail Page**: Shows personalized match score badge
- Badge includes green gradient background with match percentage

### 5. **API Endpoints**
New endpoints available:
- `GET /api/companies/<company_id>/match-score` - Get match score for a company
- `POST /api/companies/<company_id>/recalculate-score` - Recalculate user's score
- `POST /api/companies/<company_id>/recalculate-all` - Recalculate for all users
- `POST /api/companies/match-scores/batch` - Get scores for multiple companies
- `GET /api/companies/top-matches` - Get user's top matched companies

### 6. **MyInteractionsPage UI Update**
- 2-column grid layout for interactions and reviews
- "Load More" button for pagination (6 items at a time)
- Responsive design (mobile-friendly)
- Better card spacing and truncation

## Testing the System

1. **Start the backend server**:
```bash
python run.py
```

2. **Start the frontend**:
```bash
cd frontend
npm start
```

3. **Test the features**:
   - Navigate to a company detail page
   - You should see your match score (if you're logged in)
   - Like/dislike the company and see the score update
   - Review the company and watch the score change
   - Check "My Interactions" page for the new 2-column layout

## Performance Considerations

- Indexes are created for fast queries
- Scores are cached in database to avoid recalculation on every request
- Global impact uses batch updates for efficiency
- Scores are calculated on-demand if not in cache

## Future Enhancements (Optional)

- **Background job**: Schedule periodic recalculation for data consistency
- **Analytics**: Track score trends over time
- **Notifications**: Alert users when match scores improve significantly
- **Advanced filtering**: Allow users to search companies by match score range

## Database Collections

### company_match_scores
```javascript
{
  candidate_id: String,        // User identifier
  company_id: String,          // Company identifier
  match_score: Number,         // 0-100 score
  last_updated: DateTime,      // Timestamp of last calculation
  contributing_factors: {
    internship_scores: Number,
    company_interactions: Number,
    company_reviews: Number,
    internship_feedback: Number
  }
}
```

## Troubleshooting

### Scores not appearing?
- Ensure user is logged in
- Check if backend is running
- Verify MongoDB connection
- Check browser console for errors

### Slow performance?
- Run the index creation script
- Check MongoDB logs for slow queries
- Consider adding more indexes if needed

### Scores not updating?
- Check backend logs for errors
- Verify interaction endpoints are working
- Ensure score calculation function has no errors
