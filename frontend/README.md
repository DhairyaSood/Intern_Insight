# Intern Insight - React Frontend

Modern React frontend for the Intern Insight internship recommendation platform.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend API running on http://127.0.0.1:3000

### Installation

```bash
# Navigate to frontend-new directory
cd frontend-new

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## 📦 Tech Stack

- **React 18** - UI library
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Tesseract.js** - OCR for resume parsing
- **Lucide React** - Icons
- **React Hook Form** - Form handling

## 🏗️ Project Structure

```
frontend-new/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/           # Login, Signup, ProtectedRoute
│   │   ├── Common/         # Navbar, Footer, ThemeToggle, etc.
│   │   ├── Internships/    # Internship components (to be built)
│   │   ├── Profile/        # Profile form, Resume upload (to be built)
│   │   ├── Company/        # Company dashboard (to be built)
│   │   └── Recommendations/ # AI recommendations (to be built)
│   ├── pages/              # Page components
│   ├── services/           # API service functions
│   ├── store/              # Zustand state stores
│   ├── utils/              # Helper functions
│   ├── hooks/              # Custom React hooks
│   ├── App.jsx             # Main app component
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
├── tailwind.config.js
└── README.md
```

## 🎨 Features Implemented

### ✅ Complete
- Authentication (Login/Signup)
- Protected routes
- Dark/Light theme toggle
- Responsive navigation
- API integration with backend
- State management (Zustand)
- Tailwind CSS styling
- Error handling
- Loading states

### 🚧 To Be Built
- Internship detail pages
- Profile form with validation
- Resume upload with OCR
- Like/Dislike functionality
- Recommendations panel
- Applications tracking
- Company dashboard
- Advanced filters

## 🔧 Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject (one-way operation)
npm run eject
```

## 🌐 Environment Variables

Create a `.env` file in the root:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:3000/api
REACT_APP_API_VERSION=v1
REACT_APP_ENV=development
```

## 🎯 API Integration

The app connects to the Flask backend API. Make sure the backend is running:

```bash
# In the main project directory
python run.py
```

## 📱 Responsive Design

The app is fully responsive and optimized for:
- Mobile (320px+)
- Tablet (768px+)
- Desktop (1024px+)
- Large screens (1440px+)

## 🎨 Theming

Dark mode is supported and persisted in localStorage. Users can toggle between light and dark themes using the moon/sun icon in the navbar.

## 🔒 Authentication Flow

1. User signs up or logs in
2. JWT token is stored in localStorage
3. Token is automatically included in all API requests
4. Protected routes check authentication status
5. Unauthorized users are redirected to login

## 📝 Next Steps

1. Build internship listing components
2. Implement profile form with resume OCR
3. Add like/dislike interaction buttons
4. Create recommendations panel
5. Build application tracking system
6. Implement company dashboard

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
set PORT=3001 && npm start
```

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### Tailwind styles not working
```bash
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
