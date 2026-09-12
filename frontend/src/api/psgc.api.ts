import { api } from "./axios";
import type { PsgcItem } from "@/types/catalog.types";

export const psgcApi = {
  regions: () => api.get<PsgcItem[]>("/psgc/regions").then((r) => r.data),
  provinces: (regionCode: string) =>
    api
      .get<PsgcItem[]>("/psgc/provinces", { params: { region_code: regionCode } })
      .then((r) => r.data),
  cities: (provinceCode: string) =>
    api
      .get<PsgcItem[]>("/psgc/cities", { params: { province_code: provinceCode } })
      .then((r) => r.data),
  barangays: (cityCode: string) =>
    api
      .get<PsgcItem[]>("/psgc/barangays", {
        params: { city_municipality_code: cityCode },
      })
      .then((r) => r.data),
};
