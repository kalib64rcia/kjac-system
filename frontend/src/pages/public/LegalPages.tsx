import { PageHeader } from "@/components/shared/PageHeader";

/**
 * Interim legal page (placeholder copy — admin-editable keys deferred:
 * privacy_text, terms_text, warranty_text).
 */
export function LegalPage({ title, updated, body }: { title: string; updated: string; body: string[] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title={title} description={`Last updated: ${updated}`} />
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        {body.map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed text-gray-600 last:mb-0">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

const INTERIM = "This is interim content published for staging review. The final policy text will be provided by the business and managed from Admin Settings.";

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="September 2026"
      body={[
        "Klein & Justin Airconditioning collects only the personal information needed to arrange your service: name, contact details, service address, and booking records.",
        "Booking details are used to schedule, dispatch, verify payment, and communicate about your appointment. We never sell personal information.",
        "Payment receipts are stored securely and shown only to you and our admin team for verification.",
        INTERIM,
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="September 2026"
      body={[
        "By booking through this website you agree to provide accurate contact and address information and to pay the stated down payment with GCash after the request is accepted.",
        "Advance cancellations receive a full automatic refund. Same-day undispatched cancellations require admin review; dispatched or ongoing jobs are non-refundable.",
        "Service schedules are confirmed after payment verification. Our team will contact you for access and coordination details.",
        INTERIM,
      ]}
    />
  );
}

export function WarrantyPage() {
  return (
    <LegalPage
      title="Warranty Terms"
      updated="September 2026"
      body={[
        "Services carry a workmanship warranty covering the work performed by our technicians. Installed units and genuine parts carry their manufacturer warranty.",
        "Warranty claims require your booking reference ID. Damage from misuse, unauthorized repair, or natural events is excluded.",
        "Contact us with your reference ID to start a warranty claim.",
        INTERIM,
      ]}
    />
  );
}
