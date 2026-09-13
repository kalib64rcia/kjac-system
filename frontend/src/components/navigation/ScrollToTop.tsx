import { ArrowUp, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function resolveTarget(targetId?: string): HTMLElement | null {
  if (!targetId) return null;
  return document.getElementById(targetId);
}

/** Scroll-to-top: arrow → slow-spinning snowflake on hover, rocket spin on click.
 *  Scrolls the given viewport (app-shell pattern), falling back to window. */
export function ScrollToTop({ targetId }: { targetId?: string }) {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const el = resolveTarget(targetId);
    const onScroll = () => {
      const y = el ? el.scrollTop : window.scrollY;
      setVisible(y > 600);
      if (y === 0) setLaunching(false);
    };
    onScroll();
    const target: HTMLElement | Window = el ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [targetId]);

  if (!visible) return null;

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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toTop}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 active:scale-95 [&_svg]:pointer-events-none"
        >
          <ArrowUp
            size={22}
            aria-hidden="true"
            className={cn(
              "transition-opacity duration-150",
              hover || launching ? "opacity-0" : "opacity-100",
            )}
          />
          <Snowflake
            size={22}
            aria-hidden="true"
            className={cn(
              "absolute inset-0 m-auto transition-opacity duration-150",
              hover || launching ? "opacity-100" : "opacity-0",
              launching ? "animate-spin-fast" : "animate-spin-slow",
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">Back to top</TooltipContent>
    </Tooltip>
  );
}
