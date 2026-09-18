# KJAC Scheduling Plan (Simple Version)
> Visual reference for owners, admins, and builders. Simple words. No jargon.
> Status: locked from grilling Q1–Q10 + follow-ups. V1 scope only.

## 1. Goal in one sentence
Customers pick Date + Window only. Admin decides who goes where, per team. Only paid + team-assigned jobs count.

## 2. Words we use (glossary)
- **PENDING** = request waiting for admin. No pay yet.
- **ALTERNATIVE** = admin offered a different time. Waiting for customer Yes / No.
- **AWAITING_PAYMENT** = customer said Yes, now needs to pay. Deadline = start time.
- **PENDING_VERIFY** = receipt uploaded, waiting for admin to check.
- **CONFIRMED** = paid and checked, but no team yet. Does NOT count.
- **ASSIGNED** = paid + team picked. Only this counts. Can pick Friday on Monday.
- **CLOSED** = timed out or stopped. No refund if no pay.
- **CANCELLED** = customer or admin stopped it.
- **REJECTED** = admin said No with reason.
- **ON_THE_WAY / WORKING / DONE** = team traveling, doing, finished.
- **Crew** = van group for that date. Example: Crew A = Juan + Pedro, Crew B = Solo Mark (1-man allowed). One crew can take all jobs for the day if you want.
- **Close** = admin manually marks a window Full. New requests stop. Old requests stay for triage.
- **Request ID** = `KJAC-YYYY-XXXXXX` (keep current format).

## 3. Windows (customer choices)
- Morning 8:00 AM – 12:00 NN
- Afternoon 1:00 PM – 5:00 PM
- Anytime 8:00 AM – 5:00 PM
- Monday to Saturday only. Sunday closed.
- Never show exact clock time to customer. Exact order is internal only.

## 4. Core rules (non-negotiable)
1. Customer chooses Date + Window only. Never exact time.
2. Every request starts as PENDING (soft, holds nothing).
3. Downpayment notice shown upfront, but money comes AFTER admin accept + customer accept.
4. Only ASSIGNED counts toward the day. CONFIRMED alone counts zero.
5. FULL is manual: admin Closes the window after organizing. Never computed from active accounts.
6. Crews are picked daily but can be picked in advance (Monday for Friday). Same crew can work next day if picked again. Same crew can cover all jobs in a day.
7. Assigning names is admin-side only (V1). Tech phone login/view comes later.
8. No geography auto-math, no travel engine V1. Keep it simple.
9. Ratings go to Klein & Justin as a whole business, not per person. Payroll stays per-tech but out of sched scope.
10. Email + in-app notify only V1. No SMS yet.

## 5. Customer flow (happy path)
1. Pick service (Cleaning, Repair, Installation, Check-up).
2. Enter location (Address / Barangay + Landmark + City).
3. Pick date (future Mon–Sat) + window (Morning / Afternoon / Anytime). Full / Closed windows are blocked.
4. See notice: "Pay after we accept. Pay early = on time. Pay near start = team will be late because we still need to check your receipt."
5. Enter name + mobile + notes → Submit → PENDING + Request ID.
6. Soft confirm screen: "Request received. We will review."
7. Admin approves → you click Accept → pay downpayment before start time → upload GCash receipt + ref.
8. Admin verifies → CONFIRMED → admin picks team → ASSIGNED.
9. Day: team on the way → working → done. You get updates.
10. Rate KJAC service (whole business).

## 6. If admin offers different time
1. Status = ALTERNATIVE. You get new options + Accept / Decline link + countdown.
2. Accept → go to pay (step 7 above).
3. Decline or timeout → CLOSED.

## 7. Admin flow
1. See Pending Queue (how many waiting).
2. Open Day Board for that date:
   - Window lanes: Morning / Afternoon / Anytime.
   - Crew lanes for that date (make Friday crews on Monday if you want).
   - CONFIRMED pool (paid, no team) vs ASSIGNED list (paid + team).
   - Remaining ASSIGNED count. Close / Reopen button per window.
3. Review one request: Approve / Offer Alternative (new window or date) / Reject + reason.
4. Assign crew (1–6 names, solo allowed) + drag jobs between crews + order 1,2,3 inside crew. One crew may take all.
5. Verify payments: Approve → CONFIRMED, Reject → back to waiting (once, if still before start).
6. Handle cancels/refunds (see §8).
7. Day execution: crew marks on-the-way / working / done. Re-sequence if delayed.

## 8. Refund — simple + exact flow
Think: restaurant deposit.

### 8.1 No pay yet = just close, nothing to return
- Request cancelled. No refund row. Status CLOSED / CANCELLED.

### 8.2 Paid, no team yet, cancel BEFORE the day = full refund auto-yes (entitlement), payout manual
Example: For Friday, cancel Wednesday.
1. Customer Cancel → reason → confirm.
2. Check: CONFIRMED, no crew, date > today, no travel marker, payment verified.
3. Set CANCELLED. Create refund: amount = downpayment, type = full, status = approved (auto, means "we owe it").
4. Admin queue: "#ID — approved, needs payout."
5. Admin sends GCash by hand → uploads receipt + enters GCash ref (JPG/PNG/WebP ≤3MB) → clicks Mark Sent.
6. Refund → completed. Notify customer twice: "approved, will send" then "sent, ref #XXX + receipt".

### 8.3 Paid, cancel ON the day, team hasn't left = admin decides (same if crew picked but still at shop)
Example: For Friday morning, cancel Friday 7am.
1. Customer Cancel → reason → confirm.
2. Check: CONFIRMED or ASSIGNED, date = today, no on-the-way / working marker.
3. Set CANCELLED. If ASSIGNED, free the crew lane (history kept).
4. Create refund: amount = downpayment, type = full, status = processing (on hold).
5. Notify customer: "Cancelled. Refund under review."
6. Admin queue: "Same-day cancel #ID needs decision" (shows paid? crew? dispatched? reason).
7. Admin Approve → approved (owed) → same manual payout as 8.2 → completed. Or Deny + reason → denied → notify + new-request link.
- Rule: picking team names does NOT remove refund. Only traveling / working removes it.

### 8.4 Team traveling / working = no refund
- Team on the way or cleaning → cancel = denied + 0. Time + travel already spent.

Note: approved ≠ sent. completed = receipt + ref uploaded.

## 9. Payment rule (Q9 locked, Option A)
- Deadline = window start exactly (Morning 8:00, Afternoon 13:00, Anytime 8:00 on that date).
- Unpaid at start → auto-CLOSED. No grace, no 3-hour margin.
- Late pay near start → still needs review, so team will be late. This is explained in UI, not a buffer rule.
- UI notice copy (approved):
> "Pay as early as you can. Your slot is only secured after we verify your downpayment. Payments near your window start will still need review, so your team will arrive late. Unpaid at [Date 8:00AM / 1:00PM] → auto-closed."

## 10. Crew rule (Q10 locked)
- Crew = 1–6 names you pick per date from on-duty techs. Solo = 1-man team allowed.
- Pre-assignable: Monday can compose Friday crews + assign Friday bookings.
- One crew can cover the whole day (all jobs in one lane) or split across crews (morning cluster / afternoon cluster). Your call per date.
- V1 assigning needs no login. `active` accounts (even never-logged-in) are pickable. Phone view (`my jobs`) is deferred to mobile phase.
- Drop the old 3-jobs-per-tech hard block → soft warning only. Manual Close is the gate.

## 11. UI — all pages (wireframe list)
Customer:
- P1 Service | P2 Location | P3 Date + Window (+ DP notice, Full/Closed blocked) | P4 Contact + Submit | P5 Soft confirm PENDING + ID | P6 Status (Accept / Pay + deadline + late-warning / tracking / Cancel / rating).
Admin:
- P7 Login | P8 Dashboard Pending Queue | P9 Day Board (window lanes + crew lanes + CONFIRMED pool + ASSIGNED list + Close/Reopen) | P10 Review single (Approve / Alternative / Reject) | P11 Sequence (drag between crews, order inside) + advance-date crew pick | P12 Refund payout (Approved-needs-payout, upload receipt + ref → Completed) | Team daily list (deferred to mobile).

## 12. What must change in current system
- Afternoon 12–4 → 1–5, add Anytime, keep Mon–Sat. Retire last-start-4PM cap.
- Stop FULL from `count(active techs)`. FULL = manual Close. Counters count ASSIGNED (+ ongoing) only.
- Add: close table (date+window), crew join (booking 1..N users), new statuses above, `expires_at = window_start` for AWAITING, extend expiry job beyond `submitted`, extend reminders (accept + pre-deadline), extend reschedule to CONFIRMED+ASSIGNED, tech-update from ASSIGNED by any crew member.
- Upload proof both sides (customer pay, admin refund payout) with GCash ref.
- Ratings migration: per-tech → business. Payroll untouched.
- Keep ID `KJAC-YYYY-XXXXXX`. Keep email notify. Defer SMS / push send.

## 13. Why this fixes the 5 pains
1. Full schedule → you Close it. Blocked before select.
2. Someone took it first → newcomer stays PENDING → you offer Alternative with options + notify.
3. Exact time → never offered. Only windows. Order is your crew sequence.
4. Pagsanjan vs Los Baños → you group by crew lanes in advance. No complex math V1.
5. Window became full later → Close stops new, old PENDING triaged to Alternative. Paid assurance via deadline = start + review.

## 14. Decisions locked (ADR-lite)
- ADR-1 Bridge, not rewrite: keep payment gate (moved after accept), keep KJAC IDs, keep `technician_id` as lead + crew join.
- ADR-2 Explicit ASSIGNED status (not derived flag): CONFIRMED ≠ ASSIGNED becomes code.
- ADR-3 Manual Close over computed capacity V1; only ASSIGNED counts.
- ADR-4 Daily-assembled, advance-assignable crews; persistent Team table deferred; 1 crew may cover whole day.
- ADR-5 Hard deadline at window start (Option A); approved ≠ sent; completed requires receipt + ref.
- ADR-6 Assign split from login; mobile view deferred; no SMS V1.

## 15. Next steps (after approval)
1. Data model (tables: closures, crew join, status CHECK update, refund proof fields). DONE as migration 10000027, verified `alembic current` = 10000027.
2. Tech plan (endpoints, counters, expiry/cron, Day Board API). DONE: Close/Reopen endpoints, crew assign, ASSIGNED-only counters, expiry at start.
3. Build. IN PROGRESS: picker, service copy, status cards, Day Board, sheet adapted. Full pytest suite: 118 passed.

Note: `window` is a reserved word in Postgres, so the CHECK uses `"window"` quoted. Pre-existing Thursday-only flake in `test_roster_leave` fixed by deriving the second day from the first.

## 18. Build 2 record (assign guard, copy, window grid, A1)
- Assign requires CONFIRMED or ASSIGNED else 409 (`Verify payment before assigning a team`). Buttons hidden on unpaid with `Waiting for payment`. Test `test_assign_requires_verified_payment` covers submitted plus pending.
- Copy: footer, policy box, legal clause, admin receipt note, stepper Assigned step, past-time error, drawer `Day Board (N job/jobs)` rename. Badges untouched.
- Week grid shows Morning, Afternoon, Anytime rows (no exact hours). Filling hint at 3 assigned per window, display only. Cells open the Day Board drawer filtered to that window. Waitlist offers use the window anchor hour.
- Bookings adds Assigned and Awaiting payment tabs plus Assigned today card.

## 19. Build 3 record (draft law rewrite, five laws applied)
- Fitts: 44px targets kept, actions on the job they act on, Close and Reopen stage instead of firing (high consequence needs the Save commit).
- Hick: per row button forests replaced by tap to select plus one action bar (Earlier, Later, Done). Pool assigning stays stepped for later.
- Jakob: X closes, week columns, colored blocks kept. Departures flagged in plan: window bands, Close concept, pool column.
- Proximity: block holds customer, service, team plus area, badge tight. Lane header tight to jobs. Pending Save bar sits directly under the lanes.
- Miller: blocks capped (2 names plus overflow count), sheet chunked 1 Windows, 2 Lanes, 3 Waitlist.
- Draft rule: up, down, Close, Reopen preview only with dots and preview tags. One Save commits order then windows, partial failures keep the failed items staged with a naming toast. Discard reverts all. Set time and Assign stay immediate with their own confirm and email.
- Week cells show up to 2 job names plus overflow count from already loaded bookings. No new API.
- Tests: `test_window_close_blocks_submit_and_reopen_allows` covers close, duplicate close, blocked submit, reopen, missing reopen. Suite: 120 passed.

## 16. Visual UI — ASCII (what it will look like, no code yet)

### C1 — Customer: Service
```
+--------------------------------------------------+
|  AC Service Booking                              |
|--------------------------------------------------|
|  What do you need?                               |
|  [ ] Cleaning                                    |
|  [ ] Repair                                      |
|  [ ] Installation                                |
|  [ ] Check-up / Diagnosis                        |
|  [ Continue ]                                    |
+--------------------------------------------------+
```

### C2 — Customer: Location
```
+--------------------------------------------------+
|  Where is the unit?                              |
|--------------------------------------------------|
|  Address / Barangay: [____________]              |
|  Landmark:           [____________]              |
|  City: [ Pagsanjan v ]  (for crew grouping)      |
|  [ Back ]              [ Continue ]              |
+--------------------------------------------------+
```

### C3 — Customer: Date + Window (windows only, no exact time)
```
+--------------------------------------------------+
|  Pick date + window                              |
|--------------------------------------------------|
|  Date: [ Fri, Sep 26 v ]  Mon-Sat only           |
|  ( ) Morning  8AM-12NN                           |
|  (x) Afternoon 1PM-5PM  [FULL - blocked]         |
|  ( ) Anytime  8AM-5PM                            |
|                                                  |
|  Notice: Pay AFTER we accept. Pay early = on     |
|  time. Pay near start = team late (need review). |
|  Unpaid at start = auto-closed.                  |
|  [ Back ]              [ Continue ]              |
+--------------------------------------------------+
```

### C4 — Customer: Contact + Submit
```
+--------------------------------------------------+
|  Your contact                                    |
|--------------------------------------------------|
|  Name:   [____________]                          |
|  Mobile: [____________]                          |
|  Notes:  [____________]                          |
|  Downpayment: P___ due AFTER accept (GCash)      |
|  [ Back ]         [ Submit Request ]             |
+--------------------------------------------------+
```

### C5 — Customer: Soft confirm (PENDING)
```
+--------------------------------------------------+
|  Request Received — PENDING                      |
|--------------------------------------------------|
|  ID: KJAC-2026-ABC123                            |
|  Fri, Sep 26 — Morning                           |
|  We will review. You will get email.             |
|  [ View Status ]                                 |
+--------------------------------------------------+
```

### C6 — Customer: Status pages (one page, changes by state)
```
PENDING:            "Waiting for admin review."
ALTERNATIVE:        "Admin offered Sat Morning instead."
                    [ Accept ] [ Decline ]  (countdown 12h)
AWAITING_PAYMENT:   "Accepted! Pay P___ before Fri 8:00AM."
                    [ Upload GCash receipt + ref ]  + late warning
PENDING_VERIFY:     "Receipt received. Checking..."
CONFIRMED:          "Paid. Waiting for team assignment."
ASSIGNED:           "Team picked: Crew A (Juan+Pedro). Fri Morning."
ON_THE_WAY/WORKING: "Team is on the way / working now."
DONE:               "Done. Rate KJAC service [*****]"
REJECTED/CLOSED:    "Reason: ___ [ Make new request ]"
```

### A1 — Admin: Pending Queue (dashboard)
```
+--------------------------------------------------+
|  Dashboard                     [ Day Board v ]   |
|--------------------------------------------------|
|  PENDING: 7   AWAITING_PAY: 3   VERIFY: 2        |
|  CONFIRMED (no team): 4   ASSIGNED today: 6      |
|  #KJAC-A1 Pagsanjan Morning  2h ago [ Review ]   |
|  #KJAC-A2 Los Banos Anytime  3h ago [ Review ]   |
+--------------------------------------------------+
```

### A2 — Admin: Day Board (core screen, can open Friday on Monday)
```
+================================================================+
|  Day Board — Fri, Sep 26   (viewing on Mon)  [ < Today > ]     |
|----------------------------------------------------------------|
|  Morning [OPEN] [ Close ] | Afternoon [CLOSED] [ Reopen ]      |
|  Anytime [OPEN] [ Close ]                                      |
|----------------------------------------------------------------|
|  CONFIRMED pool (paid, no team — does NOT count):              |
|   • #A3 Pagsanjan Cleaning  Morning                            |
|   • #A4 Los Banos Repair    Anytime                            |
|----------------------------------------------------------------|
|  Crew A: Juan + Pedro (van 1)              [ + member ] [ x ]   |
|   1. #B1 Pagsanjan Cleaning — Morning      [ up ][ down ][ >B ]|
|   2. #B2 Pagsanjan Repair — Morning        [ up ][ down ][ >B ]|
|----------------------------------------------------------------|
|  Crew B: Solo Mark (1-man team)                                |
|   1. #B3 Los Banos Checkup — Anytime       [ up ][ down ][ >A ]|
|----------------------------------------------------------------|
|  Note: 1 crew may take ALL jobs. Drag between crews.           |
|  Only ASSIGNED counts. CONFIRMED pool counts 0.                |
+================================================================+
```

### A3 — Admin: Review one request
```
+--------------------------------------------------+
|  Review #KJAC-A1 — Pagsanjan, Fri Morning        |
|--------------------------------------------------|
|  Customer + location + window + notes            |
|  Friday load: Crew A 2 jobs, Crew B 1 job        |
|  ( ) Approve into Fri Morning                    |
|  ( ) Offer Alternative [ Sat Morning v ]         |
|  ( ) Reject + reason [____________]              |
|  [ Submit ]                                      |
+--------------------------------------------------+
```

### A4 — Admin: Verify payment + Refund payout (same upload pattern)
```
+--------------------------------------------------+
|  Verify: #A1 receipt [view] ref 13XXXX [ Approve ] [ Reject ] |
|--------------------------------------------------|
|  Refunds — Approved needs payout:                |
|   • #B9 P500 approved [ Send GCash ]             |
|     Upload receipt [choose] Ref #[____] [ Sent ] |
|  Same-day cancels — needs decision:              |
|   • #C2 Fri 7am cancel [ Approve ] [ Deny+why ]  |
+--------------------------------------------------+
```

## 17. Flowchart (end to end, simple)
```
CUSTOMER                    ADMIN                      SYSTEM
   |                          |                           |
   |-- Submit Date+Window ---->|                           |
   |   (PENDING, no pay)      |-- open Day Board -------->|
   |                          |   see windows + crews     |
   |                          |-- Approve / Alt / Reject -|
   |<-- notified (email) ------|                           |
   |                          |                           |
   |-- Accept Alt? --Yes--> AWAITING_PAYMENT              |
   |   (or Decline --> CLOSED)  |                         |
   |-- Pay + upload receipt --> PENDING_VERIFY            |
   |                          |-- Verify? --No--> back to AWAITING
   |                          |--Yes--> CONFIRMED (paid, no team, count 0)
   |                          |-- Pick crew (Mon for Fri ok) --> ASSIGNED (counts)
   |                          |-- Close window? --> FULL (blocks new)    |
   |                                               |                     |
   |                     DAY: crew ON_THE_WAY --> WORKING --> DONE        |
   |<-- updates ------------|---------------------|----------------------|
   |                                                  |
   CANCEL paths:                                      |
   - No pay --> CLOSED (no refund)                    |
   - CONFIRMED cancel BEFORE day --> CANCELLED + refund approved --> admin sends GCash + proof --> completed
   - CONFIRMED/ASSIGNED cancel ON day, team not left --> CANCELLED + refund processing --> admin Approve/Deny --> if Approve same payout
   - Team traveling/working --> CANCELLED + denied (0)
```

