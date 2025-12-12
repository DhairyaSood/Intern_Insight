# Intern Insight 🎯

A sophisticated, production-ready internship recommendation system that connects students with personalized internship opportunities through advanced machine learning algorithms, intelligent matching, cloud-based AI parsing, and a modern React architecture.

## ✨ Overview

Intern Insight is a professional-grade web application featuring a **modular Flask backend** with **MongoDB Atlas** database, **cloud-based OCR** (OCR.space), **AI-powered resume parsing** (OpenRouter with 11 models), **comprehensive error handling**, **standardized API responses**, and a **modern React frontend** with Tailwind CSS styling and dark mode support.

## 🚀 Quick Start

### Backend Setup
```bash
git clone <repository-url>
cd PM_Intern
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Configuration
```bash
copy .env.example .env
# Edit .env with:
# - MongoDB Atlas connection string
# - OCR_SPACE_API_KEY (get free key at https://ocr.space/ocrapi)
# - OPENROUTER_API_KEY (get free key at https://openrouter.ai/)
# - SECRET_KEY and JWT_SECRET_KEY
```

### Run Backend
```bash
python run.py --debug
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

**Access Application**:
- Frontend: http://localhost:3000 (React dev server)
- Backend API: http://127.0.0.1:3000/api (Flask server on port 3000)

## 🌟 Key Features

### 🏠 **Smart Internship Discovery**
- **Advanced Search & Filtering**: Multi-criteria search across titles, companies, skills, and locations
- **AI-Powered Recommendations**: ML-driven "Find Similar" functionality with personalized scoring
- **Real-time Results**: Live internship listings with instant search feedback
- **Modern React UI**: Responsive design with dark/light theme toggle and persistent preferences
- **Mobile-Optimized**: Dual-layout system with horizontal cards, scrollable filters, and touch-friendly controls

### 👤 **Comprehensive Profile Management**
- **AI-Powered Resume Parser**: Upload PDF/Image resumes for automatic profile filling
  - Cloud OCR (OCR.space API) for image text extraction (25k/month free tier)
  - AI parsing with OpenRouter (11 free models with rotation)
  - Models: Llama, Gemini, Mistral, Qwen, Nemotron, and more
- **Smart Profile Builder**: Personal info, education, location preferences, skills, and interests
- **Dynamic Skills Management**: Tag-based skills input with intelligent suggestions
- **Data Persistence**: Automatic saving with MongoDB Atlas

### 🔐 **Secure Authentication**
- **JWT-based Authentication**: Secure token-based auth with refresh tokens
- **Password Security**: Industry-standard bcrypt hashing
- **Protected Routes**: Client-side and server-side route protection
- **Session Management**: Persistent login state with Zustand store

### 🤖 **Advanced AI Recommendation Engine**
- **Multi-factor Scoring Algorithm**:
  - Skills matching with fuzzy text matching (weighted up to 50 points)
  - Geographic proximity with distance calculations (25 points)
  - Sector alignment and field compatibility (20 points)
  - Education level matching (5 points)
- **Intelligent Processing**: Skill normalization, synonym mapping (rapidfuzz)
- **Model Rotation**: Random rotation through 11 AI models for reliability

## 🏗️ Architecture

### **Modern Full-Stack Structure**
```
Intern_Insight/
├── app/                     # 🚀 Flask Backend
│   ├── main.py             # Flask app factory
│   ├── config.py           # Environment config
│   ├── api/                # REST API endpoints
│   │   ├── auth.py         # JWT authentication
│   │   ├── internships.py  # Internship CRUD
│   │   ├── recommendations.py  # ML recommendations
│   │   ├── profiles.py     # User profiles
│   │   └── resume_parser.py # AI resume parsing
│   ├── core/               # Business logic
│   │   └── database.py     # MongoDB connection
│   └── utils/              # Shared utilities
│       ├── jwt_auth.py      # JWT helpers
│       ├── logger.py        # Logging
│       └── response_helpers.py  # API responses
├── frontend/                # 🎨 React Frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Auth/        # Login, Signup
│   │   │   ├── Common/      # Navbar, Footer, Theme
│   │   │   ├── Profile/     # Profile, Resume Upload
│   │   │   └── Internship/  # Internship cards
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── store/           # Zustand stores
│   │   └── App.jsx          # Root component
│   └── package.json
├── tests/                   # 🧪 All Test Files
│   ├── test_api.py
│   ├── test_login.py
│   └── test_signup.py
├── scripts/                 # 🔧 Utility Scripts
├── docs/                    # 📚 Documentation
├── requirements.txt         # Python dependencies
├── run.py                   # Backend entry point
└── wsgi.py                  # Production WSGI
```

### **Data Flow**
```
User (Browser)
    ↓
React Frontend (Port 3000)
    ↓ HTTP/JSON
Flask Backend (Port 3000)
    ↓
  ├───> MongoDB Atlas (Database)
  ├───> OCR.space API (Image OCR)
  └───> OpenRouter API (AI Parsing)
```

### **Technology Stack**

#### Backend
- **Python 3.13+** with Flask 3.1.2
- **MongoDB Atlas** primary database with connection pooling
- **Flask-CORS** for cross-origin support
- **PyJWT** for JWT authentication
- **OCR.space API** for cloud-based OCR (no heavy dependencies)
- **OpenRouter API** for AI resume parsing (11 free models)
- **PyPDF2** for PDF text extraction
- **rapidfuzz** for fuzzy text matching in recommendations
- **Gunicorn** for production WSGI server
- **Comprehensive Error Handling** and structured logging

#### Frontend
- **React 18** with hooks and functional components
- **React Router v6** for client-side routing
- **Tailwind CSS** for modern, responsive styling
- **Zustand** for lightweight state management
- **Axios** for HTTP requests with interceptors
- **Lucide React** for beautiful icons
- **Dark/Light Theme** with system preference detection
- **Responsive Design** optimized for mobile, tablet, desktop with dual-layout architecture
- **Mobile-First UI**: Horizontal card layouts, scrollable filter chips, match percentage badges

#### AI & Cloud Services
- **OCR.space API** - Free tier: 25,000 requests/month
- **OpenRouter** - 11 free AI models with rotation:
  - meta-llama/llama-3.2-3b-instruct:free
  - google/gemini-2.0-flash-exp:free
  - mistralai/mistral-7b-instruct:free
  - And 8 more models for reliability

#### Database & Deployment
- **MongoDB Atlas** for scalable cloud storage
- **Render** for backend deployment
- **Render Static Site** for frontend deployment
- **Environment Variables** for secure configuration

### **API Design**

#### **Authentication** (`/api/auth`)
- `POST /api/auth/signup` - User registration with validation
- `POST /api/auth/login` - JWT-based authentication
- `POST /api/auth/logout` - Token invalidation
- `GET /api/auth/me` - Get current user info

#### **Core API Endpoints**
- `GET /api/internships` - Get internship listings with search/filter
- `GET /api/recommendations/{candidate_id}` - Get personalized recommendations
- `GET /api/recommendations/by_internship/{internship_id}` - Find similar internships

#### **Profile Management** (`/api/profile`)
- `POST /api/profile` - Create/update user profiles
- `GET /api/profile/{candidate_id}` - Retrieve profile data
- `GET /api/profiles/by_username/{username}` - Fetch by username

#### **Resume Parsing** (`/api/parse-resume`)
- `POST /api/parse-resume` - Upload resume (PDF/Image) for AI parsing
  - Supports: PDF, JPG, PNG (max 5MB)
  - Returns: name, email, phone, skills, education, experience
  - Uses: OCR.space + OpenRouter AI with 11 models

#### **Admin & Monitoring**
- `GET /health` - Application health check
- `GET /api/admin/db-stats` - Database statistics (Atlas)
- Standardized error responses with status codes

## 🚀 Getting Started

### **Prerequisites**
- Python 3.13+ (backend)
- Node.js 16+ (frontend)
- MongoDB Atlas account (free tier available)
- OCR.space API key (free: 25k/month)
- OpenRouter API key (free tier available)
- Modern web browser
- Git

### **Backend Installation**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DhairyaSood/Intern_Insight.git
   cd Intern_Insight
   ```

2. **Setup Python Environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

3. **Install Backend Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   copy .env.example .env  # Windows
   # cp .env.example .env  # Linux/Mac
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/pm_intern?retryWrites=true&w=majority
   DB_NAME=pm_intern
   
   # Security
   SECRET_KEY=your-secure-secret-key
   JWT_SECRET_KEY=your-jwt-secret-key
   
   # AI Services (Required for resume parsing)
   OCR_SPACE_API_KEY=your-ocr-space-key
   OPENROUTER_API_KEY=your-openrouter-key
   
   # CORS
   CORS_ORIGINS=http://localhost:3000
   
   # Environment
   FLASK_ENV=development
   API_PORT=3000
   ```

5. **Run Backend Server**
   ```bash
   python run.py --debug
   # Backend runs on http://127.0.0.1:3000
   ```

### **Frontend Installation**

1. **Navigate to Frontend**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   # Frontend runs on http://localhost:3000
   ```

4. **Access Application**
   - Open browser to `http://localhost:3000`
   - Application ready! 🎉

### **Development & Verification Commands**
```bash
# Development mode with auto-reload
python run.py --debug

# Production mode
python run.py --port 8000

# Custom environment
python run.py --env production

# Verify Atlas connection and collection counts
curl http://127.0.0.1:3000/api/admin/db-stats
```

## 📊 Data Structure & API

### **Profile Schema**
```json
{
  "candidate_id": "CAND_xxxxxxxx",
  "username": "string",
  "name": "string",
  "email": "email@example.com",
  "phone": "+1234567890",
  "skills_possessed": ["Python", "React", "MongoDB"],
  "location_preference": "City, State",
  "education_level": "Bachelor's|Master's|PhD",
  "field_of_study": "Computer Science",
  "experience": "Work experience description",
  "sector_interests": ["Technology", "Finance"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **Resume Parse Response**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["Python", "JavaScript", "SQL"],
    "education": "Bachelor of Science in Computer Science\nXYZ University, 2020-2024",
    "experience": "Software Engineer Intern\nABC Corp, Summer 2023"
  },
  "message": "Resume parsed successfully"
}
```

### **Internship Schema**
```json
{
  "internship_id": "INTxxxx",
  "title": "string",
  "company": "string",
  "location": "string",
  "skills_required": ["skill1", "skill2"],
  "sector": "string",
  "education_level": "string",
  "description": "string",
  "duration": "string",
  "stipend": "string"
}
```

### **API Response Format**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🎯 Usage Guide

### **For Students**

1. **Getting Started**
   - Visit http://localhost:3000 (after starting frontend)
   - Click "Sign Up" to create an account
   - Complete your profile with accurate information

2. **Smart Profile Creation**
   - **Option 1: Manual Entry**
     - Fill in name, email, phone with country code
     - Add skills using the tag input
     - Specify location, education, and experience
   
   - **Option 2: AI-Powered Resume Upload**
     - Click "Upload Resume" on profile page
     - Upload PDF or image (JPG/PNG) resume
     - Watch AI extract information automatically
     - Review and edit extracted data

3. **Discover Internships**
   - Browse internship listings on the home page
   - Use search and filters (location, skills, company)
   - View detailed internship information
   - Get personalized recommendations based on your profile

4. **Profile Optimization**
   - Keep skills updated and comprehensive
   - Specify accurate location preferences
   - Complete all profile sections for better matching
   - Use the resume parser to update quickly

### **For Developers**

1. **Development Setup**
   ```bash
   # Backend (Terminal 1)
   python run.py --debug
   
   # Frontend (Terminal 2)
   cd frontend && npm start
   ```

2. **Adding Features**
   - Backend: Create endpoints in `app/api/`
   - Frontend: Add components in `frontend/src/components/`
   - State: Use Zustand stores in `frontend/src/store/`
   - Styling: Use Tailwind CSS utility classes

3. **API Integration**
   ```javascript
   // frontend/src/services/api.js
   import api from './api';
   const response = await api.get('/internships');
   ```

4. **Database Operations**
   ```python
   # app/core/database.py
   from app.core.database import db_manager
   db = db_manager.get_db()
   profiles = db.profiles.find({"username": username})
   ```

## 🧪 Testing & Validation

### **Run Tests**
```bash
# All tests in tests/ folder
python -m pytest tests/

# Specific test file
python -m pytest tests/test_api.py

# With coverage
python -m pytest tests/ --cov=app
```

### **Health Checks**
```bash
# Application health
curl http://127.0.0.1:3000/health

# Database stats
curl http://127.0.0.1:3000/api/admin/db-stats
```

### **API Testing**
```bash
# Get internships
curl http://127.0.0.1:3000/api/internships

# Get recommendations (requires auth token)
curl -H "Authorization: Bearer <token>" \
  http://127.0.0.1:3000/api/recommendations/CAND_xxxxxxxx

# Upload resume for parsing
curl -X POST -F "file=@resume.pdf" \
  -H "Authorization: Bearer <token>" \
  http://127.0.0.1:3000/api/parse-resume
```

### **Frontend Testing**
```bash
cd frontend
npm test
```

## 🔒 Security & Performance

- **Efficient Algorithms**: O(n log n) sorting for recommendations
- **Caching**: Skill synonym caching for faster lookups
- **Database Indexing**: MongoDB indexes on frequently queried fields
- **Lazy Loading**: Frontend components load on demand
- **Minification**: CSS and JS optimization for production

## 🔮 Future Roadmap

### Planned Features
- **Advanced ML Models**: Deep learning for better recommendations
- **User Analytics**: Dashboard with application tracking
- **Company Integration**: Direct company job posting interface
- **Mobile Application**: React Native or Flutter mobile app
- **Email Notifications**: Automated alerts for new opportunities
- **Social Features**: User reviews and company ratings
- **Resume Builder**: Integrated CV creation tools
- **Interview Preparation**: Resources and practice modules

### **Security Features**
- **JWT Authentication**: Token-based auth with bcrypt password hashing
- **Environment Variables**: All sensitive data in `.env` (gitignored)
- **CORS Protection**: Configured for specific origins only
- **Input Validation**: Server-side validation for all user inputs
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Protection**: React's built-in XSS protection
- **No API Keys in Code**: All keys loaded from environment
- **Error Handling**: Graceful error responses without information leakage
- **Request Logging**: Comprehensive request/response monitoring

### **Performance Optimizations**
- **Connection Pooling**: MongoDB connection pooling (max 10)
- **Model Rotation**: AI model rotation for reliability and load distribution
- **Lazy Loading**: React lazy loading for code splitting
- **Caching**: Browser caching for static assets
- **Optimized Builds**: Production builds with minification
- **Efficient Algorithms**: O(n log n) recommendation scoring
- **Cloud Services**: No heavy local OCR dependencies
- **Modular Architecture**: Reduced loading times and improved maintainability

## 🔮 Future Roadmap

### **Planned Features**
- [ ] **Email Notifications**: Alerts for new matching internships
- [ ] **Application Tracking**: Track application status and deadlines
- [ ] **Company Profiles**: Detailed company information and reviews
- [ ] **Advanced Filters**: Salary range, duration, remote options
- [ ] **Analytics Dashboard**: Profile views, application success rate
- [ ] **Interview Preparation**: Resources and tips for interviews
- [ ] **Referral System**: Get bonus features by referring friends
- [ ] **Mobile App**: React Native mobile application
- [ ] **Real-time Chat**: Direct messaging with recruiters
- [ ] **Video Interviews**: Integrated video interview platform
- [ ] **Companies Page**: Browse and filter companies with scrollable sector dropdown
- [ ] **Advanced ML**: Deep learning models for enhanced recommendation accuracy

## 📚 Documentation

### **Complete Documentation Available**
- 📖 **[Development Guide](docs/guides/DEVELOPMENT_GUIDE.md)**: Setup, workflows, and best practices
- 🏗️ **[Architecture Documentation](docs/architecture/)**: System design and comparisons
- 🔧 **[API Reference](docs/api/API_REFERENCE.md)**: Complete endpoint documentation
- 📋 **[Project Guides](docs/guides/)**: Implementation and troubleshooting guides

### **Quick Links**
- **Getting Started**: See [Development Guide](docs/guides/DEVELOPMENT_GUIDE.md)
- **API Documentation**: Check [API Reference](docs/api/API_REFERENCE.md)
- **Architecture Details**: View [Architecture Docs](docs/architecture/)

## 🚀 Deployment

### **Production Deployment (Render)**

This project is deployed on Render:
- **Backend**: https://pm-intern-fobb.onrender.com
- **Frontend**: https://intern-insight-n1wn.onrender.com

### **Backend Deployment Steps**

1. **Create Web Service on Render**
   - Connect GitHub repository
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn wsgi:app`
   - Environment: Python 3.13

2. **Set Environment Variables**
   ```
   MONGO_URI=mongodb+srv://...
   DB_NAME=pm_intern
   SECRET_KEY=<secure-key>
   JWT_SECRET_KEY=<secure-jwt-key>
   OCR_SPACE_API_KEY=<your-key>
   OPENROUTER_API_KEY=<your-key>
   CORS_ORIGINS=https://intern-insight-n1wn.onrender.com
   FLASK_ENV=production
   FLASK_DEBUG=False
   ```

3. **Deploy**
   - Push to main branch
   - Render auto-deploys on commit

### **Frontend Deployment Steps**

1. **Create Static Site on Render**
   - Connect GitHub repository
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`

2. **Environment Variables**
   ```
   REACT_APP_API_URL=https://pm-intern-fobb.onrender.com
   ```

3. **Deploy**
   - Push to main branch
   - Render builds and deploys automatically

### **Production Checklist**
- [ ] Set `FLASK_DEBUG=False`
- [ ] Use strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure MongoDB Atlas IP whitelist (0.0.0.0/0 for Render)
- [ ] Add frontend URL to `CORS_ORIGINS`
- [ ] Set up environment variables in Render dashboard
- [ ] Test all API endpoints after deployment
- [ ] Monitor logs for errors

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### **Code Standards**
- **Python**: Follow PEP 8, use type hints where applicable
- **JavaScript/React**: ESLint configuration, use functional components
- **Commits**: Clear, descriptive commit messages
- **Documentation**: Update docs for significant changes
- **Testing**: Add tests for new features (in `tests/` folder)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Flask** - Excellent Python web framework
- **React** - Modern UI library
- **MongoDB Atlas** - Scalable cloud database
- **OCR.space** - Free OCR API service (25k requests/month)
- **OpenRouter** - Free AI model access (11 models)
- **Tailwind CSS** - Utility-first CSS framework
- **Render** - Easy deployment platform
- **Zustand** - Simple state management
- **PyPDF2** - PDF text extraction

---

**Intern Insight v3.0** - Intelligent Internship Matching Platform 🎯

**Live Deployment**: [intern-insight-n1wn.onrender.com](https://intern-insight-n1wn.onrender.com)

**Backend API**: [pm-intern-fobb.onrender.com](https://pm-intern-fobb.onrender.com)

**Made with ❤️ by [DhairyaSood](https://github.com/DhairyaSood)**