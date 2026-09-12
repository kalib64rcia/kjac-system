import { api } from "./axios";
import type { Brand, Service, ServiceDetail } from "@/types/catalog.types";

export const catalogApi = {
  services: () => api.get<Service[]>("/services").then((r) => r.data),
  service: (id: number) =>
    api.get<ServiceDetail>(`/services/${id}`).then((r) => r.data),
  brands: () => api.get<Brand[]>("/brands").then((r) => r.data),
  brand: (id: number) => api.get<Brand>(`/brands/${id}`).then((r) => r.data),
};
