# Intern Insight - React Frontend

Modern, responsive React frontend for the Intern Insight internship recommendation platform with AI-powered resume parsing and intelligent matching.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (with npm)
- Backend API running on http://127.0.0.1:3000
- Modern web browser

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## 📦 Tech Stack

- **React 18** - Modern UI library with hooks
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling framework
- **Zustand** - Lightweight state management
- **Axios** - HTTP client with interceptors
- **Lucide React** - Beautiful icon library
- **React Hook Form** - Efficient form handling

## 🏗️ Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── Auth/           # Login, Signup, ProtectedRoute
│   │   ├── Common/         # Navbar, Footer, ThemeToggle, LoadingSpinner
│   │   ├── Internship/     # InternshipCard, InternshipList
│   │   ├── Profile/        # ProfileForm, ResumeUpload, SkillsInput
│   │   └── Recommendations/ # Recommendation components
│   ├── pages/              # Page-level components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── InternshipsPage.jsx
│   │   └── RecommendationsPage.jsx
│   ├── services/           # API service functions
│   │   ├── api.js          # Axios instance with auth
│   │   ├── auth.js         # Authentication API
│   │   ├── profile.js      # Profile API
│   │   ├── internships.js  # Internships API
│   │   └── ocr.js          # Resume parsing API
│   ├── store/              # Zustand state stores
│   │   ├── authStore.js    # Auth state & user data
│   │   ├── themeStore.js   # Dark/Light theme
│   │   └── internshipStore.js # Internship data
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions
│   ├── App.jsx             # Main app with routes
│   ├── index.js            # Entry point
│   └── index.css           # Global Tailwind styles
├── package.json
├── tailwind.config.js
└── README.md
```

## 🎨 Features Implemented

### ✅ Complete & Production-Ready
- ✅ JWT Authentication (Login/Signup/Logout)
- ✅ Protected routes with auto-redirect
- ✅ Dark/Light theme toggle with persistence
- ✅ Responsive navigation with mobile menu
- ✅ AI-powered resume upload & parsing
  - OCR for images (JPG, PNG)
  - PDF text extraction
  - Auto-fill profile from resume
- ✅ Profile management with validation
- ✅ Skills tag input with auto-suggestions
- ✅ Country code selector for phone numbers
- ✅ Internship listings with search/filter
- ✅ Personalized recommendations
- ✅ Beautiful loading states & animations
- ✅ Error handling & user feedback
- ✅ API integration with backend
- ✅ State management (Zustand)
- ✅ Responsive design (mobile-first)

## 🔧 Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run ESLint
npm run lint

# Format code
npm run format
```
npm run eject
```

## 🌐 Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:3000
REACT_APP_ENV=development
```

For production (Render):
```env
REACT_APP_API_BASE_URL=https://pm-intern-fobb.onrender.com
REACT_APP_ENV=production
```

## 🎯 API Integration

The app connects to the Flask backend API using Axios. The API client in `src/services/api.js` automatically:
- Adds JWT token to requests
- Handles authentication errors
- Provides centralized error handling
- Supports request/response interceptors

**Backend must be running**:
```bash
# In the main project directory
python run.py --debug
```

## 📱 Responsive Design

Fully responsive design optimized for all devices:
- **Mobile**: 320px+ (responsive navigation, touch-friendly)
- **Tablet**: 768px+ (optimized layouts)
- **Desktop**: 1024px+ (full features)
- **Large screens**: 1440px+ (wide layouts)

## 🎨 Theming

**Dark/Light Mode**:
- Auto-detects system preference on first visit
- Toggle using moon/sun icon in navbar
- Preference persisted in localStorage
- Smooth transitions between themes
- All components support both themes

## 🔒 Authentication Flow

1. **Signup/Login** → JWT token received from backend
2. **Token Storage** → Stored in localStorage (authStore)
3. **Auto-Include** → Axios interceptor adds to all requests
4. **Route Protection** → `ProtectedRoute` checks authentication
5. **Auto-Redirect** → Unauthorized users → login page
6. **Token Refresh** → Automatic token validation

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Render
1. Connect GitHub repository
2. Set build command: `npm install && npm run build`
3. Set publish directory: `build`
4. Add environment variables (see above)
5. Deploy!

## 🐛 Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Tailwind styles not working
```bash
# Rebuild Tailwind
npm run build:css
# Or restart dev server
npm start
```

### API connection issues
- Check backend is running on correct port
- Verify CORS is configured for frontend URL
- Check `.env` has correct `REACT_APP_API_BASE_URL`
- Open browser console for detailed errors

---

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Axios](https://axios-http.com/)

---

**Built with ❤️ using React & Tailwind CSS**
# Restart dev server
npm start
```

## 📄 License

This project is part of the Intern Insight platform.

## 👥 Team

- Dhairya Sood (Lead)
- Shreyas
- Naman  
- Lavanya
- Sanchit
