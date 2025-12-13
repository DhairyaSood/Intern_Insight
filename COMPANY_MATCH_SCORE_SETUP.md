# Company Match Score & Reputation System - Setup Instructions

## Overview
Intern Insight maintains two related (but different) company signals:

1) **Company match score (personal)**
- A per-user score stored in `company_match_scores`.
- Used to show a “match %” badge on company-related UI.
- Calculated/cached by `app/utils/company_match_scorer.py`.

2) **Company reputation (global)**
- A global score stored in `company_reputation` and denormalized onto `companies`.
- Built from *all users’* company interactions (like/dislike + reason tags).
- Used as a global signal that can nudge internship match scoring.

## Database Indexes Setup

To ensure optimal performance, create the necessary MongoDB indexes:

### Method 1: Run the index creation script
```bash
python -m app.utils.db_indexes
```

### Method 2: Manual index creation in MongoDB shell
```javascript
use your_database_name

// Create indexes for company_match_scores collection (per-user cache)
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

// Create indexes for personal_preference_profiles (per-user)
db.personal_preference_profiles.createIndex(
  { "candidate_id": 1 },
  { unique: true, name: "idx_candidate_id" }
);

// Create indexes for company_reputation (global)
db.company_reputation.createIndex(
  { "company_id": 1 },
  { unique: true, name: "idx_company_id" }
);
```

## Features Implemented

### 1. **Company Match Score Calculation (Personal)**
The per-user company match score is computed by backend logic (`CompanyMatchScorer`) and cached in MongoDB.

Important: the exact weighting is not treated as a permanently fixed formula; it may evolve as more signals are added.

### 2. **Automatic Updates**

**Company match score (personal)** is recalculated for the current user when they:
- Like/dislike a company
- Review a company
- Like/dislike an internship from that company
- Review an internship from that company

**Company reputation (global)** is rebuilt when anyone likes/dislikes that company.

### 3. **Global Impact System (Company Match Scores)**
When a user likes/dislikes a company, the backend can also apply a small global adjustment to *other users’ cached company match scores* for that company:
- Like: +2 points
- Dislike: -2 points
- Review: +3 / 0 / -3 depending on rating (with decay based on review volume)

This is implemented in `CompanyMatchScorer.apply_global_impact(...)`.

### 4. **Global Company Reputation**
In addition to the cached per-user match score, the backend maintains a global `company_reputation` score (0–100, neutral ~50) built from aggregate like/dislike sentiment plus a small reason-tag nudge.

This is implemented in `app/utils/company_reputation.py` and denormalized onto `companies` as:
- `reputation_score`
- `reputation_counts`
- `reputation_updated_at`

### 5. **Frontend Display**
Match scores are displayed on:
- **Company Detail Page**: Shows personalized match score badge
- Badge includes green gradient background with match percentage

### 6. **API Endpoints**
Endpoints available:
- `GET /api/companies/<company_id>/match-score` - Get match score for a company
- `POST /api/companies/<company_id>/recalculate-score` - Recalculate user's score
- `POST /api/companies/<company_id>/recalculate-all` - Recalculate for all users
- `POST /api/companies/match-scores/batch` - Get scores for multiple companies
- `GET /api/companies/top-matches` - Get user's top matched companies

### 7. **MyInteractionsPage UI Update**
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

### personal_preference_profiles
```javascript
{
  candidate_id: String,
  updated_at: DateTime,
  counts: { likes: Number, dislikes: Number, total: Number },
  strength: Number,            // 0..1
  skills: { preferred: [[String, Number]], avoided: [[String, Number]] },
  roles: { preferred: [[String, Number]], avoided: [[String, Number]] },
  locations: { preferred: [[String, Number]], avoided: [[String, Number]] },
  work_type: [[String, Number]],
  seniority: [[String, Number]],
  stipend: { min_preferred: Number|null, low_floor: Number|null }
}
```

### company_reputation
```javascript
{
  company_id: String,
  updated_at: DateTime,
  counts: { like: Number, dislike: Number, total: Number },
  score: Number               // 0..100 (neutral ~50)
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
