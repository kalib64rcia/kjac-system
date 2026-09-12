import { useLandingContent } from "@/hooks/usePublic";
import { LANDING_DEFAULTS } from "@/types/content.types";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";
import { AboutSection } from "@/components/public/AboutSection";
import { AnnouncementBar } from "@/components/public/AnnouncementBar";
import { BrandsSection } from "@/components/public/BrandsSection";
import { ContactSection } from "@/components/public/ContactSection";
import { Blobs, Reveal } from "@/components/public/Decor";
import { Faq } from "@/components/public/Faq";
import { Footer } from "@/components/public/Footer";
import { GuidesGrid } from "@/components/public/GuidesGrid";
import { Hero } from "@/components/public/Hero";
import { MissionVision } from "@/components/public/MissionVision";
import { PromoBand } from "@/components/public/PromoBand";
import { ServicesSection } from "@/components/public/ServicesSection";
import { Testimonials } from "@/components/public/Testimonials";
import { WhyChooseUs } from "@/components/public/WhyChooseUs";

/** Full landing page (Sprint 2+). Content falls back to defaults offline. */
export function HomePage() {
  const { data, isLoading } = useLandingContent();
  const content = data ?? LANDING_DEFAULTS;

  return (
    <>
      <AnnouncementBar content={content} />
      <Hero content={data} loading={isLoading} />
      <Reveal><AboutSection content={content} /></Reveal>
      <Reveal><ServicesSection /></Reveal>
      <BrandsSection />
      <Reveal><WhyChooseUs /></Reveal>
      <MissionVision content={content} />
      {content.show_testimonials && <Testimonials />}
      {content.show_gallery && (
        <Reveal><GuidesGrid /></Reveal>
      )}
      <PromoBand />
      {content.show_faq && <Faq items={content.faq_items} />}
      <ContactSection content={content} />
      <div className="relative overflow-hidden">
        <Blobs variant="mono" />
        <div className="relative">
          <Footer content={content} />
        </div>
      </div>
      <ScrollToTop />
    </>
  );
}
