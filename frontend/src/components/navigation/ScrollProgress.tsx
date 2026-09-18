import { useEffect, useRef } from "react";

/** Thin scroll-progress bar. Tracks the given scroll viewport with zero delay
 *  (GPU-accelerated scaleX via RAF). Clean gradient with no shadow or delays. */
export function ScrollProgress({ targetId }: { targetId?: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = targetId ? document.getElementById(targetId) : null;
    let rafId: number | null = null;

    const update = () => {
      const y = el ? el.scrollTop : window.scrollY;
      const total = el
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;

      // 1:1 Instant GPU transform — zero delay, zero CSS layout reflow
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    update();
    const target: HTMLElement | Window = el ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-primary-600 via-primary-400 to-teal-400 will-change-transform"
      ref={barRef}
      style={{ transform: "scaleX(0)", transformOrigin: "left" }}
      aria-hidden="true"
    />
  );
}
