import { BookingForm } from "@/components/public/booking/BookingForm";
import { Blobs, DotGrid } from "@/components/public/Decor";
import { PageHeader } from "@/components/shared/PageHeader";

/** Guest booking page (Sprint 2). */
export function BookPage() {
  return (
    <div className="relative overflow-hidden">
      <Blobs variant="cool" />
      <DotGrid className="right-4 top-10 hidden lg:block" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Book Your Appointment"
          description="No account needed · Fast & easy · Secure payment"
        />
        <BookingForm />
      </div>
    </div>
  );
}
