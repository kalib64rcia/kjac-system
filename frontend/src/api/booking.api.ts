import { api } from "./axios";
import type {
  BookingCreate,
  BookingResponse,
  CancelResponse,
  TrackBookingResponse,
} from "@/types/booking.types";
import type { PaymentResponse } from "@/types/catalog.types";

export const bookingApi = {
  create: (payload: BookingCreate) =>
    api.post<BookingResponse>("/bookings", payload).then((r) => r.data),

  track: (referenceId: string, email: string) =>
    api
      .get<TrackBookingResponse>(
        `/bookings/track/${encodeURIComponent(referenceId)}`,
        { params: { email } },
      )
      .then((r) => r.data),

  uploadPayment: (bookingId: number, form: FormData) =>
    api
      .post<PaymentResponse>(`/bookings/${bookingId}/payment`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      })
      .then((r) => r.data),

  cancel: (bookingId: number, reason: string, email?: string) =>
    api
      .post<CancelResponse>(`/bookings/${bookingId}/cancel`, { reason, email })
      .then((r) => r.data),
};
