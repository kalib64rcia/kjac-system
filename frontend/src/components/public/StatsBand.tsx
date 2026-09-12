/** Stats band under testimonials (static per FLOW_GUEST). */
const STATS = [
  { value: "500+", label: "Customers" },
  { value: "4.9", label: "Avg Rating" },
  { value: "98%", label: "Satisfaction" },
];

export function StatsBand() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:gap-4" role="list" aria-label="Business statistics">
      {STATS.map((s) => (
        <div
          key={s.label}
          role="listitem"
          className="rounded-lg border border-gray-200 bg-white px-2 py-4 text-center"
        >
          <p className="font-technical text-xl font-semibold text-gray-900 sm:text-3xl">
            {s.value}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
