import { useEffect, useState } from "react";

/** Thin scroll-progress bar. Tracks the given scroll viewport (app-shell
 *  pattern: the window itself never scrolls), falling back to window. */
export function ScrollProgress({ targetId }: { targetId?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = targetId ? document.getElementById(targetId) : null;
    if (!el) {
      const onWindowScroll = () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(total > 0 ? Math.min(1, window.scrollY / total) : 0);
      };
      onWindowScroll();
      window.addEventListener("scroll", onWindowScroll, { passive: true });
      return () => window.removeEventListener("scroll", onWindowScroll);
    }
    const onScroll = () => {
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(1, el.scrollTop / total) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [targetId]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-primary-400 transition-[width]"
      style={{ width: `${progress * 100}%` }}
      aria-hidden="true"
    />
  );
}
