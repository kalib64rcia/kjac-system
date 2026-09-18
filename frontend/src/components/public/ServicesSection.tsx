import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { useService, useServices } from "@/hooks/usePublic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import { SectionDotGrid } from "./Decor";
import { cn } from "@/lib/utils";

/** Live services arrow carousel + detail modal (no payment figures on landing). */
export function ServicesSection() {
  const { data, isLoading, isError, refetch } = useServices();
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const detail = useService(selected);

  return (
    <section id="services" className="relative overflow-hidden py-14" aria-label="Services">
      <SectionDotGrid variant="primary" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Our Services</h2>
        <p className="mt-2 text-center text-gray-600">
          Professional aircon solutions for every need
        </p>
      <div className="mt-8">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading services">
            {[0, 1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {isError && <ErrorCard message="Failed to load services." onRetry={() => void refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="No services available" description="Check back soon." />
        )}
        {data && data.length > 0 && (
          <>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => trackRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                aria-label="Previous services"
                className="rounded-full border-gray-200 bg-white p-0 text-gray-600 hover:border-primary-300 hover:text-primary-600"
              >
                <ChevronLeft size={20} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => trackRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                aria-label="Next services"
                className="rounded-full border-gray-200 bg-white p-0 text-gray-600 hover:border-primary-300 hover:text-primary-600"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
            <div
              ref={trackRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const max = el.scrollWidth - el.clientWidth;
                setPage(max > 0 ? Math.round((el.scrollLeft / max) * (data.length - 1)) : 0);
              }}
              className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
              aria-label="Services carousel"
            >
              {data.map((s) => (
                <Card key={s.id} className="flex w-[85%] shrink-0 snap-start flex-col transition-shadow hover:shadow-md sm:w-[46%] lg:w-[31%]">
                <CardContent>
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Wrench size={22} aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-gray-900">{s.name}</h3>
                  {s.badge_text && (
                    <Badge className="mt-1.5">{s.badge_text}</Badge>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{s.description}</p>
                  {s.estimated_duration_display && (
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      Duration: {s.estimated_duration_display}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelected(s.id)}>
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
            </div>
            <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
              {data.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    i === Math.min(page, data.length - 1) ? "w-6 bg-primary-500" : "w-2 bg-gray-300",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
      </div>
      <Dialog open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl" onClose={() => setSelected(null)}>
          <DialogHeader>
            <DialogTitle>Service details</DialogTitle>
          </DialogHeader>
        {detail.isLoading && <CardSkeleton />}
        {detail.isError && <ErrorCard message="Failed to load service details." onRetry={() => void detail.refetch()} />}
        {detail.data && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">{detail.data.name}</h3>
            <p className="mt-2 text-gray-600">{detail.data.description}</p>
            {detail.data.detailed_description && (
              <p className="mt-2 text-gray-600">{detail.data.detailed_description}</p>
            )}
            {detail.data.estimated_duration_display && (
              <p className="mt-3 text-sm font-semibold text-gray-900">
                Estimated duration: {detail.data.estimated_duration_display}
              </p>
            )}
            <Button asChild className="mt-5 px-6">
              <Link to="/book">Book Service</Link>
            </Button>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
