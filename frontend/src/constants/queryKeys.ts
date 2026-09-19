/** Centralized React Query keys (see FRONTEND_DATA_MAPPING.md). */
export const queryKeys = {
  services: {
    all: ["services"] as const,
    detail: (id: number) => ["services", id] as const,
  },
  brands: {
    all: ["brands"] as const,
    detail: (id: number) => ["brands", id] as const,
  },
  psgc: {
    regions: ["psgc", "regions"] as const,
    provinces: (region: string) => ["psgc", "provinces", region] as const,
    cities: (province: string, region = "") => ["psgc", "cities", province, region] as const,
    barangays: (city: string) => ["psgc", "barangays", city] as const,
  },
  booking: {
    track: (ref: string, email: string) => ["booking", "track", ref, email] as const,
  },
  content: {
    landing: ["content", "landing"] as const,
  },
} as const;
