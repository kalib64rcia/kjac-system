import { ArrowUp, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Scroll-to-top: arrow → slow-spinning snowflake on hover, rocket spin on click. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
      if (window.scrollY === 0) setLaunching(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => {
            if (!reduced) setLaunching(true);
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 active:scale-95"
        >
          {hover || launching ? (
            <Snowflake
              size={22}
              aria-hidden="true"
              className={cn(launching ? "animate-spin-fast" : "animate-spin-slow")}
            />
          ) : (
            <ArrowUp size={22} aria-hidden="true" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">Back to top</TooltipContent>
    </Tooltip>
  );
}
