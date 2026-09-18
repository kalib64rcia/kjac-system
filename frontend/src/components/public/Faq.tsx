import { SingleAccordionItem as AccordionItem } from "@/components/ui/accordion";
import { SectionDotGrid } from "./Decor";

const FALLBACK_FAQS = [
  {
    q: "How do I book an appointment?",
    a: "Use the Book Service page — no account needed. You'll get a reference ID to track your booking and upload your GCash receipt.",
  },
  {
    q: "What payment methods do you accept?",
    a: "GCash down payment to confirm your booking, with the balance settled on service completion.",
  },
  {
    q: "Can I reschedule or cancel my booking?",
    a: "Yes. Track your booking with your reference ID and email — advance cancellations receive a full auto-refund.",
  },
  {
    q: "What areas do you serve?",
    a: "Sta. Cruz, Laguna and nearby areas. Contact us to confirm coverage for your location.",
  },
  {
    q: "Do you provide warranty?",
    a: "Yes — workmanship warranty on services plus manufacturer warranty on installed units and parts.",
  },
];

/** FAQ accordion (admin-editable items, static fallback). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const faqs = items.length > 0 ? items : FALLBACK_FAQS;
  return (
    <section id="faqs" className="relative overflow-hidden py-14" aria-label="FAQs">
      <SectionDotGrid variant="subtle" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {faqs.map((f) => (
            <AccordionItem key={f.q} title={f.q}>
              <p>{f.a}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </section>
  );
}
