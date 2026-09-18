/** Shared label/value row (profile pages, booking drawer). Long values wrap. */
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-[44px] flex-col justify-center gap-0.5 border-b border-gray-100 py-2 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="shrink-0 text-sm font-medium text-gray-500 sm:w-32">{label}</dt>
      <dd className="min-w-0 flex-1 break-all text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
