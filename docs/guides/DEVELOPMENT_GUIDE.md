# Development Guide - Intern Insight

Complete guide for developing and contributing to Intern Insight.

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 16+
- MongoDB Atlas account (free tier)
- OCR.space API key (free: 25k/month)
- OpenRouter API key (free tier)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DhairyaSood/Intern-Insight.git
   cd Intern-Insight
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cd ..
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
   SECRET_KEY=your-secure-random-key-here
   JWT_SECRET_KEY=your-jwt-secret-key-here
   PASSWORD_SALT_ROUNDS=12
   
   # AI Services (Required for resume parsing)
   OCR_SPACE_API_KEY=your-ocr-space-api-key
   OPENROUTER_API_KEY=your-openrouter-api-key
   
   # CORS
   CORS_ORIGINS=http://localhost:3000
   
   # Environment
   FLASK_ENV=development
   FLASK_DEBUG=True
   API_PORT=3000
   ```

### Running the Application

#### Development Mode (Recommended)

**Terminal 1 - Backend**:
```bash
python run.py --debug
# Runs on http://127.0.0.1:3000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

#### Production Mode
```bash
# Backend
python run.py --env production --port 8000

# Frontend
cd frontend
npm run build
# Serve build/ folder with static server
```

### Verify Setup

```bash
# Test backend health
curl http://127.0.0.1:3000/health

# Test database connection
curl http://127.0.0.1:3000/api/admin/db-stats

# Open frontend
# Navigate to http://localhost:3000
```

## Project Structure

```
Intern-Insight/
├── app/                      # 🚀 Flask Backend
│   ├── main.py              # Flask app factory
│   ├── config.py            # Environment configuration
│   ├── api/                 # REST API endpoints
│   │   ├── __init__.py      # Blueprint registration
│   │   ├── auth.py          # JWT authentication
│   │   ├── internships.py   # Internship CRUD & search
│   │   ├── recommendations.py # ML recommendation engine
│   │   ├── profiles.py      # User profile management
│   │   ├── resume_parser.py # AI resume parsing
│   │   ├── cities.py        # City/location data
│   │   └── admin.py         # Admin endpoints
│   ├── core/                # Core business logic
│   │   └── database.py      # MongoDB connection manager
│   ├── utils/               # Shared utilities
│   │   ├── jwt_auth.py      # JWT token helpers
│   │   ├── logger.py        # Structured logging
│   │   ├── response_helpers.py # Standardized responses
│   │   └── error_handler.py # Global error handling
│   └── models/              # Data models (if needed)
│
├── frontend/                 # 🎨 React Frontend
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Auth/        # Login, Signup, ProtectedRoute
│   │   │   ├── Common/      # Navbar, Footer, Theme, Loading
│   │   │   ├── Profile/     # ProfileForm, ResumeUpload, SkillsInput
│   │   │   ├── Internship/  # InternshipCard, InternshipList
│   │   │   └── Recommendations/ # Recommendation components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   │   ├── api.js       # Axios instance with auth
│   │   │   ├── auth.js      # Auth API calls
│   │   │   ├── profile.js   # Profile API calls
│   │   │   ├── internships.js # Internship API calls
│   │   │   └── ocr.js       # Resume parsing API
│   │   ├── store/           # Zustand state stores
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Helper functions
│   ├── package.json
│   └── tailwind.config.js
│
├── tests/                    # 🧪 All Test Files
│   ├── test_api.py          # API endpoint tests
│   ├── test_auth.py         # Authentication tests
│   ├── test_login.py        # Login flow tests
│   ├── test_signup.py       # Signup tests
│   └── ...
│
├── scripts/                  # 🔧 Utility Scripts
│   ├── fetch_india_cities.py
│   ├── build_city_coords.py
│   └── migrate_to_atlas.py
│
├── docs/                     # 📚 Documentation
│   ├── api/                 # API documentation
│   ├── architecture/        # System design
│   ├── guides/              # Development guides
│   └── README.md
│
├── backend/                  # ⚠️ Legacy (kept for compatibility)
├── logs/                     # Application logs
├── .env                      # Environment variables (gitignored)
├── .gitignore
├── requirements.txt          # Python dependencies
├── run.py                    # Backend entry point
├── wsgi.py                   # Production WSGI
└── README.md                 # Main documentation
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style (PEP 8 for Python, ESLint for React)
   - Add tests for new functionality in `tests/` folder
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Backend tests
   python -m pytest tests/
   
   # Frontend tests
   cd frontend && npm test
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add feature: description"
   git push origin feature/your-feature-name
   ```

5. **Create a pull request**
   - Describe your changes clearly
   - Link any related issues
   - Wait for code review

### Testing

#### Backend Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_api.py

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=html
```

#### Frontend Tests
```bash
cd frontend
npm test
```

#### Manual Testing
```bash
# Health check
curl http://127.0.0.1:3000/health

# Test authentication
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Test resume parsing
curl -X POST http://127.0.0.1:3000/api/parse-resume \
  -H "Authorization: Bearer <token>" \
  -F "file=@resume.pdf"
```

3. **Test your changes**
   ```bash
   python -m pytest tests/
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **Python**: Follow PEP 8
- **JavaScript**: Use ES6+ features
- **HTML/CSS**: Use semantic HTML and organized CSS
- **Documentation**: Use Markdown for all docs

### Database Development

#### Using MongoDB Atlas
```python
from app.core.database import db_manager

db = db_manager.get_db()
collection = db.candidates
```

> Note: In Atlas-only mode (DISABLE_JSON_FALLBACK=True), the app will not read/write JSON files at runtime.

### API Development

1. **Create new endpoint in `app/api/`**
2. **Use response helpers for consistency**:
   ```python
   from app.utils.response_helpers import success_response, error_response
   
   return success_response(data, "Operation successful")
   ```
3. **Add proper error handling**
4. **Update API documentation**

### Frontend Development

1. **Organize assets properly**:
   - CSS in `frontend/assets/css/`
   - JavaScript in `frontend/assets/js/`
   - Images in `frontend/assets/images/`

2. **Use the component system for reusable UI elements**

3. **Follow responsive design principles**

## Testing

### Running Tests
```bash
# All tests
python -m pytest

# Specific test file
python -m pytest tests/test_api.py

# With coverage
python -m pytest --cov=app tests/
```

### Writing Tests
```python
import unittest
from app.main import create_app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
    
    def test_health_endpoint(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
```

## Deployment

### Production Checklist
- [ ] Set `DEBUG=False` in environment
- [ ] Configure proper database connection
- [ ] Set secure `SECRET_KEY`
- [ ] Configure CORS for production domains
- [ ] Set up proper logging
- [ ] Configure reverse proxy (nginx/Apache)

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3000

CMD ["python", "run.py", "--port", "3000"]
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure you're in the virtual environment
   - Check PYTHONPATH settings

2. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection string in `.env`
   - Fallback to JSON mode if needed

3. **Frontend Not Loading**
   - Check static file serving in `app/main.py`
   - Verify file paths in HTML templates

4. **API Errors**
   - Check application logs
   - Verify request format matches API spec
   - Test with curl or Postman

### Debugging Tips

1. **Enable debug mode**:
   ```bash
   python run.py --debug
   ```

2. **Check logs**:
   ```bash
   tail -f logs/application.log
   ```

3. **Use Python debugger**:
   ```python
   import pdb; pdb.set_trace()
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

For questions or issues, please create an issue on the repository.