# Interaction-Driven Match Updates (No Reload)

This document describes how internship/company match percentages update immediately in the UI after like/dislike interactions (with reason tags), without full-page refreshes.

## Goals

- No full-page reloads after like/dislike.
- Only the affected UI re-renders (match % badges, detail headers, etc.).
- Reason tags (e.g., **Great location**) influence future match scores for the same candidate.

## Backend: What Changes a Match Score

### Internship interactions (personal)

- Endpoints:
  - `POST /api/internships/<internship_id>/like`
  - `POST /api/internships/<internship_id>/dislike`
  - `DELETE /api/internships/<internship_id>/interaction`
- Payload:
  - `reason_tags`: array of strings
  - `reason_text`: optional free text
- Stored in: `internship_interactions` (per-candidate)

In addition, the backend maintains a persisted per-user profile:

- Collection: `personal_preference_profiles`
- Updated whenever a user likes/dislikes/removes an internship interaction
- Contains: inferred preferences (skills, role tokens, locations, work-type, seniority, stipend thresholds)

Reason tags are used by the ML scoring logic (`app/core/ml_model.py`) to learn **per-user patterns**. For location reasons:

- Like + `Great location` ⇒ boosts internships in the same city (and nearby cities via distance decay).
- Dislike + `Poor location` ⇒ penalizes internships in the same city (and nearby cities).

Important note: internship locations can be stored as compound strings (e.g., `"Bangalore / Remote"`). The city parsing logic normalizes these so the learned preference can match other internships in the same city.

### Company interactions (global signal)

- Endpoints:
  - `POST /api/companies/<company_id>/like`
  - `POST /api/companies/<company_id>/dislike`
  - `DELETE /api/companies/<company_id>/interaction`
- Stored in: `company_interactions`

In addition, the backend maintains a persisted global reputation record:

- Collection: `company_reputation`
- Updated whenever any user likes/dislikes/removes a company interaction
- Used as a global signal to nudge internship visibility for all users

Company interactions are treated as **global signals** used in the internship scoring model (aggregate sentiment + reason-tag nudges).

### Per-internship match endpoint

To fetch a match score for a single internship (without being limited by the current recommendation list size):

- `GET /api/recommendations/<candidate_id>/match/<internship_id>`

This endpoint scores the target internship using the ML model while including the candidate’s interacted internships in the scoring pool so reason-tag learning (including location) can apply.

## Frontend: How Match % Updates Without Reload

### Centralized match cache (Zustand)

- Store: `frontend/src/store/matchStore.js`
- Caches:
  - Internship match % by internship id (per candidate)
  - Company match % by company id

UI components subscribe by id, so only the relevant cards/headers re-render when a single match % updates.

### Interaction events

After a like/dislike is saved, the UI dispatches events:

- `internship-interaction-changed`
- `company-interaction-changed`

Pages listen for these events and refresh only the visible ids (and typically do a short retry sequence to handle eventual consistency).

### Reviews cache (optional but related)

- Store: `frontend/src/store/reviewStore.js`

Detail pages use the store so helpful/delete updates stay in sync without refetching whole pages.

## Expected Behavior (Example)

1. User likes Internship A with reason `Great location`.
2. The UI immediately:
   - Updates Internship A’s own match %.
   - Refreshes other visible internships’ match % (especially those in the same location).
3. Internships in the same city as A should see a small but noticeable increase due to learned location preference.

## Files to Know

- Backend:
  - `app/api/internship_interactions.py`
  - `app/api/recommendations.py`
  - `app/core/ml_model.py`
  - `app/utils/company_match_scorer.py`
- Frontend:
  - `frontend/src/store/matchStore.js`
  - `frontend/src/components/Common/InteractionReasonModal.jsx`
  - `frontend/src/components/Company/LikeDislikeButton.jsx`
  - `frontend/src/pages/InternshipsPage.jsx`
  - `frontend/src/pages/RecommendationsPage.jsx`
