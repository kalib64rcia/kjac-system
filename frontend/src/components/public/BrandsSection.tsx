import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useBrands } from "@/hooks/usePublic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard } from "@/components/shared/PageHeader";
import { CardSkeleton } from "@/components/ui/skeleton";

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

/** Daikin spotlight + live brands carousel (logos prefer local SVGs). */
export function BrandsSection() {
  const { data, isLoading, isError, refetch } = useBrands();
  const partner = data?.find((b) => b.is_partner);

  return (
    <section id="brands" className="scroll-mt-24 bg-gray-50 py-14" aria-label="Brands">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {partner && (
          <div className="mx-auto mb-10 max-w-3xl rounded-xl border border-primary-200 bg-gradient-to-b from-primary-50 to-white p-6 text-center shadow-md sm:p-8">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <Star size={14} aria-hidden="true" />
              Official {partner.name} Partner
            </p>
            <div className="mt-4 flex justify-center">
              <img
                src={LOCAL_LOGOS[partner.slug] ?? partner.logo_url ?? ""}
                alt={`${partner.name} logo`}
                className="h-14 w-auto"
                loading="lazy"
              />
            </div>
            {partner.description && (
              <p className="mx-auto mt-3 max-w-xl text-gray-600">{partner.description}</p>
            )}
            <Link
              to="/book"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-400 px-6 text-sm font-semibold text-white hover:bg-primary-500"
            >
              Book {partner.name} Service
            </Link>
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
              className="group overflow-hidden"
              aria-label="Supported brands carousel"
            >
              <div className="flex w-max animate-marquee gap-4 pr-4 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
                {[...data, ...data].map((b, i) => (
                  <Card
                    key={`${b.id}-${i}`}
                    aria-hidden={i >= data.length}
                    className="w-40 shrink-0 transition-shadow hover:shadow-md sm:w-48"
                  >
                    <CardContent>
                      <div className="flex h-16 items-center justify-center">
                        <img
                          src={LOCAL_LOGOS[b.slug] ?? b.logo_url ?? ""}
                          alt={i < data.length ? `${b.name} logo` : ""}
                          className="max-h-14 w-auto"
                          loading="lazy"
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
