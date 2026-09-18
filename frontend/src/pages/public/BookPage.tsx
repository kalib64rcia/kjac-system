import { BookingForm } from "@/components/public/booking/BookingForm";
import { SectionDotGrid } from "@/components/public/Decor";
import { Footer } from "@/components/public/Footer";
import { PageHeader } from "@/components/shared/PageHeader";

/** Guest booking page (Sprint 2). */
export function BookPage() {
  return (
    <>
      <div className="relative overflow-hidden">
        <SectionDotGrid variant="primary" />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <PageHeader
            title="Book Your Appointment"
            description="No account needed · Fast & easy · Secure payment"
          />
          <BookingForm />
        </div>
      </div>
      <Footer />
    </>
  );
}
