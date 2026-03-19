import { useState, useEffect } from 'react';
import { getAnnouncements } from '../services/api';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAnnouncements({ limit: 3 })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {
        if (!cancelled) setAnnouncements([]);
      });
    return () => { cancelled = true; };
  }, []);

  if (announcements.length === 0 || !isVisible) return null;

  return (
    <div className="relative pr-12 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950">
      <div className="w-full px-4 py-2.5 sm:py-3 text-center">
        {announcements.map((a) => (
          <div key={a.id} className="py-1 sm:py-0.5 first:pt-0 last:pb-0">
            <p className="font-bold text-sm sm:text-base">
              🔥 {(a.title || '').trim() || 'Marketplace Announcement'}
            </p>
            <p className="text-xs sm:text-sm mt-0.5 opacity-95 line-clamp-2 sm:line-clamp-none">
              {a.body}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        aria-label="Close announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-black font-semibold text-sm transition hover:scale-105 active:scale-95"
      >
        ✕
      </button>
    </div>
  );
}
