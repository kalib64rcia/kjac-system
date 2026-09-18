# KJAC Canonical Contracts (Phase 0 — locked)

Decisions locked at approval: backend-first; React 19 + latest deps (not Next.js);
Supabase Auth only; admin 2FA via email code. Items below resolve the
conflicting/unclear/risky register so Phase 1+ has one source of truth.
Supersedes contradictory lines in FLOW_*/API/DATABASE docs until those are patched.

## C1 — Auth: Supabase Auth only
- No `password_hash`, `remember_token`, or custom reset/verify token tables.
- FastAPI verifies Supabase JWTs (JWKS) via `app/core/security.py`; `sub` = identity.
- `users` rows link to `auth.users.id`; role comes from app `users` table.

## C2 — Admin 2FA: email 6-digit code
- Code TTL 10 min, resend cooldown 60s, max 5 attempts then re-login.
- Access token 15 min; refresh 7 days; lockout 5 fails / 15 min (email + IP) + email alert.

## C3 — Web: React 19 + Vite + React Router (not Next.js)
- Latest stable deps; multi-page routes per docs; `REACT-NEXT` folder name is legacy.

## C4 — Reference ID: `KJAC-YYYY-XXXXXX`
- Regex `^KJAC-\d{4}-[A-Z0-9]{6}$`, server-generated only, DB CHECK enforces.
- Implemented in `backend/app/utils/reference_id.py` + covered by test.

## C5 — Booking date rule
- Mon–Sat only (Sunday blocked unless `allow_sunday_bookings=true`).
- Same-day allowed only before 12:00 Manila; otherwise min tomorrow; max +30 days.

## C9 — Public availability display (Phase A scheduling)
- Public states only: `open` / `low` / `full` / `closed`. Thresholds and
  counts never leave the server (`GET /v1/slots/availability` returns
  date, time, state — nothing else).
- Public allocation = real seats minus `slot_house_reserve` (walk-ins and
  regulars; owner-tunable). `low` = at most `slot_low_threshold` public
  seats left AND something taken (untouched slots read `open`).
- A seat is occupied by `submitted`/`pending`/`confirmed`/`ongoing`
  bookings plus live guest holds; cancelled/expired/completed/rescheduled
  free it. Submit re-checks under a per-slot lock: last seat raced =
  409 `BOOKING_006`, expired hold = 409 `BOOKING_003`.
- Guest holds (`POST /v1/slots/holds`, 10-minute life via
  `slot_hold_minutes`) lock a seat while details are typed; expired holds
  are deleted on write. `slot_availability()` is the single seam Phase D
  enriches (roster, travel) without changing callers.
- Reserve never closes the last seat (a one-tech shop stays bookable; set
  `slot_house_reserve` 0 to off). Zero active technicians = everything
  full — deactivating the crew pauses online intake by design.
- Fixable input errors (422) always read before situational 409s, so users
  chase the right problem (profile/address before "just filled").
- Hybrid windows (industry standard for home visits): guests pick Morning
  (arrive 8–12) or Afternoon (arrive 12–4); the anchor hour (08:00/12:00)
  is stored in `preferred_time` with `flex_window` set, so board, tracking,
  and validation work untouched. Exact hours stay behind a toggle for
  estimates and follow-ups.
- A window booking counts against every slot in its window (never
  oversells); submit needs any room left in the window. Dispatch places the
  exact hour via `PATCH /admin/bookings/{id}/set-slot` — same promised day
  and window only (anything else is the customer reschedule flow),
  guard-checked, audit-logged, customer emailed. Window promise never
  breaks; "on the way" + tech first name narrows it day-of.
- Phase B: office vacancy (`GET /v1/admin/slots/vacancy`) reuses the same
  counters plus the numbers (capacity/booked/holds/left) — office eyes
  only. Waitlist takes full days only (email required, daily cap);
  an offer is a guard-checked hold (default 24h) + emailed booking link —
  no room, no offer. Reminders (tomorrow + payment-expiring) are
  settings-toggled, payment nudges stamped so they never resend.
- Phase D: capacity = techs on shift that day (weekly template, default
  all-working, minus leave ranges). No template/leave rows = legacy
  headcount — deactivating the crew still pauses intake; scheduling
  someone off (or on leave) tightens only their days. Sundays stay
  globally closed regardless of roster.
- Day plan (replaces travel-as-capacity, retired): the office sequences
  one day manually (`POST /admin/bookings/day-order`, listed ids take
  1..n, rest unordered by time). No auto-routing — the system stores
  the order, the office owns the roads. 1 booking = 1 slot, unchanged.

## C6 — Rejected payment
- Reject → booking reverts `pending` → `submitted` with fresh `expires_at = now + 3h`; payment row marked `rejected` with reason; customer notified with re-upload link.

## C7 — `confirmed` meaning
- `confirmed` = payment verified (technician optional). Unassigned-confirmed queue = `status=confirmed AND technician_id IS NULL`.

## C8 — Tech↔customer contact
- Admin-relay only. No direct call/message buttons; tech UI opens admin chat.

## U1 — Guest write model
- `bookings.customer_id` nullable for guests; public insert guarded by Turnstile + `3/30min` IP limit; authenticated customers rate-limited per user.

## U3/U4 — Cancel/reschedule
- Advance `confirmed` cancel (before appointment day, undispatched) = full auto-refund.
- Reschedule: `confirmed`-only, ≥24h before, max 2× per booking; request row holds pending state; booking stays `confirmed` until admin approves.

## R1 — Tracking privacy
- Guest tracking requires `reference_id` + booking email match; responses mask phone/address (last-4 / barangay-city only) until Phase 2 OTP.

## Phase 2 — Auth boundary, 2FA tickets, lockout, rate limits (locked)
- Clients call Supabase Auth directly for signup/signin/refresh (passwords
  never touch our backend). Everything else goes through FastAPI. Supabase
  owns password brute-force protection; the backend owns 2FA-attempt lockout
  and API rate limiting.
- Admin 2FA: `POST /v1/auth/2fa/request` (202, 60s cooldown → AUTH_006) then
  `POST /v1/auth/2fa/verify` ({code ^\d{6}$} → 200 + ticket). Codes: 6-digit,
  sha256-hashed, 10-min TTL, single-use; previous codes invalidated on reissue.
- Wrong/expired/missing codes → AUTH_005/AUTH_004 (401). ≥5 failures in 15min
  → AUTH_002 (429) until the window slides past the latest failure.
- Ticket: HS256 JWT (`SECRET_KEY`, env-only), claims {sub, purpose=admin-2fa,
  12h exp}, sent as `X-Admin-2FA`; `require_admin_2fa` enforces it on admin
  routes (Phase 3+). `GET /v1/auth/me` returns the caller's profile.
- Rate limits (slowapi, in-memory; Redis swap needed for multi-replica):
  2fa/request 5/min, 2fa/verify 10/min, auth/me 300/min; keys ≈ per-user for
  authed callers, per-IP otherwise. 429s use envelope code RATE_001 with
  slowapi's Retry-After headers. Validation failures use VAL_001.

## Phase 3 — Bookings, payments, PSGC, dispatch (locked)
- Endpoints: `POST /v1/bookings` (guest + auth), `GET /v1/bookings/track/{ref}
  ?email=`, `GET /v1/bookings/me`, `POST /v1/bookings/{id}/cancel|reschedule`,
  `POST /v1/bookings/{id}/payment` (multipart), `GET /v1/payments/{id}/receipt`,
  `PATCH /v1/admin/payments|bookings|reschedule/*`, `PATCH
  /v1/technician/jobs/{id}/status`, `GET /v1/psgc/*`, `POST
  /v1/admin/maintenance/expire-bookings` (cron entrypoint).
- Guest proof is `email` match (body/query); mismatches return 404, never 403.
  Track responses mask phone (`0917***4567`) and omit street address (R1).
- Cancel tiers: submitted/pending → full auto-approved; advance confirmed →
  full auto; same-day undispatched → `processing` (admin decides); dispatched
  (any `technician:*` history marker) or ongoing → `denied`. Guest refunds are
  bookkept with NULL requester (migration 0a000010), settled manually by ref.
- Reject payment → booking back to `submitted` + fresh 3h expiry (C6).
  Upload amount must equal down payment; receipts ≤3MB JPG/PNG/WebP/HEIC,
  raster converted to WebP, HEIC stored original (pillow-heif not installed).
- Tech progression is strict: confirmed→on_the_way→arrived→ongoing→
  completed; on_way/arrived keep booking `confirmed`. Capacity: 3 jobs/day.
- Reschedule: confirmed-only, ≥24h notice, max 2 rows/booking, guest
  `requested_by` NULL (migration 0900000009); booking stays `confirmed`.
- Turnstile: empty secret = dev bypass (warn); authed mobile skips CAPTCHA.
  Virus scan is a stub hook (wire ClamAV pre-prod). Storage defaults to local
  dir; Supabase Storage when `STORAGE_BACKEND=supabase` + service key.
- PSGC: live proxy (shape `{code,name}` verified) + 24h TTL cache + best-effort
  DB upsert. Backend PG connection is privileged (bypasses RLS); RLS protects
  direct client access (defense in depth).

## Phase 4 — Ratings, notifications, inventory, payroll, admin, reports (locked)
- Ratings: owner-only `POST /v1/bookings/{id}/rating` (completed-only,
  one-per-booking, 1–5), public `GET /v1/technicians/{id}/ratings`, admin
  soft-delete (trigger recalcs the average).
- Notifications: owner-only center (`GET /me`, `PATCH /read`, `POST
  /read-all`). Every `notify()` row also fans out best-effort: email via SMTP
  for lifecycle events, push logged until Firebase service-account JSON is
  provisioned (remaining step).
- Inventory (admin): search incl. `low_stock`, create (unique SKU), patch,
  soft delete, `POST /{id}/adjust` with signed change — results below zero are
  refused (409); the DB trigger still syncs quantity + low-stock alerts.
- Payroll (admin): `POST /generate` computes commission from completed jobs ×
  active rule (service-specific wins, else global %) plus server-side totals;
  overlapping periods refused; pending→approved→paid (method required),
  cancel allowed until paid. Techs read own via `GET /v1/payroll/me`.
- Admin users: list/filter, suspend (admins protected), pending-tech
  approve/deny with notification. Reports: bookings JSON/CSV + revenue by
  day/service from verified payments (PDF deferred).

## R2/R3 — DB rules for Phase 1 migrations
- RLS via `SECURITY DEFINER` role helper (no per-row `EXISTS(users)` subselects); least-privilege public reads (active catalog only).
- Fix `inventory_movements.user_id` nullability vs `ON DELETE SET NULL`; phones `VARCHAR(25)`; notification-type CHECK; rating triggers on INSERT/UPDATE/DELETE.
- Phase 1 extras (locked): `payments.customer_id` nullable (guest uploads link
  via `booking_id`); unique partial index on verified GCash refs (double-spend
  guard); `inventory_items` public SELECT scoped to active rows (hides
  `unit_cost` internals); INSERT policies added for `message_threads`,
  `booking_inventory_usage`, `booking_status_history` path via trigger;
  `set_booking_expiry` hardened (NULL-safe, defaults 3h).

## Phase 5 — Invite-gated onboarding, profiles, catalog, settings, analytics (locked)
- Admin-only technicians: NO public signup. Admin sends invite (one email) →
  single-use 7-day link → tech completes own form + sets own password →
  `pending_approval` → admin review → activate/deny. No emailed passwords.
- Approval hard block: technicians activate ONLY with a used, unexpired-at-use
  invite for their email (`AUTH_007` otherwise). Deny needs no invite.
- `users.uuid` nullable until first Supabase sync links the row; RLS
  NULL-comparisons fail closed, no policy change needed.
- `POST /v1/auth/sync` (idempotent: by uuid, else by verified email, else
  create customer). `PATCH /v1/users/me` for profile/address; authed booking
  requires complete address (`PROFILE_INCOMPLETE` 422, guests unaffected).
- Catalog: public reads (active only) + detail with `duration_display`;
  admin CRUD + `GET /brands/{id}` (filled API.md gap).
- Settings: list + patch with type coercion and `is_editable` guard.
  Analytics dashboard per API.md shape with concrete chart items.
- FLOW_AUTH/FLOW_TECHNICIAN self-registration flows intentionally unimplemented.

## C10 - Public identifiers: unguessable, never sequential
- Public URL keys are UUID4 (`payments.uuid`) or server-generated refs
  (`KJAC-YYYY-XXXXXX`, C4). Sequential integer ids never appear in public routes.
- UUIDs layer on ownership checks (`assert_owner`, uniform 404s), never replace them.
- Admin routes keep integer ids behind 2FA + role (documented trust boundary).
- New endpoints follow the same split; no secrets or PII in new URL params.
