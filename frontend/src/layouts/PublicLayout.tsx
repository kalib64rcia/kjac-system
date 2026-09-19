import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useBrands, useLandingContent, useServices } from "@/hooks/usePublic";
import { useUiStore } from "@/stores/ui.store";
import { Toaster } from "@/components/feedback/Toaster";
import { ScrollProgress } from "@/components/navigation/ScrollProgress";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function scrollToSection(id: string) {
  const container = document.getElementById("public-scroll");
  if (id === "home" || id === "/") {
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  const target = document.getElementById(id);
  if (!target) return;

  if (container) {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top);

    container.scrollTo({
      top: Math.round(targetScrollTop),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function useGoSection() {
  const location = useLocation();
  const navigate = useNavigate();
  return (id: string) => {
    if (location.pathname !== "/") {
      void navigate("/");
      window.setTimeout(() => scrollToSection(id), 180);
    } else {
      scrollToSection(id);
    }
  };
}

function DesktopDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 px-1 text-base font-semibold text-gray-700 outline-none hover:text-primary-600 focus-visible:text-primary-600 data-[state=open]:text-primary-600">
        {label}
        <ChevronDown size={16} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const mobileItem =
  "flex min-h-[44px] w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600";

function MobileSheet() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const [expanded, setExpanded] = useState<string | null>(null);
  const go = useGoSection();
  const services = useServices();
  const brands = useBrands();
  const { data: content } = useLandingContent();

  const jump = (id: string) => {
    setOpen(false);
    go(id);
  };
  const toggle = (key: string) => setExpanded((e) => (e === key ? null : key));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        label="Menu"
        side="left"
        onClose={() => setOpen(false)}
        className="top-20 bottom-0 left-0 right-0 h-[calc(100dvh-5rem)] w-full max-w-none border-t border-gray-200 z-40 p-0 shadow-xl bg-white"
        overlayClassName="top-20 z-40"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
          <button type="button" onClick={() => jump("home")} className={mobileItem}>
            Home
          </button>
          <button type="button" onClick={() => jump("about")} className={mobileItem}>
            About
          </button>
          <button
            type="button"
            onClick={() => toggle("services")}
            aria-expanded={expanded === "services"}
            className={cn(mobileItem, "justify-between")}
          >
            Services
            <ChevronDown size={18} aria-hidden="true" className={cn(expanded === "services" && "rotate-180")} />
          </button>
          {expanded === "services" && (
            <div className="ml-3 flex flex-col border-l-2 border-gray-100 pl-2">
              {(services.data ?? []).map((s) => (
                <button key={s.id} type="button" onClick={() => jump("services")} className={cn(mobileItem, "text-sm font-medium")}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => toggle("brands")}
            aria-expanded={expanded === "brands"}
            className={cn(mobileItem, "justify-between")}
          >
            Brands
            <ChevronDown size={18} aria-hidden="true" className={cn(expanded === "brands" && "rotate-180")} />
          </button>
          {expanded === "brands" && (
            <div className="ml-3 flex flex-col border-l-2 border-gray-100 pl-2">
              {(brands.data ?? []).map((b) => (
                <button key={b.id} type="button" onClick={() => jump("brands")} className={cn(mobileItem, "text-sm font-medium")}>
                  {b.is_partner ? `${b.name} (Official Partner)` : b.name}
                </button>
              ))}
            </div>
          )}
          {(
            [
              ["Why Choose Us", "why-us", true],
              ["Mission & Vision", "mission-vision", !!content?.mission_text?.trim() || !!content?.vision_text?.trim()],
              ["Testimonials", "testimonials", content?.show_testimonials !== false],
              ["Gallery", "guides", content?.show_gallery !== false],
              ["FAQs", "faqs", content?.show_faq !== false],
              ["Contact", "contact", true],
            ] as [string, string, boolean][]
          )
            .filter(([, , show]) => show)
            .map(([label, id]) => (
              <button key={id} type="button" onClick={() => jump(id)} className={mobileItem}>
                {label}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-gray-200 bg-white p-4">
          <Link
            to="/book"
            onClick={() => {
              setOpen(false);
              const container = document.getElementById("public-scroll");
              if (container) container.scrollTo({ top: 0, behavior: "smooth" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-primary-400 px-4 font-semibold text-white hover:bg-primary-500"
          >
            Book Appointment Now
          </Link>
          <Link
            to="/track"
            onClick={() => {
              setOpen(false);
              const container = document.getElementById("public-scroll");
              if (container) container.scrollTo({ top: 0, behavior: "smooth" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-primary-600 px-4 font-semibold text-primary-600 hover:bg-primary-50"
          >
            Track Booking Status
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const go = useGoSection();
  const services = useServices();
  const brands = useBrands();
  const { data: content } = useLandingContent();
  const location = useLocation();

  // Automatically scroll to the top of public-scroll whenever the route changes
  useEffect(() => {
    const container = document.getElementById("public-scroll");
    if (container) {
      container.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navigateToTop = () => {
    setOpen(false);
    const container = document.getElementById("public-scroll");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    navigateToTop();
    if (window.location.pathname === "/" && !window.location.hash && !window.location.search) {
      window.location.reload();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <ScrollProgress targetId="public-scroll" />
      <header className="relative z-50 h-20 shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="/"
            onClick={handleLogoClick}
            aria-label="KJAC home"
            className="flex shrink-0 cursor-pointer items-center gap-2"
          >
            <img
              src="/assets/business/kjac-logo.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <img
              src="/assets/business/kjac-brand-name.png"
              alt="Klein & Justin Airconditioning"
              className="h-7 w-auto shrink-0"
              style={{ maxWidth: 150 }}
            />
          </a>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
            <button
              type="button"
              onClick={() => go("home")}
              className="min-h-[44px] cursor-pointer text-base font-semibold text-gray-700 hover:text-primary-600"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => go("about")}
              className="min-h-[44px] cursor-pointer text-base font-semibold text-gray-700 hover:text-primary-600"
            >
              About
            </button>
            <DesktopDropdown label="Services">
              {(services.data ?? []).map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => go("services")}>
                  {s.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => go("services")} className="font-semibold text-primary-600">
                View all services →
              </DropdownMenuItem>
            </DesktopDropdown>
            <DesktopDropdown label="Brands">
              {(brands.data ?? []).filter((b) => b.is_partner).map((b) => (
                <DropdownMenuItem key={b.id} onSelect={() => go("brands")} className="font-semibold text-primary-700">
                  {b.name} (Official Partner)
                </DropdownMenuItem>
              ))}
              {(brands.data ?? []).filter((b) => !b.is_partner).map((b) => (
                <DropdownMenuItem key={b.id} onSelect={() => go("brands")}>
                  {b.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => go("brands")} className="font-semibold text-primary-600">
                View all brands →
              </DropdownMenuItem>
            </DesktopDropdown>
            <DesktopDropdown label="More">
              <DropdownMenuItem onSelect={() => go("why-us")}>Why Choose Us</DropdownMenuItem>
              {(content?.mission_text?.trim() || content?.vision_text?.trim()) && (
                <DropdownMenuItem onSelect={() => go("mission-vision")}>Mission &amp; Vision</DropdownMenuItem>
              )}
              {content?.show_testimonials !== false && (
                <DropdownMenuItem onSelect={() => go("testimonials")}>Testimonials</DropdownMenuItem>
              )}
              {content?.show_gallery !== false && (
                <DropdownMenuItem onSelect={() => go("guides")}>Gallery</DropdownMenuItem>
              )}
              {content?.show_faq !== false && (
                <DropdownMenuItem onSelect={() => go("faqs")}>FAQs</DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => go("contact")}>Contact</DropdownMenuItem>
            </DesktopDropdown>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/track"
              onClick={navigateToTop}
              className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50"
            >
              Track Booking
            </Link>
            <Link
              to="/book"
              onClick={navigateToTop}
              className="rounded-lg bg-primary-400 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            >
              Book Service Now
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 lg:hidden"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      <MobileSheet />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <ScrollArea className="min-h-0 flex-1" viewportId="public-scroll">
        <main id="main-content" className="overflow-x-clip contain-inline-size">{children}</main>
      </ScrollArea>
      <ScrollToTop targetId="public-scroll" />
      <Toaster />
    </div>
  );
}
