# Database Migration Guide

## Overview
This guide covers migrating from the old MongoDB database to a fresh MongoDB Atlas instance with **50 realistic internships**. 

**Important:** Users are NOT pre-generated. All user accounts will be created through the signup/registration flow in the application.

## 📁 Data Files

### 1. `internships.json`
**50 realistic tech internships** across India's top companies and cities.

**Fields:**
- `internship_id`: Unique identifier (INT_001 - INT_050)
- `title`: Job title (Software Development, Data Science, etc.)
- `organization`: Company name (Google, Microsoft, Flipkart, etc.)
- `location`: City (Bangalore, Mumbai, Hyderabad, etc.)
- `sector`: Industry category
- `skills_required`: Array of required skills
- `description`: Detailed internship description
- `responsibilities`: Array of key responsibilities
- `eligibility`: Qualification requirements
- `duration`: Internship length (e.g., "3 months", "6 months")
- `stipend`: Monthly payment (₹15,000 - ₹95,000)
- `education_level`: Required education (B.Tech, M.Tech, etc.)
- `work_mode`: In-office, Hybrid, or Remote
- `is_beginner_friendly`: Boolean flag
- `application_deadline`: ISO date string
- `posted_date`: ISO date string

**Statistics:**
- Companies: 48 unique organizations
- Locations: 13 cities (Bangalore: 15, Hyderabad: 7, Mumbai: 5, etc.)
- Stipend range: ₹15,000 - ₹95,000/month
- Categories: Software Dev (15), ML/DS (10), DevOps (5), Mobile (5), UI/UX (5), QA (3), Security (3), Others (4)

## 👥 User Management

**Users are created dynamically**, not pre-loaded:
- Users create accounts via the **Signup** page
- Profile data is saved when users **fill their profile** after login
- No test credentials - create your own accounts for testing

### Database Collections Used:
1. **`login_info`** - Authentication (username, password hash)
   - Created on first signup
   - Fields: `username`, `password`, `_id`

2. **`profiles`** - User profile data
   - Created when user fills profile form
   - Fields: `candidate_id`, `username`, `name`, `email`, `phone`, `skills_possessed`, `location_preference`, `education_level`, `experience`, `sector_interests`, `created_at`, `updated_at`

3. **`internships`** - Internship listings (migrated from JSON)
   - Pre-loaded with 50 internships
   - Fields: See internships.json schema above

## 🚀 Migration Steps

### Step 1: MongoDB Atlas Setup
1. Create new MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (Free tier M0 works fine)
3. Configure Network Access:
   - Add your IP address
   - Or allow access from anywhere (0.0.0.0/0) for development
4. Create Database User:
   - Username: `admin` (or your choice)
   - Password: Strong password
   - Role: `Read and write to any database`
5. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy MongoDB URI (format: `mongodb+srv://username:password@cluster.mongodb.net/`)

### Step 2: Configure Environment Variables
1. Create/update `.env` file in project root:
```env
# MongoDB Connection (use MONGO_URI to match existing code)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=ClusterName
DB_NAME=internships

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
```

2. Replace placeholders:
   - `username`: Your database username
   - `password`: Your database password (URL-encoded if contains special characters)
   - `cluster`: Your cluster name from Atlas connection string

### Step 3: Install Dependencies
```bash
pip install pymongo python-dotenv
```

### Step 4: Run Migration Script
```bash
# Basic migration (preserves existing data)
python scripts/migrate_to_new_atlas.py

# Drop existing collections and start fresh (RECOMMENDED)
python scripts/migrate_to_new_atlas.py --drop

# Show setup instructions after migration
python scripts/migrate_to_new_atlas.py --drop --show-instructions
```

**Expected Output:**
```
============================================================
🚀 MongoDB Atlas Migration Script
============================================================

📡 Connecting to MongoDB Atlas...
✅ Connected successfully

📂 Loading data files...
   ✅ Loaded 50 internships

💡 Note: Users will be created through signup/registration
   - login_info collection: Created on first signup
   - profiles collection: Created when users fill their profile

📥 Inserting data into MongoDB...
   ✅ Inserted 50 internships

📊 Creating indexes...
✅ Internships indexes created
✅ login_info indexes created
✅ profiles indexes created

🔍 Validating data...
   Database internships count: 50

📋 Collections in database:
   - internships: 50 documents

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Internships migrated: 50/50

💡 User Management:
   - Users will create accounts via signup endpoint
   - Profiles will be created when users fill their information
   - Collections: login_info, profiles (auto-created on first use)

✨ Migration completed successfully with no errors!

Database: internship_recommender
Primary Collections: internships, login_info, profiles
============================================================
```

### Step 5: Update Backend Configuration
Backend is already configured correctly! It uses:
- `MONGO_URI` from `.env` file
- Collections: `login_info`, `profiles`, `internships`

Verify connection:
```bash
python -c "from app.core.database import db_manager; db = db_manager.get_db(); print('✅ Connected' if db else '❌ Failed')"
```

### Step 6: Test the Application

1. **Start Backend:**
```bash
python run.py
```

2. **Start Frontend:**
```bash
cd frontend
npm start
```

3. **Create Test Account:**
   - Navigate to http://localhost:3000/signup
   - Create a new account (e.g., username: `testuser`, password: `test123`)
   - Login with your new credentials
   - Fill out your profile information

4. **Verify Internships:**
   - Go to http://localhost:3000/internships
   - Should see 50 internships loaded from database
   - Click "View Details" on any internship
   - Verify all data displays correctly

## 📊 Database Schema

### Collections

#### `internships`
- Primary key: `internship_id` (unique)
- Indexes: `organization`, `location`, `sector`, `application_deadline`
- Document count: 50 (pre-loaded)
- **Source:** Migrated from `data/internships.json`

#### `login_info`
- Primary key: `username` (unique)
- Fields: `username`, `password` (bcrypt hash), `_id`
- Document count: Grows as users signup
- **Source:** Created dynamically via `/api/signup` endpoint

#### `profiles`
- Primary key: `username` (unique), `candidate_id` (unique)
- Fields: `candidate_id`, `username`, `name`, `email`, `phone`, `skills_possessed`, `location_preference`, `education_level`, `experience`, `sector_interests`, timestamps
- Document count: Grows as users create profiles
- **Source:** Created dynamically via `/api/profile` endpoint

## 🔧 Troubleshooting

### Connection Issues
**Error:** `ServerSelectionTimeoutError`
- **Solution:** Check Network Access in MongoDB Atlas, add your IP address (or 0.0.0.0/0 for development)

**Error:** `Authentication failed`
- **Solution:** Verify username/password in connection string, check Database User permissions in Atlas

### Data Issues
**Error:** `Duplicate key error on internship_id`
- **Solution:** Run migration with `--drop` flag to clear existing data first

**Error:** `File not found: internships.json`
- **Solution:** Ensure you're running script from project root, check file exists in `data/` folder

### Import Issues
**Error:** `ModuleNotFoundError: No module named 'pymongo'`
- **Solution:** `pip install pymongo python-dotenv`

### Application Issues
**Error:** "Failed to load internships" in frontend
- **Solution:** Check backend is running, verify `MONGO_URI` in `.env`, confirm internships collection has 50 documents

**Error:** "Signup failed"
- **Solution:** Check `login_info` indexes were created, verify backend can connect to MongoDB

## 📝 Post-Migration Tasks

### 1. Verify Data Integrity
```python
from app.core.database import db_manager

db = db_manager.get_db()

# Check counts
print("Internships:", db.internships.count_documents({}))
print("Users (login_info):", db.login_info.count_documents({}))
print("Profiles:", db.profiles.count_documents({}))

# Sample internship
print("\nSample internship:", db.internships.find_one())
```

### 2. Test User Flow
1. **Signup:** Create new account via `/signup` page
2. **Login:** Login with created credentials
3. **Profile:** Fill profile form and save
4. **Internships:** Browse 50 internships
5. **Details:** Click "View Details" on internship
6. **Recommendations:** Test recommendation engine (if enabled)

### 3. Verify API Endpoints
```bash
# Get all internships
curl http://localhost:5000/api/internships

# Get specific internship
curl http://localhost:5000/api/internships/INT_001

# Signup (POST)
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Login (POST)
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

### 4. Security Checklist
- [ ] `.env` file in `.gitignore`
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Strong database password used
- [ ] JWT secret key set in environment
- [ ] CORS configured for production domain
- [ ] No sensitive data in version control

## 🎯 Next Steps

1. **Development:** 
   - Create test user accounts via signup
   - Fill profile with skills, location, education
   - Browse internships and test features

2. **Testing:**
   - Test full user journey (signup → profile → browse → apply)
   - Verify recommendations work
   - Test on mobile/different browsers

3. **Production:** 
   - Use environment variables for all sensitive config
   - Enable MongoDB Atlas backup
   - Monitor database performance
   - Set up proper CORS for production domain

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [PyMongo Documentation](https://pymongo.readthedocs.io/)
- [Flask-PyMongo Documentation](https://flask-pymongo.readthedocs.io/)

## ⚠️ Important Notes

1. **User accounts** are created through signup - no pre-generated test users
2. **Always use** environment variables for sensitive credentials (`MONGO_URI`, `JWT_SECRET_KEY`)
3. **Back up** your MongoDB Atlas database before major changes
4. **Test thoroughly** in development before production deployment
5. **Monitor** database usage to stay within Atlas free tier limits (512 MB storage)
6. **Profile data** is created when users fill the profile form after signup

## 🔐 Security Best Practices

- Never commit `.env` files to version control
- Use strong, unique passwords for MongoDB Atlas
- Generate a random `JWT_SECRET_KEY` for production
- Enable IP whitelisting in MongoDB Atlas (or use VPN/static IP)
- Use HTTPS in production for all API calls
- Implement rate limiting on signup/login endpoints
- Regularly rotate database credentials

---

**Migration Script:** `scripts/migrate_to_new_atlas.py`  
**Data Files:** `data/internships.json`  
**Database:** MongoDB Atlas  
**Collections:** `internships` (pre-loaded), `login_info` (dynamic), `profiles` (dynamic)  
**User Creation:** Via signup/registration flow (not pre-generated)
