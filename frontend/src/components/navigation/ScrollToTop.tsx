import { ArrowUp, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

function resolveTarget(targetId?: string): HTMLElement | null {
  if (!targetId) return null;
  return document.getElementById(targetId);
}

/** Scroll-to-top: spring entrance, hover lift with snowflake spin,
 *  and launch pulse animation on click. Auto-hides when mobile drawer is open. */
export function ScrollToTop({ targetId }: { targetId?: string }) {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [launching, setLaunching] = useState(false);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);

  useEffect(() => {
    const el = resolveTarget(targetId);
    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const y = el ? el.scrollTop : window.scrollY;
        setVisible(y > 400);
        if (y === 0) setLaunching(false);
      });
    };

    onScroll();
    const target: HTMLElement | Window = el ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const toTop = () => {
    if (!reduced) setLaunching(true);
    const el = resolveTarget(targetId);
    if (el) {
      el.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
  };

  const isVisible = visible && !mobileNavOpen;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-40 transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
          : "translate-y-4 scale-75 opacity-0 pointer-events-none",
      )}
    >
      <button
        type="button"
        onClick={toTop}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label="Scroll to top"
        className={cn(
          "group relative flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-primary-600 via-primary-500 to-primary-400 text-white shadow-lg shadow-primary-600/30 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:ring-4 hover:ring-primary-400/20 active:scale-95 [&_svg]:pointer-events-none",
          launching && "scale-105 shadow-primary-400/60 ring-4 ring-primary-300",
        )}
      >
        {/* Launching Pulse Wave */}
        {launching && (
          <span className="absolute inset-0 rounded-full bg-primary-400/60 animate-ping pointer-events-none" />
        )}

        {/* Icons: Arrow Up & Snowflake */}
        <ArrowUp
          size={20}
          aria-hidden="true"
          className={cn(
            "relative z-10 transition-all duration-200 group-hover:-translate-y-0.5",
            hover || launching ? "scale-75 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Snowflake
          size={20}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 m-auto z-10 transition-all duration-200",
            hover || launching ? "scale-100 opacity-100" : "scale-75 opacity-0",
            launching ? "animate-spin-fast text-white" : "animate-spin-slow text-white",
          )}
        />
      </button>
    </div>
  );
}
