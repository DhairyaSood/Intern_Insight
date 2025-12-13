import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import Navbar from './components/Common/Navbar';
import Footer from './components/Common/Footer';
import ScrollToTop from './components/Common/ScrollToTop';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import InternshipsPage from './pages/InternshipsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import InternshipDetailPage from './pages/InternshipDetailPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import MyInteractionsPage from './pages/MyInteractionsPage';
import NotFound from './pages/NotFound';

const SCROLL_RESTORE_KEY = '__scroll_restore__';
const LAST_INTERACTION_KEY = '__last_interaction__';
const INTERNSHIP_ANCHOR_PREFIX = 'internship-card-';

function App() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme on app load
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // Prevent the browser from doing its own scroll restoration.
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Restore scroll after full-page refresh triggered by an interaction.
    try {
      const raw = sessionStorage.getItem(SCROLL_RESTORE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      const y = typeof data?.y === 'number' ? data.y : null;
      const path = data?.path;
      const ts = data?.ts;
      const anchorId = typeof data?.anchorId === 'string' ? data.anchorId : null;
      const anchorOffset = typeof data?.anchorOffset === 'number' ? data.anchorOffset : null;
      const targetInternshipId = typeof data?.targetInternshipId === 'string' ? data.targetInternshipId : null;

      if (y === null && !anchorId) {
        sessionStorage.removeItem(SCROLL_RESTORE_KEY);
        return;
      }
      if (path && path !== window.location.pathname) {
        sessionStorage.removeItem(SCROLL_RESTORE_KEY);
        return;
      }
      if (typeof ts === 'number' && Date.now() - ts > 10_000) {
        sessionStorage.removeItem(SCROLL_RESTORE_KEY);
        return;
      }

      // Let the Internships page handle its own restoration (it may need to expand
      // pagination so the anchor element exists).
      if (path === '/internships' && (targetInternshipId || (anchorId && anchorId.startsWith(INTERNSHIP_ANCHOR_PREFIX)))) {
        return;
      }

      const restoreByAnchor = () => {
        if (!anchorId || anchorOffset === null) return false;
        const el = document.getElementById(anchorId);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const currentTop = rect.top + window.scrollY;
        const target = Math.max(0, currentTop - anchorOffset);
        window.scrollTo({ top: target, behavior: 'auto' });
        return true;
      };

      const restoreByY = () => {
        if (y === null) return;
        window.scrollTo({ top: y, behavior: 'auto' });
      };

      const restore = () => {
        // Prefer anchor-based restore if possible.
        if (!restoreByAnchor()) {
          restoreByY();
        }
      };

      // Restore after mount + a small delay to let layout settle.
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
        setTimeout(restore, 50);
        setTimeout(restore, 250);
      });

      // Important: don't clear the key until after ScrollToTop has had a chance
      // to see it (otherwise it may force-scroll to top on first paint).
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SCROLL_RESTORE_KEY);
        } catch {
          // ignore
        }
      }, 800);
    } catch {
      // Ignore malformed sessionStorage
    }
  }, []);

  useEffect(() => {
    // User request: avoid in-place refresh; reload the whole page on interaction.
    const handler = (e) => {
      try {
        const detail = e?.detail ?? {};

        // Try to capture a stable anchor (nearest internship card) so we can restore
        // even if layout changes slightly.
        let anchorId = null;
        let anchorOffset = null;
        try {
          const probe = document.elementFromPoint(
            Math.floor(window.innerWidth / 2),
            Math.floor(window.innerHeight * 0.3)
          );
          let node = probe;
          while (node && node !== document.body) {
            if (node.id && String(node.id).startsWith(INTERNSHIP_ANCHOR_PREFIX)) {
              anchorId = node.id;
              const rect = node.getBoundingClientRect();
              anchorOffset = rect.top;
              break;
            }
            node = node.parentElement;
          }
        } catch {
          // ignore
        }

        sessionStorage.setItem(
          SCROLL_RESTORE_KEY,
          JSON.stringify({
            y: window.scrollY,
            path: window.location.pathname,
            ts: Date.now(),
            anchorId,
            anchorOffset,
            targetInternshipId:
              (typeof detail?.internship_id === 'string' && detail.internship_id) ||
              (anchorId && String(anchorId).startsWith(INTERNSHIP_ANCHOR_PREFIX)
                ? String(anchorId).slice(INTERNSHIP_ANCHOR_PREFIX.length)
                : null),
          })
        );
        sessionStorage.setItem(
          LAST_INTERACTION_KEY,
          JSON.stringify({ type: e?.type, detail, ts: Date.now(), path: window.location.pathname })
        );
      } catch {
        // If storage fails, still attempt reload.
      }

      window.location.reload();
    };

    window.addEventListener('internship-interaction-changed', handler);
    window.addEventListener('company-interaction-changed', handler);
    return () => {
      window.removeEventListener('internship-interaction-changed', handler);
      window.removeEventListener('company-interaction-changed', handler);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/internships" element={<InternshipsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:companyId" element={<CompanyDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/internship/:id"
              element={
                <ProtectedRoute>
                  <InternshipDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-applications"
              element={
                <ProtectedRoute>
                  <MyApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-interactions"
              element={
                <ProtectedRoute>
                  <MyInteractionsPage />
                </ProtectedRoute>
              }
            />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
