# Review System Implementation

## Overview
Complete implementation of the like/dislike/review system for companies and internships with intelligent ML-based pattern learning.

## ✅ Completed Features

### 1. Backend Architecture

#### Database Collections
- **company_interactions**
  - Fields: `candidate_id`, `company_id`, `interaction_type`, `timestamp`, `reason_tags`, `reason_text`
  - Indexes: (candidate_id, company_id) unique, candidate_id, company_id, interaction_type, timestamp
  
- **internship_interactions**
  - Fields: `candidate_id`, `internship_id`, `interaction_type`, `timestamp`, `reason_tags`, `reason_text`
  - Indexes: (candidate_id, internship_id) unique, candidate_id, internship_id, interaction_type, timestamp
  
- **company_reviews**
  - Complete review data with ratings, pros/cons, helpful votes
  
- **internship_reviews**
  - Review data with tags, recommendations, experience type

#### API Endpoints

**Company Interactions:**
- `POST /api/companies/<id>/like` - Like a company
- `POST /api/companies/<id>/dislike` - Dislike a company
- `DELETE /api/companies/<id>/interaction` - Remove interaction
- `GET /api/companies/<id>/interaction` - Get user's interaction
- `GET /api/companies/interactions` - Get all user interactions

**Internship Interactions:**
- `POST /api/internships/<id>/like` - Like an internship
- `POST /api/internships/<id>/dislike` - Dislike an internship
- `DELETE /api/internships/<id>/interaction` - Remove interaction
- `GET /api/internships/<id>/interaction` - Get user's interaction
- `GET /api/internships/interactions` - Get all user interactions

**Reviews:**
- `POST /api/companies/<id>/reviews` - Create/update company review
- `GET /api/companies/<id>/reviews` - Get company reviews
- `POST /api/internships/<id>/reviews` - Create/update internship review
- `GET /api/internships/<id>/reviews` - Get internship reviews
- `POST /api/reviews/<id>/helpful` - Mark review helpful
- `DELETE /api/reviews/<id>` - Delete review

### 2. Machine Learning Intelligence

#### 3-Tier Learning System

**Tier 1: Direct Internship Interactions**
- Like: +20% boost
- Dislike: -30% penalty
- Applied to specific internships

**Tier 2: Company-Level Learning**
- Like company: +15% boost to all company internships
- Dislike company: -20% penalty to all company internships

**Tier 3: Pattern-Based Learning** (NEW)
Analyzes dislike reasons to penalize similar internships:

**Location Matching:**
- Exact city match: -10% penalty
- Nearby city (<100km using distance matrix): -5% penalty
- Uses fuzzy string matching for city names

**Sector Matching:**
- Exact sector match: -15% penalty

**Stipend Learning:**
- Stipend at/below threshold: -8% penalty
- Stipend within 10% above threshold: -4% penalty
- Learns compensation expectations from dislikes

**Skills Matching:**
- 50%+ skill overlap: -12% penalty
- 30-50% skill overlap: -6% penalty
- Intelligently detects unwanted skill combinations

#### Pattern Extraction Logic
```python
disliked_patterns = {
    'locations': [],      # Cities to avoid
    'sectors': [],        # Industries to penalize
    'low_stipend': None,  # Compensation threshold
    'skills': []          # Unwanted skills
}
```

Reason tags trigger pattern learning:
- "Poor location" → Adds to locations list
- "Wrong sector" → Adds to sectors list
- "Stipend too low" → Sets stipend threshold
- "Skills mismatch" → Adds to skills list

### 3. Frontend Components

#### Review Components (734 lines total)

**ReviewForm.jsx** (324 lines)
- Modal for creating/editing reviews
- Entity-type aware (company vs internship)
- Company fields: title, review text, pros, cons
- Internship fields: review text, tags, recommendation, experience type
- Star rating with hover effects
- Validation (min 20 chars, rating required)
- Error handling and loading states

**ReviewCard.jsx** (169 lines)
- Individual review display
- Shows rating, verified badge, pros/cons or tags
- Helpful button with vote count
- Delete button for own reviews (checks candidate_id)
- Relative date formatting
- Entity-type aware rendering

**ReviewList.jsx** (122 lines)
- Review list with custom sort dropdown
- Sort options: recent, helpful, rating-high, rating-low
- Loading skeleton states
- Empty state with custom message
- Review count display
- Pagination ready

**ReviewStats.jsx** (119 lines)
- Overall rating display (5.0 format with stars)
- Rating distribution bars (5 to 1 stars)
- Percentage calculations for visual bars
- Quick stats: Positive/Neutral/Negative counts
- Color-coded stats (green/yellow/red)
- Empty state with star icon

#### Interaction Components

**LikeDislikeButton.jsx** (Enhanced)
- Unified component for both companies and internships
- Props: `companyId`, `internshipId`, `entityName`, `variant`
- Variants: 'heart' (filled heart icons) or 'icons' (thumbs up/down)
- Integrates with `InteractionReasonModal`
- Dynamic service selection based on entity type
- State management: interaction, isLoading, showReasonModal, pendingAction

**InteractionReasonModal.jsx**
- Modal for selecting dislike reasons
- Predefined reason tags
- Optional text explanation
- Used before recording dislike interactions

#### Page Integrations

**CompanyDetailPage.jsx**
- LikeDislikeButton in header (icons variant)
- Review section after company header
- ReviewStats showing rating distribution
- ReviewList with sorting and helpful votes
- "Write Review" button
- ReviewForm modal for creating reviews

**InternshipDetailPage.jsx**
- LikeDislikeButton in header (icons variant)
- Review section before similar internships
- ReviewStats showing rating distribution
- ReviewList with sorting and helpful votes
- "Write Review" button
- ReviewForm modal for creating reviews

**InternshipCard.jsx**
- LikeDislikeButton on cards (heart variant)
- Desktop: In action buttons div with bookmark
- Mobile: In title row next to bookmark

### 4. Service Layer

**reviewService** (frontend/src/services/reviews.js)
- `company.create(companyId, reviewData)` - Create company review
- `company.getAll(companyId, params)` - Get company reviews
- `internship.create(internshipId, reviewData)` - Create internship review
- `internship.getAll(internshipId, params)` - Get internship reviews
- `markHelpful(reviewId)` - Mark review helpful
- `delete(reviewId)` - Delete review

**companyInteractionService** (frontend/src/services/companyInteractions.js)
- `like(companyId, reasonData)` - Like company
- `dislike(companyId, reasonData)` - Dislike company
- `remove(companyId)` - Remove interaction
- `get(companyId)` - Get interaction
- `getUserInteractions()` - Get all user interactions

**internshipInteractionService** (frontend/src/services/internshipInteractions.js)
- `like(internshipId, reasonData)` - Like internship
- `dislike(internshipId, reasonData)` - Dislike internship
- `remove(internshipId)` - Remove interaction
- `get(internshipId)` - Get interaction
- `getUserInteractions()` - Get all user interactions

## Database Migration

**Script:** `scripts/add_interaction_fields.py`

Successfully executed migration that:
1. Added `reason_tags` and `reason_text` to company_interactions
2. Created internship_interactions collection
3. Added indexes for performance
4. Preserved existing data

## Build Status

✅ Frontend builds successfully
- Bundle size: 141.99 kB (+4.99 kB from review components)
- No compilation errors
- Only ESLint warnings (non-blocking)

## User Flow

### Like/Dislike Flow
1. User clicks like/dislike button
2. For dislike: InteractionReasonModal appears
3. User selects reason tags and optionally adds text
4. Interaction stored in database with reasons
5. ML model processes patterns on next recommendation fetch
6. Similar internships get penalized based on patterns

### Review Flow
1. User clicks "Write Review" button
2. ReviewForm modal opens
3. User fills in rating and fields (entity-type specific)
4. Review submitted to backend
5. Review appears in ReviewList
6. Other users can mark review helpful
7. Author can delete their own reviews

## Testing Checklist

### Company Detail Page
- [ ] LikeDislikeButton appears in header
- [ ] Clicking dislike shows reason modal
- [ ] Review section displays below company info
- [ ] ReviewStats shows rating distribution
- [ ] "Write Review" opens modal
- [ ] Submitting review updates list
- [ ] Marking review helpful increments count
- [ ] Deleting own review works

### Internship Detail Page
- [ ] LikeDislikeButton appears in header
- [ ] Review section displays before similar internships
- [ ] All review functionality works

### Internship Card
- [ ] LikeDislikeButton appears on cards
- [ ] Heart variant displays correctly
- [ ] Desktop and mobile layouts work

### ML Pattern Learning
- [ ] Disliking internship with "Poor location" penalizes same city
- [ ] Nearby cities get smaller penalty
- [ ] Disliking with "Wrong sector" penalizes sector
- [ ] Disliking with "Stipend too low" sets threshold
- [ ] Disliking with "Skills mismatch" penalizes similar skills
- [ ] Multiple patterns accumulate correctly

## Next Steps

1. **End-to-end testing** - Test complete flows in development environment
2. **Performance testing** - Verify ML model performance with patterns
3. **User testing** - Gather feedback on UI/UX
4. **Analytics** - Track interaction and review metrics
5. **Enhancements**:
   - Review pagination for companies with many reviews
   - Review filtering by rating/tags
   - Review editing for authors
   - Review photos/attachments
   - More sophisticated pattern learning (e.g., work culture preferences)

## Files Modified/Created

### Backend
- `app/api/internship_interactions.py` (NEW - 281 lines)
- `app/api/recommendations.py` (MODIFIED - added internship interaction fetch)
- `app/core/ml_model.py` (HEAVILY MODIFIED - 493 lines, added pattern learning)
- `app/api/__init__.py` (MODIFIED - registered internship interaction routes)
- `scripts/add_interaction_fields.py` (NEW - 130 lines)

### Frontend Components
- `frontend/src/components/Review/ReviewForm.jsx` (NEW - 324 lines)
- `frontend/src/components/Review/ReviewCard.jsx` (NEW - 169 lines)
- `frontend/src/components/Review/ReviewList.jsx` (NEW - 122 lines)
- `frontend/src/components/Review/ReviewStats.jsx` (NEW - 119 lines)
- `frontend/src/components/Company/LikeDislikeButton.jsx` (MODIFIED - dual entity support)
- `frontend/src/components/Internship/InternshipCard.jsx` (MODIFIED - added like/dislike)

### Frontend Pages
- `frontend/src/pages/CompanyDetailPage.jsx` (MODIFIED - integrated reviews)
- `frontend/src/pages/InternshipDetailPage.jsx` (MODIFIED - integrated reviews)

### Frontend Services
- `frontend/src/services/internshipInteractions.js` (NEW - 35 lines)
- `frontend/src/services/reviews.js` (ALREADY EXISTED)

## Key Architectural Decisions

1. **Separate Collections**: Company and internship interactions stored separately for flexibility
2. **Reason Tags**: Predefined tags enable structured pattern learning
3. **3-Tier ML**: Progressive learning from specific → company → patterns
4. **Entity-Type Aware Components**: Single component handles both companies and internships
5. **Client-Side Interaction**: Like/dislike on cards for quick feedback
6. **Detail Page Reviews**: Full review system only on detail pages
7. **Graduated Penalties**: Similarity-based penalty scaling (exact match > partial match)

## Performance Considerations

- Indexes on all interaction collections for fast queries
- Pattern learning only on recommendation fetch (lazy evaluation)
- Review pagination ready (limit/offset params)
- Frontend bundle optimized (4.99 KB increase for full review system)
- Fuzzy matching and distance calculations cached during recommendation generation

## Security Features

- JWT authentication on all interaction/review endpoints
- Candidate ID verification from token
- Own-review-only delete authorization
- SQL injection protection via MongoDB queries
- XSS protection via React's built-in escaping
