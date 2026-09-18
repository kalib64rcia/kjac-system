import { Clock, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/types/content.types";

/** Contact info (display-only — no backend contact endpoint exists). */
export function ContactSection({ content }: { content: LandingContent }) {
  const secondary = content.contact_phone_secondary.trim();
  return (
    <section id="contact" className="relative mx-auto max-w-7xl overflow-hidden px-4 py-14 sm:px-6" aria-label="Contact">
      <h2 className="relative text-center text-2xl font-bold text-gray-900 sm:text-3xl">Visit Us</h2>
      <div className="relative mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-lg font-bold text-gray-900">Klein &amp; Justin Airconditioning</p>
        <ul className="mt-4 flex flex-col gap-3 text-gray-700">
          <li className="flex items-start gap-2.5">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            <span>{content.contact_address}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Phone size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            <span className="tabular-nums">
              {content.contact_phone}
              {secondary && <span> · {secondary}</span>}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Mail size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            <a href={`mailto:${content.contact_email}`} className="font-medium text-primary-600 hover:underline">
              {content.contact_email}
            </a>
          </li>
          <li className="flex items-start gap-2.5">
            <Clock size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            <span>{content.business_hours}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Facebook size={18} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            <a href={content.facebook_url} target="_blank" rel="noreferrer" className="font-medium text-primary-600 hover:underline">
              Facebook page
            </a>
          </li>
        </ul>
        <Button asChild className="mt-6 px-6">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.contact_address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Get Directions
          </a>
        </Button>
      </div>
    </section>
  );
}
