/** Peso formatting — JetBrains Mono applied by callers for figures. */
export function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateLong(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime12h(hhmm: string | null): string {
  if (!hhmm) return "—";  // Handle null/undefined for flex-window bookings
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Today's date in Asia/Manila as YYYY-MM-DD (cutoff rules run on Manila time). */
export function manilaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** End clock time: HH:MM plus minutes, still HH:MM (wraps past midnight). */
export function addMinutesToTime(hhmm: string | null, mins: number): string {
  if (!hhmm) return "—";  // Handle null for flex-window bookings
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const end = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

/** Job window: "11:00 AM – 12:30 PM" when duration is known, else start only. */
export function formatTimeRange(hhmm: string | null, durationMins?: number | null): string {
  if (!hhmm) return "—";  // Handle null for flex-window bookings
  const start = formatTime12h(hhmm);
  if (durationMins == null) return start;
  return `${start} – ${formatTime12h(addMinutesToTime(hhmm, durationMins))}`;
}

/** Initials for avatar fallbacks — first + last name, email letter backup. */
export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
  }
  const mail = (email ?? "").trim();
  return mail ? mail.charAt(0).toUpperCase() : "?";
}

/** Live countdown target helper — returns remaining ms (<=0 when elapsed). */
export function msUntil(iso: string | null): number {
  if (!iso) return 0;
  return new Date(iso).getTime() - Date.now();
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Audit day: "Sep 14, 2026". Single home — do not hand-roll elsewhere. */
export function formatAuditDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Audit clock with milliseconds: "5:09:21.084 AM". Storage holds
 *  microseconds; list order (#id) settles sub-millisecond ties. */
export function formatAuditClock(iso: string): string {
  const d = new Date(iso);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  const time = d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return time.replace(/ (\S+)$/, `.${ms} $1`);
}
