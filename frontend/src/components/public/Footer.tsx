import { Link } from "react-router-dom";
import { CircleCheckBig, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useLandingContent } from "@/hooks/usePublic";
import { useGoSection } from "@/layouts/PublicLayout";
import { LANDING_DEFAULTS, type LandingContent } from "@/types/content.types";

const TAGLINES = [
  "Provide Air Solutions",
  "Trusted Brands",
  "Quality Installation",
  "Reliable After Sales",
];

/** Pure-white footer: full-nav quick links, Lucide icons, real legal routes. */
export function Footer({ content: propContent }: { content?: LandingContent } = {}) {
  const { data } = useLandingContent();
  const content = propContent ?? data ?? LANDING_DEFAULTS;
  const onSection = useGoSection();
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <img
              src="/assets/business/kjac-brand-logo.png"
              alt="Klein & Justin Airconditioning"
              className="h-12 w-auto"
              loading="lazy"
            />
            <ul className="mt-4 flex flex-col gap-1.5">
              {TAGLINES.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CircleCheckBig size={16} className="shrink-0 text-primary-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Quick links">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Quick Links</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
              <li><button type="button" onClick={() => onSection("home")} className="cursor-pointer hover:text-primary-600">Home</button></li>
              <li><button type="button" onClick={() => onSection("about")} className="cursor-pointer hover:text-primary-600">About</button></li>
              <li><button type="button" onClick={() => onSection("services")} className="cursor-pointer hover:text-primary-600">Services</button></li>
              <li><button type="button" onClick={() => onSection("brands")} className="cursor-pointer hover:text-primary-600">Brands</button></li>
              <li><button type="button" onClick={() => onSection("why-us")} className="cursor-pointer hover:text-primary-600">Why Choose Us</button></li>
              <li><button type="button" onClick={() => onSection("mission-vision")} className="cursor-pointer hover:text-primary-600">Mission &amp; Vision</button></li>
              <li><button type="button" onClick={() => onSection("testimonials")} className="cursor-pointer hover:text-primary-600">Testimonials</button></li>
              <li><button type="button" onClick={() => onSection("guides")} className="cursor-pointer hover:text-primary-600">Gallery</button></li>
              <li><button type="button" onClick={() => onSection("faqs")} className="cursor-pointer hover:text-primary-600">FAQs</button></li>
              <li><button type="button" onClick={() => onSection("contact")} className="cursor-pointer hover:text-primary-600">Contact</button></li>
            </ul>
          </nav>
          <nav aria-label="Services">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Services</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
              <li><Link to="/book" className="hover:text-primary-600">General Cleaning</Link></li>
              <li><Link to="/book" className="hover:text-primary-600">Repair</Link></li>
              <li><Link to="/book" className="hover:text-primary-600">Installation</Link></li>
              <li><Link to="/book" className="hover:text-primary-600">Preventive Maintenance</Link></li>
            </ul>
          </nav>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Contact</h3>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0 text-primary-600" aria-hidden="true" />
                <span className="tabular-nums">{content.contact_phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0 text-primary-600" aria-hidden="true" />
                <a href={`mailto:${content.contact_email}`} className="hover:text-primary-600">
                  {content.contact_email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
                <span>{content.contact_address}</span>
              </li>
            </ul>
            <div className="mt-3 flex gap-2">
              <a
                href={content.facebook_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary-600"
              >
                <Facebook size={20} />
              </a>
              <a
                href={`mailto:${content.contact_email}`}
                aria-label="Email"
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary-600"
              >
                <Mail size={20} />
              </a>
              <span
                aria-label="Instagram (coming soon)"
                title="Coming soon"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-300"
              >
                <Instagram size={20} />
              </span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>
            <Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
            {" · "}
            <Link to="/terms" className="hover:text-primary-600">Terms of Service</Link>
            {" · "}
            <Link to="/warranty" className="hover:text-primary-600">Warranty Terms</Link>
          </p>
          <p className="mt-1">© 2026 Klein &amp; Justin Airconditioning. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
