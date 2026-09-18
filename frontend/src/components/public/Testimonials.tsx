import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionDotGrid } from "./Decor";
import { StatsBand } from "./StatsBand";
import { cn } from "@/lib/utils";

/** Static curated testimonials (live customer ratings arrive later). */
const TESTIMONIALS = [
  {
    quote: "Excellent service! Very professional and prompt. My aircon is working perfectly now. Highly recommended!",
    name: "Maria Santos",
    area: "Sta. Cruz, Laguna",
    service: "Aircon Repair",
    initials: "MS",
    tint: "bg-primary-100 text-primary-700",
  },
  {
    quote: "Fast booking, on-time technician, and honest pricing. The installation was clean from start to finish.",
    name: "Jose Ramos",
    area: "Pagsanjan, Laguna",
    service: "Aircon Installation",
    initials: "JR",
    tint: "bg-success-50 text-success-700",
  },
  {
    quote: "They explained everything before starting and left the area spotless. True Daikin experts.",
    name: "Ana Villanueva",
    area: "Sta. Cruz, Laguna",
    service: "Preventive Maintenance",
    initials: "AV",
    tint: "bg-warning-50 text-warning-700",
  },
];

/** Auto-rotating testimonial carousel (pauses on hover/focus). */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => window.clearInterval(t);
  }, [paused]);

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  const t = TESTIMONIALS[index] as (typeof TESTIMONIALS)[number];

  return (
    <section id="testimonials" className="relative overflow-hidden py-14" aria-label="Testimonials">
      <SectionDotGrid variant="primary" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          What Our Customers Say
        </h2>
        <div
          className="relative mx-auto mt-8 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Card className="shadow-sm">
            <CardContent>
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold", t.tint)}
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <div className="flex gap-0.5 text-warning-500" aria-label="Rated 5 out of 5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={16} fill="currentColor" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-2 text-lg leading-relaxed text-gray-800">
                    “{t.quote}”
                  </blockquote>
                  <p className="mt-3 font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">Verified Customer · {t.area}</p>
                  <p className="mt-1 text-sm font-medium text-primary-600">{t.service}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="rounded-full border-gray-200 bg-white p-0 text-gray-600 hover:border-primary-300 hover:text-primary-600"
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="flex gap-2" role="tablist" aria-label="Testimonials">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show testimonial from ${item.name}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2.5 rounded-full transition-colors",
                      i === index ? "w-7 bg-primary-500" : "w-2.5 bg-gray-300 hover:bg-gray-400",
                    )}
                  />
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="rounded-full border-gray-200 bg-white p-0 text-gray-600 hover:border-primary-300 hover:text-primary-600"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
        <div className="mt-8">
          <StatsBand />
        </div>
      </div>
    </section>
  );
}
