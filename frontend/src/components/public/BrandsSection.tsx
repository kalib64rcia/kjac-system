import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BadgeCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrands } from "@/hooks/usePublic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LOCAL_LOGOS: Record<string, string> = {
  carrier: "/assets/brands/carrier-logo.svg",
  daikin: "/assets/brands/daikin-logo.svg",
  hitachi: "/assets/brands/hitachi-logo.svg",
  lg: "/assets/brands/lg-logo.svg",
  midea: "/assets/brands/midea-logo.svg",
  panasonic: "/assets/brands/panasonic-logo.svg",
  samsung: "/assets/brands/samsung-logo.svg",
  sharp: "/assets/brands/sharp-logo.svg",
  tcl: "/assets/brands/tcl-logo.svg",
  toshiba: "/assets/brands/toshiba-logo.svg",
};

/** Daikin spotlight + swipable/draggable brands carousel with soft edge fading. */
export function BrandsSection() {
  const { data, isLoading, isError, refetch } = useBrands();
  const partner = data?.find((b) => b.is_partner);

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const isInteractingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  // Triple the dataset for seamless infinite looping
  const items = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data, ...data, ...data];
  }, [data]);

  // Center initial scroll position once data loads so dragging left or right works immediately
  useEffect(() => {
    const el = trackRef.current;
    if (!el || items.length === 0) return;
    const singleSetWidth = el.scrollWidth / 3;
    if (singleSetWidth > 0 && el.scrollLeft === 0) {
      el.scrollLeft = singleSetWidth;
    }
  }, [items.length]);

  // Continuous subtle auto-scroll (marquee) when not interacting
  useEffect(() => {
    const el = trackRef.current;
    if (!el || items.length === 0) return;
    let rafId: number;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = 0.6; // pixels per animation frame

    const step = () => {
      if (!reduced && !isInteractingRef.current && !isHoveredRef.current && el) {
        el.scrollLeft += speed;
        const singleSetWidth = el.scrollWidth / 3;
        if (singleSetWidth > 0) {
          if (el.scrollLeft >= singleSetWidth * 2) {
            el.scrollLeft -= singleSetWidth;
          } else if (el.scrollLeft <= 0) {
            el.scrollLeft += singleSetWidth;
          }
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [items.length]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !trackRef.current) return;
    setIsDragging(true);
    isInteractingRef.current = true;
    startXRef.current = e.pageX;
    startScrollLeftRef.current = trackRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const dx = e.pageX - startXRef.current;
    const el = trackRef.current;
    el.scrollLeft = startScrollLeftRef.current - dx;

    // Infinite boundary check while dragging
    const singleSetWidth = el.scrollWidth / 3;
    if (singleSetWidth > 0) {
      if (el.scrollLeft >= singleSetWidth * 2) {
        el.scrollLeft -= singleSetWidth;
        startScrollLeftRef.current -= singleSetWidth;
      } else if (el.scrollLeft <= singleSetWidth * 0.1) {
        el.scrollLeft += singleSetWidth;
        startScrollLeftRef.current += singleSetWidth;
      }
    }
  };

  const stopDragging = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      isInteractingRef.current = false;
    }, 600);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    stopDragging();
  };

  // Touch Screen Handlers
  const handleTouchStart = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      isInteractingRef.current = false;
    }, 1200);
  };

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || items.length === 0) return;
    const singleSetWidth = el.scrollWidth / 3;
    if (singleSetWidth > 0) {
      if (el.scrollLeft >= singleSetWidth * 2) {
        el.scrollLeft -= singleSetWidth;
      } else if (el.scrollLeft <= singleSetWidth * 0.1) {
        el.scrollLeft += singleSetWidth;
      }
    }
  };

  return (
    <section id="brands" className="bg-gray-50 py-14" aria-label="Brands">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {partner && (
          <div className="mx-auto mb-10 max-w-3xl rounded-xl border border-primary-200 bg-gradient-to-b from-primary-50 to-white p-6 text-center shadow-md sm:p-8">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <BadgeCheck size={14} aria-hidden="true" />
              Official {partner.name} Partner
            </p>
            <div className="mt-4 flex justify-center">
              <img
                src={LOCAL_LOGOS[partner.slug] ?? partner.logo_url ?? ""}
                alt={`${partner.name} logo`}
                className="h-14 w-auto"
                loading="lazy"
                draggable={false}
              />
            </div>
            {partner.description && (
              <p className="mx-auto mt-3 max-w-xl text-gray-600">{partner.description}</p>
            )}
            <Button asChild className="mt-5 px-6">
              <Link to="/book">Book {partner.name} Service</Link>
            </Button>
          </div>
        )}
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          All Supported Brands
        </h2>
        <p className="mt-2 text-center text-gray-600">We service all major aircon brands</p>

        <div className="mt-8">
          {isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading brands">
              {[0, 1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}
          {isError && <ErrorCard message="Failed to load brands." onRetry={() => void refetch()} />}
          {data && data.length === 0 && (
            <EmptyState title="No brands listed" description="Check back soon." />
          )}

          {data && data.length > 0 && (
            <div
              className="relative overflow-hidden py-1"
              aria-label="Supported brands carousel"
            >
              {/* Left Soft Edge Fade Overlay */}
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 sm:w-28 bg-gradient-to-r from-gray-50 via-gray-50/80 to-transparent"
                aria-hidden="true"
              />

              {/* Right Soft Edge Fade Overlay */}
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 sm:w-28 bg-gradient-to-l from-gray-50 via-gray-50/80 to-transparent"
                aria-hidden="true"
              />

              {/* Swipable & Draggable Scroll Track with CSS Mask for edge transparency */}
              <div
                ref={trackRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={() => { isHoveredRef.current = true; }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onScroll={handleScroll}
                style={{
                  maskImage: "linear-gradient(to right, transparent 0%, black 56px, black calc(100% - 56px), transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 56px, black calc(100% - 56px), transparent 100%)",
                }}
                className={cn(
                  "no-scrollbar flex w-full gap-4 overflow-x-auto select-none touch-pan-x",
                  isDragging ? "cursor-grabbing" : "cursor-grab",
                )}
              >
                {items.map((b, i) => (
                  <Card
                    key={`${b.id}-${i}`}
                    aria-hidden={i >= data.length}
                    className="w-40 shrink-0 transition-shadow select-none hover:shadow-md sm:w-48"
                  >
                    <CardContent className="p-4">
                      <div className="flex h-16 items-center justify-center">
                        <img
                          src={LOCAL_LOGOS[b.slug] ?? b.logo_url ?? ""}
                          alt={i < data.length ? `${b.name} logo` : ""}
                          className="max-h-14 w-auto select-none pointer-events-none"
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                      <p className="mt-2 text-center font-semibold text-gray-900">{b.name}</p>
                      {b.badge_text && (
                        <div className="mt-1.5 text-center">
                          <Badge>{b.badge_text}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

