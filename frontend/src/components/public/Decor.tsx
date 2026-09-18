import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-section dot grid with subtle gradient pattern and smooth radial fade. */
export function SectionDotGrid({
  variant = "subtle",
  className,
}: {
  variant?: "subtle" | "primary";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Soft gradient base */}
      <div
        className={cn(
          "absolute inset-0",
          variant === "primary"
            ? "bg-gradient-to-b from-primary-50/60 via-sky-50/20 to-white"
            : "bg-gradient-to-b from-slate-50/90 via-gray-50/50 to-white",
        )}
      />
      {/* 24px dot grid matrix with smooth vignette mask */}
      <div
        className={cn(
          "absolute inset-0 [background-size:24px_24px]",
          variant === "primary"
            ? "bg-[radial-gradient(rgba(0,144,230,0.18)_1.25px,transparent_1.25px)]"
            : "bg-[radial-gradient(rgba(100,116,139,0.16)_1.25px,transparent_1.25px)]",
          "[mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]",
        )}
      />
    </div>
  );
}

/** One-time scroll reveal (subtle rise; instant under reduced-motion). */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
