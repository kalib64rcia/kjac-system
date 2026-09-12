import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dot-grid accent with blue tint (decorative section corners). */
export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute h-48 w-48 opacity-100", className)}
      style={{
        backgroundImage: "radial-gradient(rgba(0,144,230,0.18) 1.5px, transparent 1.5px)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

/** Slow-drifting blurred color blobs (subtle life; silenced by reduced-motion). */
export function Blobs({ variant = "cool" }: { variant?: "cool" | "warm" | "mono" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className={cn(
          "absolute -left-20 top-10 h-72 w-72 rounded-full blur-3xl animate-blob-a",
          variant === "cool" && "bg-primary-100/70",
          variant === "warm" && "bg-warning-50",
          variant === "mono" && "bg-gray-100",
        )}
      />
      <span
        className={cn(
          "absolute -right-16 bottom-0 h-80 w-80 rounded-full blur-3xl animate-blob-b",
          variant === "cool" && "bg-secondary-light/30",
          variant === "warm" && "bg-primary-100/60",
          variant === "mono" && "bg-gray-100/80",
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
