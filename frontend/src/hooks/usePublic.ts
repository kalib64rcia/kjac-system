import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/api/booking.api";
import { catalogApi } from "@/api/catalog.api";
import { contentApi } from "@/api/content.api";
import { psgcApi } from "@/api/psgc.api";
import { queryKeys } from "@/constants/queryKeys";
import type { BookingCreate } from "@/types/booking.types";

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: catalogApi.services,
    staleTime: 5 * 60 * 1000,
  });
}

export function useService(id: number | null) {
  const valid = id !== null && id > 0;
  return useQuery({
    queryKey: queryKeys.services.detail(id ?? 0),
    queryFn: () => catalogApi.service(id as number),
    enabled: valid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: catalogApi.brands,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: queryKeys.psgc.regions,
    queryFn: psgcApi.regions,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useProvinces(regionCode: string | null) {
  return useQuery({
    queryKey: queryKeys.psgc.provinces(regionCode ?? ""),
    queryFn: () => psgcApi.provinces(regionCode as string),
    enabled: !!regionCode,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCities(provinceCode: string | null) {
  return useQuery({
    queryKey: queryKeys.psgc.cities(provinceCode ?? ""),
    queryFn: () => psgcApi.cities(provinceCode as string),
    enabled: !!provinceCode,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useBarangays(cityCode: string | null) {
  return useQuery({
    queryKey: queryKeys.psgc.barangays(cityCode ?? ""),
    queryFn: () => psgcApi.barangays(cityCode as string),
    enabled: !!cityCode,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useTrackBooking(referenceId: string, email: string) {
  return useQuery({
    queryKey: queryKeys.booking.track(referenceId, email),
    queryFn: () => bookingApi.track(referenceId, email),
    enabled: false,
    retry: false,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BookingCreate) => bookingApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

export function useLandingContent() {
  return useQuery({
    queryKey: queryKeys.content.landing,
    queryFn: contentApi.landing,
    staleTime: 5 * 60 * 1000,
  });
}
