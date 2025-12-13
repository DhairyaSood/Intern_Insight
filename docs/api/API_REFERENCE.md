# API Reference

## Base URL
```
http://127.0.0.1:3000
```

## Endpoints
### Admin
- **GET** `/api/admin/db-stats`
- **Description**: Basic database diagnostics (connection status, Atlas-only flag, and collection counts)
- **Response**:
  ```json
  {
    "database": "connected",
    "atlas_only": true,
    "counts": { "profiles": 9, "internships": 500, "login_info": 11, "skills_synonyms": 480 }
  }
  ```


### Health Check
- **GET** `/health`
- **Description**: Check if the API is running
- **Response**: 
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "2.0.0"
  }
  ```

### Authentication
- **POST** `/api/auth/signup`
- **POST** `/api/auth/login` (aliases also available at `/signup` and `/login` for legacy clients)
- **POST** `/api/auth/logout` (alias also at `/logout`)
- **GET** `/api/auth/status`
- **Description**: User authentication
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response** (login/signup success):
 - **Response** (login/signup success):
  ```json
  { "message": "Login successful", "username": "string" }
  ```

### Internship Match (Single Item)
- **GET** `/api/recommendations/{candidate_id}/match/{internship_id}`
- **Description**: Fetch a match score for one internship for a candidate (used by the frontend cache to update match % without reloading).
- **Response**:
  ```json
  { "candidate_id": "CAND_xxxx", "internship_id": "INT001", "match_score": 87.5 }
  ```
- **Notes**:
  - Match score is computed dynamically based on available profile/resume data plus learned signals (see “Interactions” below).

### Interactions (Like/Dislike)

All interaction endpoints require authentication.

**Company Interactions:**
- **POST** `/api/companies/{company_id}/like`
- **POST** `/api/companies/{company_id}/dislike`
- **DELETE** `/api/companies/{company_id}/interaction`
- **GET** `/api/companies/{company_id}/interaction`
- **GET** `/api/companies/interactions`

**Internship Interactions:**
- **POST** `/api/internships/{internship_id}/like`
- **POST** `/api/internships/{internship_id}/dislike`
- **DELETE** `/api/internships/{internship_id}/interaction`
- **GET** `/api/internships/{internship_id}/interaction`
- **GET** `/api/internships/interactions`

**Request body (optional, for like/dislike):**
```json
{ "reason_tags": ["Great location"], "reason_text": "Optional free-text" }
```

### Company Match Scores
- **GET** `/api/companies/{company_id}/match-score`
- **POST** `/api/companies/{company_id}/recalculate-score`
- **POST** `/api/companies/{company_id}/recalculate-all`
- **POST** `/api/companies/match-scores/batch`
- **GET** `/api/companies/top-matches`

### Reviews
- **POST** `/api/companies/{company_id}/reviews`
- **GET** `/api/companies/{company_id}/reviews`
- **POST** `/api/internships/{internship_id}/reviews`
- **GET** `/api/internships/{internship_id}/reviews`
- **POST** `/api/reviews/{review_id}/helpful`
- **DELETE** `/api/reviews/{review_id}`

### Profiles
- **POST** `/api/profile`
  - Create or update a profile
  - Request body:
    ```json
    {
      "candidate_id": "optional string",
      "name": "string",
      "education_level": "Undergraduate|Postgraduate|Diploma|Other",
      "field_of_study": "string",
      "location_preference": "City name",
      "skills_possessed": ["python", "sql"],
      "sector_interests": ["Technology", "Finance"]
    }
    ```
  - Response (created/updated):
    ```json
    { "message": "Profile created.", "candidate": { "candidate_id": "CAND_xxxx", "name": "...", "skills_possessed": ["..."] } }
    ```

- **GET** `/api/profile/{candidate_id}`
  - Retrieve profile by candidate ID
  - Response:
    ```json
    { "profile": { "candidate_id": "CAND_xxxx", "name": "..." } }
    ```

- **GET** `/api/profiles/by_username/{username}`
  - Retrieve profile by username (case-insensitive)

### Internships
- **GET** `/api/internships`
- **Description**: Get all available internships
- **Response**:
  ```json
  { "internships": [ { "internship_id": "INT001", "title": "...", "skills_required": ["..."] } ] }
  ```

### Recommendations
- **GET** `/api/recommendations/{candidate_id}`
- **Description**: Get internship recommendations for a candidate
- **Parameters**:
  - `candidate_id`: Unique identifier for the candidate
- **Response**:
  ```json
  {
    "candidate": "Name",
    "candidate_id": "CAND_xxxx",
    "recommendations": [
      { "internship_id": "INT001", "title": "...", "match_score": 87.5, "location": "...", "organization": "..." }
    ]
  }
  ```

- **GET** `/api/recommendations/by_internship/{internship_id}`
  - Description: Get internships similar to the given internship
  - Response:
    ```json
    {
      "base_internship": "Title",
      "recommendations": [ { "internship_id": "INT002", "match_score": 76.0 } ]
    }
    ```

## Error Responses

Common error shapes returned by endpoints:

```json
{ "error": "Message", "status_code": 404 }
```

or standardized helper format:

```json
{ "success": false, "message": "Message", "status_code": 400, "timestamp": "..." }
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Server error
- `DATABASE_ERROR` (503): Database connection issues

## Rate Limiting
- Defaults suitable for local development. Add reverse proxy or API gateway limits for production.

## Data Formats
- All requests and responses use JSON
- Dates are in ISO 8601 format
- Responses may be in a minimal shape for legacy compatibility or standardized via helpers

## Scoring Notes (High Level)
- Match % is intentionally not a single fixed formula.
- Scoring adapts based on what data exists (resume/profile completeness) and what the system has learned from interactions.
- Persisted signals used by scoring:
  - Personal (per-user): `personal_preference_profiles` (rebuilt from internship interactions)
  - Global (all users): `company_reputation` (rebuilt from company interactions; denormalized onto `companies`)