import { Link } from "react-router-dom";
import type { LandingContent } from "@/types/content.types";
import { Blobs } from "./Decor";

/** About section: banner-2 side image + editable text. */
export function AboutSection({ content }: { content: LandingContent }) {
  return (
    <section id="about" className="relative mx-auto max-w-7xl scroll-mt-24 overflow-hidden px-4 py-14 sm:px-6" aria-label="About">
      <Blobs variant="mono" />
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
          <Link
            to="/book"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-400 px-6 text-sm font-semibold text-white hover:bg-primary-500"
          >
            View Our Services
          </Link>
        </div>
      </div>
    </section>
  );
}
