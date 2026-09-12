import { Link } from "react-router-dom";
import { BadgeCheck, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LandingContent } from "@/types/content.types";

interface HeroProps {
  content: LandingContent | undefined;
  loading: boolean;
}

const ORDER = ["badge", "title", "desc", "trust", "cta"] as const;

/** Tall centered hero: wordmark H1, even rhythm, staged entrance. */
export function Hero({ content, loading }: HeroProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(ORDER.length);
      return;
    }
    const timers = ORDER.map((_, i) =>
      window.setTimeout(() => setStage(i + 1), 120 + i * 140),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const vis = (i: number) =>
    cn(
      "transition-all duration-500",
      stage > i ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
    );

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-secondary-dark" aria-label="Introduction">
      <img
        src="/assets/business/kjac-banner-1.jpg"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-secondary-dark/90 via-secondary-dark/75 to-secondary-dark/90"
        aria-hidden="true"
      />
      {/* floating snowflake easter egg */}
      <span aria-hidden="true" className="absolute right-[12%] top-[18%] hidden text-white/20 animate-blob-a sm:block">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="3.3" y1="7" x2="20.7" y2="17" />
          <line x1="3.3" y1="17" x2="20.7" y2="7" />
          <line x1="12" y1="2" x2="9.5" y2="4.5" />
          <line x1="12" y1="2" x2="14.5" y2="4.5" />
          <line x1="12" y1="22" x2="9.5" y2="19.5" />
          <line x1="12" y1="22" x2="14.5" y2="19.5" />
        </svg>
      </span>
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/30", vis(0))}>
          <BadgeCheck size={14} aria-hidden="true" />
          Authorized Aircon Specialist
        </span>
        {loading || !content ? (
          <div className="mt-6 w-full" aria-busy="true" aria-label="Loading">
            <Skeleton className="mx-auto h-16 w-3/4 bg-white/20" />
            <Skeleton className="mx-auto mt-4 h-5 w-2/3 bg-white/20" />
          </div>
        ) : (
          <>
            <h1 className={cn("mt-6 flex justify-center", vis(1))}>
              <img
                src="/assets/business/kjac-brand-name.png"
                alt="Klein & Justin Airconditioning"
                className="w-full max-w-[640px] [filter:drop-shadow(0_2px_6px_rgba(0,20,40,0.9))_drop-shadow(0_12px_32px_rgba(0,20,40,0.6))]"
                fetchPriority="high"
              />
            </h1>
            <p className={cn("mt-5 max-w-2xl text-balance text-base font-medium leading-relaxed text-gray-100 sm:text-lg", vis(2))}>
              {content.hero_description}
            </p>
          </>
        )}
        <ul className={cn("mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-white", vis(3))}>
          <li className="inline-flex items-center gap-1.5">
            <BadgeCheck size={16} className="text-secondary-accent" aria-hidden="true" />
            Official Daikin Partner
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users size={16} className="text-secondary-accent" aria-hidden="true" />
            500+ customers served
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Star size={16} className="text-secondary-accent" aria-hidden="true" />
            Same-day service available
          </li>
        </ul>
        <div className={cn("mt-9 flex flex-col gap-3 sm:flex-row", vis(4))}>
          <Link
            to="/book"
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-lg bg-primary-400 px-8 text-base font-semibold text-white transition hover:bg-primary-500 active:scale-[0.98]"
          >
            Book Service
          </Link>
          <Link
            to="/track"
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-lg bg-white/10 px-8 text-base font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/20 active:scale-[0.98]"
          >
            Track Booking
          </Link>
        </div>
      </div>
    </section>
  );
}
