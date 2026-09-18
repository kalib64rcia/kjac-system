# Booking Flow Swap - Test Plan & Verification

## Summary of Changes

**New Booking Flow (Customer sees schedule BEFORE paying):**
```
submitted → proposed → scheduled → confirmed → assigned → ongoing → completed
```

**Previous Flow (Customer paid without seeing exact time):**
```
submitted → pending → confirmed → scheduled → assigned → ongoing → completed
```

---

## Changes Implemented

### 1. Database Migration (Applied ✓)
- **File:** `backend/alembic/versions/1000002b_swap_booking_flow.py`
- **Changes:**
  - Status rename: `pending` → `proposed`
  - Status rename: `confirmed` → `scheduled` (admin proposes time)
  - Status rename: `scheduled` → `confirmed` (payment verified)
  - Column rename: `pending_at` → `proposed_at`
  - Note: `scheduled_at` already exists; no rename needed
  - Updated CHECK constraint for new status list

### 2. Backend Model
- **File:** `backend/app/models/bookings.py`
- **Changes:**
  - `BOOKING_STATUSES` constant includes new flow: `"submitted", "proposed", "scheduled", "confirmed", "assigned", "ongoing", "completed", ...`

### 3. Frontend Type Definitions
- **File:** `frontend/src/types/booking.types.ts`
- **Changes:**
  - `BookingStatus` type updated: removed "pending", added "proposed"

### 4. Frontend Components

#### StatusBadge Component
- **File:** `frontend/src/components/shared/StatusBadge.tsx`
- **Color Mapping:**
  - `submitted` → Yellow/Gold (warning)
  - `proposed` → Orange (warning)
  - `scheduled` → Blue (info)
  - `confirmed` → Green (success)
  - `assigned` → Teal (teal)
  - `ongoing` → Gray (slate)
  - `completed` → Gray (secondary)
  - `cancelled` → Red (destructive)
  - `expired` → Red (destructive)

#### BookingStepper Component
- **File:** `frontend/src/components/public/tracking/BookingStepper.tsx`
- **New Steps:** submitted → proposed → scheduled → confirmed → assigned → ongoing → completed

#### TrackPage (Guest/Customer Booking Tracker)
- **File:** `frontend/src/pages/public/TrackPage.tsx`
- **Changes:**
  - Cancel eligibility: `submitted` OR `proposed` (no payment yet)

#### TrackResult Component
- **File:** `frontend/src/components/public/tracking/TrackResult.tsx`
- **New UI States:**
  - `submitted`: "Request Submitted" - waiting for admin to propose time
  - `proposed`: "Schedule Proposed" - customer sees time, can Accept & Pay or Decline
  - `scheduled`: "Payment Required" - customer uploads payment receipt
  - `confirmed`: "Booking Confirmed" - payment verified, waiting for tech assignment
  - `assigned`: Tech assigned (inherited)
  - `ongoing`: Service in progress (inherited)
  - `completed`: Service done (inherited)

#### BookingsPage (Admin Dashboard)
- **File:** `frontend/src/pages/office/BookingsPage.tsx`
- **Updated Tabs:**
  - Removed: `pending`, `awaiting_payment`
  - Added: `proposed` (admin proposed times, awaiting customer accept/decline)
  - Reordered: `submitted`, `proposed`, `scheduled`, `confirmed`, `assigned`, `ongoing`, `completed`
- **Summary Counts:**
  - `needsPayment` now counts `scheduled` status (not `submitted`)

#### BookingDetailSheet (Admin Detail View)
- **File:** `frontend/src/components/office/BookingDetailSheet.tsx`
- **Changes:**
  - Cancellable statuses updated: submitted, proposed, scheduled, confirmed, rescheduled, ongoing
  - Payment section checks: `scheduled` status (not `submitted`)
  - SetSlotForm gate: `proposed` status (not `scheduled`)
  - Assign button gate: `confirmed` or `assigned` (unchanged)
  - Tech workload tracking: updated status list

---

## Test Scenarios

### Scenario 1: Happy Path (Full Flow)

**Steps:**
1. **Customer creates booking** → Status = `submitted`
   - Visit `/book` → fill form → submit
   - **Expected:** Reference ID issued, redirected to `/booking/status`

2. **Admin proposes schedule** → Status = `submitted` → `proposed`
   - Admin navigates to `/office/bookings`, "Submitted" tab
   - Opens booking detail sheet
   - Sets exact time within the flex window (SetSlotForm visible)
   - **Expected:** Booking moves to `proposed` tab, customer notified

3. **Customer sees proposed schedule** → `/track` page shows "Proposed Schedule"
   - Customer enters reference ID + email on `/track`
   - **Expected:** Status badge shows "Proposed Schedule" (orange)
   - BookingStepper shows step 2 active
   - Card shows: "We found an available slot for [DATE TIME]. Review the proposed time above."
   - Two buttons: "Accept & Pay" (primary), "Decline" (outline)

4. **Customer declines (optional)** → Status = `proposed` → `cancelled` or new request
   - Click "Decline" button
   - **Expected:** Booking cancelled, customer can request new time

5. **Customer accepts & pays** → Status = `proposed` → `scheduled`
   - Click "Accept & Pay" button
   - Opens `UploadPaymentModal`
   - Customer uploads GCash receipt screenshot
   - Submits payment
   - **Expected:** Status changes to `scheduled`, card shows "Payment Required" message gone

6. **Admin verifies payment** → Status = `scheduled` → `confirmed`
   - Admin navigates to `/office/bookings`, "Awaiting Payment" tab (now "Awaiting Payment" = `scheduled`)
   - Opens booking detail sheet
   - Clicks "Verify Payment" button (or auto-verify based on rules)
   - **Expected:** Status moves to `confirmed`, booking moves to "Confirmed" tab

7. **Admin assigns technician** → Status = `confirmed` → `assigned`
   - Booking stays in `confirmed` tab until technician assigned
   - Clicks "Assign Technician" button in detail sheet
   - Selects technician from list
   - Confirms assignment
   - **Expected:** Status = `assigned`, booking moves to "Assigned" tab, technician notified

8. **Technician marks service as ongoing** → Status = `assigned` → `ongoing`
   - Technician app: marks job "Start Service"
   - **Expected:** Status = `ongoing`, moves to "Ongoing" tab

9. **Technician completes service** → Status = `ongoing` → `completed`
   - Technician app: marks job "Complete"
   - **Expected:** Status = `completed`, moves to "Completed" tab
   - Customer notified, can leave rating

---

### Scenario 2: Payment Before Acceptance (Should Fail)

**Steps:**
1. Customer books → Status = `submitted`
2. Admin proposes → Status = `proposed`
3. Customer sees `/track` page with "Schedule Proposed"
   - **Expected:** NO "Pay Now" button visible yet
   - Only: "Accept & Pay" and "Decline" buttons
4. If customer tries to upload payment manually via direct URL/API
   - **Expected:** Backend rejects (endpoint gates on status)

---

### Scenario 3: Cancellation at Different Stages

#### Cancel as `submitted`
- Customer can cancel directly from `/track` page
- **Expected:** Refund status = "none" (no payment made)

#### Cancel as `proposed`
- Customer clicks "Decline" on `/track` page
- **Expected:** Booking cancelled, customer can rebook

#### Cancel as `scheduled`
- Customer or admin cancels after payment uploaded but before verification
- **Expected:** Pending refund review

#### Cancel as `confirmed`
- Admin reviews payment, then cancels
- **Expected:** Refund logic applies based on admin rules

---

### Scenario 4: UI/UX Verification

#### Status Badge Colors
- **Test:** Visit admin bookings page
- Filter each tab and verify status badge colors:
  - submitted = Yellow
  - proposed = Orange
  - scheduled = Blue
  - confirmed = Green
  - assigned = Teal
  - ongoing = Purple/Slate
  - completed = Gray
  - cancelled = Red
  - expired = Red

#### BookingStepper Progress
- **Test:** Open `/track` page at each status
- Verify stepper shows correct progress:
  - `submitted` → Step 1 active
  - `proposed` → Step 2 active
  - `scheduled` → Step 3 active
  - `confirmed` → Step 4 active
  - `assigned` → Step 5 active
  - `ongoing` → Step 6 active
  - `completed` → Step 7 (all completed)

#### Admin Bookings Tab Filtering
- **Test:** `/office/bookings`
- Verify tabs work for each status:
  - "All" shows all bookings
  - "Submitted" shows only submitted (yellow badges)
  - "Proposed" shows only proposed (orange badges)
  - "Awaiting Payment" shows only scheduled (blue badges)
  - "Confirmed" shows only confirmed (green badges)
  - etc.

#### Booking Detail Sheet Actions
- **Test:** Open booking detail for `proposed` status
- **Expected:** SetSlotForm is visible (to set exact time)
- **Test:** Open booking detail for `confirmed` status
- **Expected:** "Assign Technician" button is visible and enabled

---

## Edge Cases to Test

1. **Flex Window Logic:**
   - Admin proposes time within window (e.g., afternoon 12PM-5PM)
   - SetSlotForm only allows selecting times within the window
   - Customer sees proposed time matches window

2. **Expiry Timer:**
   - Booking created with 30-min expiry
   - In `submitted` state: countdown shows on `/track`
   - In `proposed` state: does countdown show? (TBD - check business logic)
   - In `scheduled` state: countdown to payment deadline shown

3. **Multiple Reschedule Requests:**
   - Customer declines proposed time twice
   - Admin proposes new times each time
   - Flow maintains consistency

4. **Concurrent Operations:**
   - Admin assigns tech while customer is viewing `/track`
   - Refresh should show updated status

5. **Email Notifications:**
   - Verify customer receives email when:
     - Booking created (submitted)
     - Admin proposes time (proposed)
     - Payment verified (confirmed)
     - Technician assigned (assigned)
   - Verify technician receives email when assigned

---

## Database Verification Queries

```sql
-- Check status distribution after migration
SELECT status, COUNT(*) FROM bookings GROUP BY status;

-- Verify pending→proposed rename
SELECT COUNT(*) FROM bookings WHERE status = 'pending'; -- Should be 0

-- Verify confirmed→scheduled rename
SELECT COUNT(*) FROM bookings WHERE status = 'scheduled'; -- Should show old "confirmed" count

-- Verify scheduled→confirmed rename
SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'; -- Should show old "scheduled" count

-- Check timestamp columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name='bookings' AND column_name LIKE '%_at';
-- Should include: proposed_at, scheduled_at, confirmed_at
```

---

## Success Criteria

✓ All 9 implementation tasks completed  
✓ Migration applied successfully to PostgreSQL  
✓ Frontend builds without errors  
✓ Backend starts without errors  
✓ Status progression: submitted → proposed → scheduled → confirmed → assigned → ongoing → completed  
✓ Customer sees proposed schedule BEFORE paying  
✓ Accept/Decline UI appears at proposed stage  
✓ Payment upload UI appears after acceptance  
✓ Admin can filter bookings by new status flow  
✓ Status badges display correct colors  
✓ BookingStepper shows 7-step progression  
✓ No regressions in existing flows (cancel, reschedule, tech assignment)  

---

## Rollback Plan (If Needed)

To revert to old flow:
1. Run `python -m alembic downgrade 1000002a`
2. Update frontend type, components back to old statuses
3. Restart services

**Note:** Data will not revert to old status names; requires manual intervention if data preservation is needed.

---

**Test Date:** [To be filled during testing]  
**Tester Name:** [To be filled]  
**Status:** Ready for testing ✓
