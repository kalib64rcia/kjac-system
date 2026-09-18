import { api } from "./axios";
import type {
  AdminBookingList,
  AdminBookingParams,
  AdminSetting,
  AvailabilityResponse,
  BookingCreate,
  BookingResponse,
  CancelResponse,
  ReminderRunResult,
  RosterTech,
  SlotHold,
  TrackBookingResponse,
  VacancyResponse,
  WaitlistEntry,
  WaitlistOfferResult,
} from "@/types/booking.types";
import type { PaymentResponse } from "@/types/catalog.types";

export const bookingApi = {
  create: (payload: BookingCreate) =>
    api.post<BookingResponse>("/bookings", payload).then((r) => r.data),

  /** Public: day-by-day slot states (open/low/full/closed — never counts). */
  availability: (from: string, to: string) =>
    api
      .get<AvailabilityResponse>("/slots/availability", {
        params: { date_from: from, date_to: to },
      })
      .then((r) => r.data),

  /** Public: hold one seat while the guest types (10-min life). */
  createHold: (date: string, time: string) =>
    api
      .post<SlotHold>("/slots/holds", {
        preferred_date: date,
        preferred_time: time,
      })
      .then((r) => r.data),

  track: (referenceId: string, email: string) =>
    api
      .get<TrackBookingResponse>(
        `/bookings/track/${encodeURIComponent(referenceId)}`,
        { params: { email } },
      )
      .then((r) => r.data),

  uploadPayment: (bookingRef: string, form: FormData) =>
    api
      .post<PaymentResponse>(`/bookings/${encodeURIComponent(bookingRef)}/payment`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      })
      .then((r) => r.data),

  cancel: (bookingId: number, reason: string, email?: string) =>
    api
      .post<CancelResponse>(`/bookings/${bookingId}/cancel`, { reason, email })
      .then((r) => r.data),

  /** Office: staff cancel (no ownership check; the audit stamp records who). */
  adminCancel: (bookingId: number, reason: string) =>
    api
      .post<CancelResponse>(`/admin/bookings/${bookingId}/cancel`, { reason })
      .then((r) => r.data),

  /** Office: dispatch list (contract — backend ships the endpoint next). */
  adminList: (params?: AdminBookingParams) =>
    api.get<AdminBookingList>("/admin/bookings", { params }).then((r) => r.data),

  /** Office: place a window booking's exact hour (guard-checked). */
  setSlot: (bookingId: number, date: string, time: string, duration?: number) =>
    api
      .patch<{ booking_id: number; preferred_date: string; preferred_time: string; flex_window: string | null }>(
        `/admin/bookings/${bookingId}/set-slot`,
        { preferred_date: date, preferred_time: time, estimated_duration_minutes: duration },
      )
      .then((r) => r.data),

  /** Office: place a confirmed booking on schedule (transitions to 'scheduled' status). */
  schedule: (bookingId: number, date: string, startTime: string, durationMinutes?: number) =>
    api
      .post<{ booking_id: number; status: string; scheduled_at: string; preferred_date: string; preferred_time: string }>(
        `/bookings/${bookingId}/schedule`,
        { preferred_date: date, preferred_time: startTime, duration_minutes: durationMinutes },
      )
      .then((r) => r.data),

  /** Office: remove booking from schedule (scheduled → confirmed). */
  unschedule: (bookingId: number) =>
    api
      .delete<{ success: boolean }>(`/bookings/${bookingId}/schedule`)
      .then((r) => r.data),

  /** Office: assign/reassign crew (1..6, solo ok). Sends the seen assignment
      so a concurrent change answers 409 instead of overwriting. */
  assignTechnician: (bookingId: number, technicianId: number, expectedTechnicianId?: number | null, crewIds?: number[] | null) =>
    api
      .patch<{ booking_id: number; technician_id: number | null; status: string }>(
        `/admin/bookings/${bookingId}/assign`,
        { technician_id: technicianId, expected_technician_id: expectedTechnicianId ?? null, crew_ids: crewIds ?? null },
      )
      .then((r) => r.data),

  /** Office: verify down-payment receipt (live). */
  verifyPayment: (paymentId: number, action: "approve" | "reject", rejection_reason?: string) =>
    api
      .patch(`/admin/payments/${paymentId}/verify`, { action, rejection_reason })
      .then((r) => r.data),

  /** Office: receipt image bytes (unguessable payment uuid, authed client). */
  receiptBlob: (paymentUuid: string) =>
    api
      .get<Blob>(`/payments/${encodeURIComponent(paymentUuid)}/receipt`, { responseType: "blob" })
      .then((r) => r.data),

  /** Office: review a reschedule request (live). */
  reviewReschedule: (requestId: number, action: "approve" | "deny", admin_notes?: string) =>
    api
      .patch(`/admin/reschedule/${requestId}/review`, { action, admin_notes })
      .then((r) => r.data),

  /** Office: vacancy grid — states plus the numbers behind them. */
  vacancy: (from: string, to: string) =>
    api
      .get<VacancyResponse>("/admin/slots/vacancy", {
        params: { date_from: from, date_to: to },
      })
      .then((r) => r.data),

  /** Office: waitlist for one day (waiting + offered, in line order). */
  waitlist: (day: string) =>
    api
      .get<WaitlistEntry[]>("/admin/waitlist", { params: { day } })
      .then((r) => r.data),

  /** Office: offer a freed seat — guard-checked 24h hold + emailed link. */
  offerWaitlist: (entryId: number, time: string) =>
    api
      .post<WaitlistOfferResult>(`/admin/waitlist/${entryId}/offer`, {
        preferred_time: time,
      })
      .then((r) => r.data),

  /** Office: drop a waitlist entry (guest gave up or line cleared). */
  removeWaitlist: (entryId: number) =>
    api
      .post<WaitlistEntry>(`/admin/waitlist/${entryId}/remove`)
      .then((r) => r.data),

  /** Office: one manual pass of guest nudges (the cron calls this too). */
  runReminders: () =>
    api.post<ReminderRunResult>("/admin/reminders/run").then((r) => r.data),

  /** Office: sequence one day's plan (listed ids take 1..n). */
  setDayOrder: (date: string, orderedIds: number[]) =>
    api
      .post<{ preferred_date: string; ordered_ids: number[] }>(
        "/admin/bookings/day-order",
        { preferred_date: date, ordered_ids: orderedIds },
      )
      .then((r) => r.data),

  /** Office: manual Close. Blocks new submits for a date+window. */
  closeWindow: (date: string, window: string, reason?: string | null) =>
    api
      .post("/admin/slots/close", {
        preferred_date: date,
        window,
        reason: reason ?? null,
      })
      .then((r) => r.data),

  /** Office: reopen a closed window. */
  reopenWindow: (date: string, window: string) =>
    api
      .post("/admin/slots/reopen", {
        preferred_date: date,
        window,
        reason: null,
      })
      .then((r) => r.data),

  /** Office: crew roster (weekly template + leave). */
  roster: () =>
    api.get<RosterTech[]>("/admin/roster").then((r) => r.data),

  /** Office: replace one tech's week (exactly 7 flags, Mon..Sun). */
  setWorkdays: (userId: number, days: boolean[]) =>
    api.put<RosterTech>(`/admin/roster/${userId}/days`, { days }).then((r) => r.data),

  /** Office: add leave for one tech. */
  addTimeOff: (payload: { user_id: number; date_from: string; date_to: string; reason?: string | null }) =>
    api.post(`/admin/roster/time-off`, payload).then((r) => r.data),

  /** Office: cancel leave. */
  deleteTimeOff: (leaveId: number) =>
    api.delete(`/admin/roster/time-off/${leaveId}`).then((r) => r.data),

  /** Office: reminder toggles live in system_settings (owner only). */
  adminSettings: () =>
    api.get<AdminSetting[]>("/admin/settings").then((r) => r.data),

  /** Office: flip one setting (owner only). */
  patchSetting: (key: string, value: string) =>
    api
      .patch<AdminSetting>(`/admin/settings/${key}`, { setting_value: value })
      .then((r) => r.data),
};
