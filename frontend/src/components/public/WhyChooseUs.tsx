import { Award, BadgeCheck, PhilippinePeso, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionDotGrid } from "./Decor";

const ITEMS = [
  { icon: BadgeCheck, title: "Licensed & Certified", text: "Trained, certified technicians on every visit." },
  { icon: Award, title: "Experienced Team", text: "Years of residential and commercial field work." },
  { icon: Timer, title: "Same-Day Service", text: "Fast dispatch across Sta. Cruz and nearby areas." },
  { icon: PhilippinePeso, title: "Honest Pricing", text: "Clear down payment, no hidden charges." },
];

/** Why Choose Us cards (static). */
export function WhyChooseUs() {
  return (
    <section id="why-us" className="relative overflow-hidden py-14" aria-label="Why choose us">
      <SectionDotGrid variant="subtle" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Why Choose Us</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <Card key={item.title} className="bg-white transition-shadow hover:shadow-md">
              <CardContent>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <item.icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
