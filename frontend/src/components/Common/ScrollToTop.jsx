import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_RESTORE_KEY = '__scroll_restore__';

/**
 * ScrollToTop component - automatically scrolls to top of page on route change
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // If a full-page reload is about to restore scroll, don't force-scroll to top.
    try {
      if (sessionStorage.getItem(SCROLL_RESTORE_KEY)) {
        return;
      }
    } catch {
      // ignore storage errors
    }

    // Scroll to top smoothly whenever the route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
    });
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;
