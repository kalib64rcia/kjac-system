import { useEffect, useState } from "react";

/** Thin scroll-progress bar for the landing page (see FRONTEND_PLAN.md). */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, window.scrollY / total) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-primary-400 transition-[width]"
      style={{ width: `${progress * 100}%` }}
      aria-hidden="true"
    />
  );
}
