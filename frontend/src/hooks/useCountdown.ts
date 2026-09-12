import { useEffect, useState } from "react";
import { formatCountdown, msUntil } from "@/utils/format";

/** Ticking countdown to an ISO expiry; stops at zero. */
export function useCountdown(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = iso ? new Date(iso).getTime() - now : 0;

  useEffect(() => {
    if (!iso || msUntil(iso) <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [iso]);

  return { remaining: Math.max(0, remaining), label: formatCountdown(Math.max(0, remaining)) };
}
