import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = {};

export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoringRef = useRef(false);

  // Save scroll position continuously
  useEffect(() => {
    const handleScroll = () => {
      positions[location.pathname] = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  // Handle scroll (CRITICAL: useLayoutEffect)
  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      restoringRef.current = true;

      const saved = positions[location.pathname];

      if (saved !== undefined) {
        window.scrollTo(0, saved);
      }

      // unlock after frame
      requestAnimationFrame(() => {
        restoringRef.current = false;
      });

      return;
    }

    // Only scroll top if NOT restoring
    if (!restoringRef.current) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navigationType]);

  return null;
}
