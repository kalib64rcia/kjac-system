import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/types/content.types";

/** About section: banner-2 side image + editable text. */
export function AboutSection({ content }: { content: LandingContent }) {
  return (
    <section id="about" className="relative mx-auto max-w-7xl overflow-hidden px-4 py-14 sm:px-6" aria-label="About">
      <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        <img
          src="/assets/business/kjac-banner-2.jpg"
          alt="KJAC service van and shop in Sta. Cruz, Laguna"
          loading="lazy"
          className="w-full min-w-0 rounded-xl border border-gray-200 object-cover shadow-md"
        />
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">About KJAC</h2>
          <p className="mt-3 leading-relaxed text-gray-600">{content.about_text}</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm font-medium text-gray-700">
            <li>✓ Residential &amp; commercial AC services</li>
            <li>✓ Official Daikin partner</li>
            <li>✓ Certified technicians</li>
          </ul>
          <Button asChild className="mt-6 px-6">
            <Link to="/book">View Our Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
