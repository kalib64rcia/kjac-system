# FLOW_ADMIN.md

**Klein & Justin Airconditioning - Admin Panel Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Admin Authentication](#admin-authentication)
3. [Dashboard Overview](#dashboard-overview)
4. [Booking Management](#booking-management)
5. [Payment Verification](#payment-verification)
6. [Refund Processing](#refund-processing)
7. [Technician Management](#technician-management)
8. [Customer Management](#customer-management)
9. [Service Management](#service-management)
10. [Brand Management](#brand-management)
11. [Dispatch & Scheduling](#dispatch--scheduling)
12. [Inventory Management](#inventory-management)
13. [Payroll Processing](#payroll-processing)
14. [Reports & Analytics](#reports--analytics)
15. [System Settings](#system-settings)
16. [Audit Logs](#audit-logs)
17. [Archive Management](#archive-management)
18. [Chat & Communication](#chat--communication)

---

## Overview

### Purpose
This document defines all administrative workflows in the KJAC web admin panel, covering booking management, user administration, payment processing, scheduling, and system configuration.

### Admin Role Capabilities
- **Full system control** - All CRUD operations
- **Payment verification** - Approve/deny payments and refunds
- **Technician assignment** - Manual dispatch and scheduling
- **User management** - Create, edit, deactivate accounts
- **System configuration** - Business rules, rate limits, settings
- **Reporting** - Generate analytics and export data
- **Archive management** - Soft delete and restore records
- **Audit log access** - Read-only system activity monitoring

### Access Control
- **Authentication:** Email/Username + Password + 2FA (required every login)
- **Session timeout:** 30 minutes inactivity (configurable)
- **Remember device:** 30-day device trust option
- **Force logout:** On password change

---

## Admin Authentication

### Admin Login Flow

**Starting Point:** `/admin/login`

**Prerequisites:** Admin account must exist (no self-registration)

**Flow:**

```
1. Admin visits /admin/login
   ↓
2. Login form displays:
   - Username or Email input
   - Password input (with eye toggle)
   - Remember device checkbox
   - Login button
   ↓
3. Admin enters credentials & clicks Login
   ↓
4. System validates credentials
   ↓
   ├─ Invalid credentials
   │  └─> Show error: "Invalid username/email or password"
   │      Increment failed attempt counter
   │      ↓
   │      After 5 failed attempts in 15 minutes:
   │      └─> Lock account temporarily
   │          Show: "Account locked due to multiple failed attempts.
   │                 Please try again in 15 minutes."
   │          Send email notification
   │          → END
   │
   └─ Valid credentials
      ↓
5. System generates 2FA code
   ↓
6. Send 2FA code via email
   ↓
7. Display 2FA verification page
   - 6-digit code input
   - Resend code button (disabled for 60 seconds)
   - Verify button
   ↓
8. Admin enters 2FA code & clicks Verify
   ↓
9. System validates 2FA code
   ↓
   ├─ Invalid/Expired code
   │  └─> Show error: "Invalid or expired code. Please try again."
   │      Allow resend after 60 seconds
   │      → Return to step 7
   │
   └─ Valid code
      ↓
10. Create admin session
    - Generate access token (30-min expiry)
    - Generate refresh token (7-day expiry)
    - If "Remember device" checked:
      └─> Store device fingerprint (30-day trust)
    ↓
11. Log audit entry:
    - Event: "Admin Login"
    - User ID, IP address, device info
    - Timestamp
    ↓
12. Redirect to /admin/dashboard
    → END
```

**UI States:**

- **Loading:** Button shows spinner, form disabled
- **Error:** Red alert banner above form
- **Success:** Brief success message, redirect

**Rate Limiting:**
- **Failed attempts:** 5 per 15 minutes → account lock
- **2FA resend:** 1 per 60 seconds
- **Login endpoint:** 10 requests/minute per IP

---

## Dashboard Overview

### Dashboard Landing

**Route:** `/admin/dashboard`

**Authentication Required:** Yes (Admin only)

**Layout Components:**

**Header (Top):**
- Live clock (HH:MM:SS, 12-hour, Asia/Manila timezone)
- Today's date
- Notification bell icon (with badge count)
- Profile picture button (dropdown: Profile, Settings, Logout)

**Sidebar (Left):**
- Business logo (top)
- Navigation menu:
  - Dashboard
  - **Operations:**
    - Appointments
    - Dispatch & Schedule
    - Payments
  - **Management:**
    - Customers
    - Technicians
    - Services
    - Brands
    - Inventory
  - **Finance:**
    - Payroll
    - Reports
  - **System:**
    - Settings
    - Audit Logs
    - Archive
- Profile footer (bottom):
  - Profile picture
  - Admin name
  - Admin email
  - Dropdown: Profile, Settings, Logout

**Main Content Area:**

### Dashboard Widgets (4 Main KPIs)

**Widget 1: Today's Appointments**
- Count of appointments scheduled for today
- Status breakdown:
  - Confirmed (blue)
  - Ongoing (yellow)
  - Completed (green)
- Click → Navigate to Appointments page filtered by today

**Widget 2: Pending Bookings**
- Count of bookings awaiting payment verification
- Urgent badge if payment uploaded >24 hours ago
- Click → Navigate to Appointments page filtered by "Pending"

**Widget 3: Active Technicians**
- Count of technicians currently on assigned jobs
- Status: "On the way" or "Arrived" or "In service"
- Click → Navigate to Technicians page filtered by "Active"

**Widget 4: Monthly Revenue**
- Total confirmed bookings revenue this month
- Down payments collected
- Comparison with last month (↑ or ↓ percentage)
- Click → Navigate to Reports page

### Charts & Analytics

**Chart 1: Bookings Trend (Line Chart)**
- X-axis: Last 30 days
- Y-axis: Number of bookings
- Legend: Submitted, Confirmed, Completed, Cancelled

**Chart 2: Service Types Distribution (Pie Chart)**
- Breakdown by service type
- Percentage and count for each
- Click slice → Filter appointments by that service

**Chart 3: Technician Performance (Bar Chart)**
- X-axis: Top 10 technicians (by name)
- Y-axis: Completed jobs this month
- Color-coded by average rating

**Chart 4: Revenue by Service (Bar Chart)**
- X-axis: Service types
- Y-axis: Total revenue (₱)
- Hover → Show breakdown (completed jobs × price)

### Recent Activity Feed
- Last 10 system activities
- Format: `[Time] [User/Admin] [Action] [Entity]`
- Example: "10:30 AM - Juan Dela Cruz - Created - Booking #KJ-2026-001234"
- Click entry → Navigate to entity details

---

## Booking Management

### View All Bookings

**Route:** `/admin/appointments`

**Page Layout:**

**Header Actions:**
- Search bar (by reference ID, customer name, email, phone)
- Filter dropdown:
  - Status (All, Submitted, Pending, Confirmed, Ongoing, Completed, Cancelled, Expired, Rescheduled)
  - Date range picker (From - To)
  - Service type (multi-select)
  - Brand (multi-select)
  - Assigned technician (multi-select)
- Sort dropdown:
  - Newest first (default)
  - Oldest first
  - Date ascending
  - Date descending
  - Status
- Bulk actions dropdown (when rows selected):
  - Export selected (CSV/Excel)
  - Delete selected (archive)
- Refresh button
- Add booking button (opens modal)

**Table Columns:**
1. Checkbox (select row)
2. Reference ID (clickable)
3. Customer name
4. Contact number
5. Service type
6. Brand
7. Preferred date & time
8. Status badge (color-coded)
9. Assigned technician (or "Unassigned")
10. Created at
11. Actions (View, Edit, Delete icons)

**Table Features:**
- Pagination (10, 25, 50, 100 per page)
- Skeleton loader while fetching
- Empty state: "No bookings found" with illustration
- Error state: "Failed to load bookings" with retry button

### View Booking Details

**Trigger:** Click row or "View" icon

**Action:** Open detailed view page/modal

**Sections:**

**1. Booking Information Card**
- Reference ID (with copy button)
- Status badge (current status, color-coded)
- Customer info:
  - Name (clickable → navigate to customer profile)
  - Email
  - Contact number
  - Address (full with landmark)
- Service details:
  - Service type (with icon)
  - Brand (with logo)
  - Preferred date & time
  - Problem description
  - Uploaded aircon photos (gallery, if any)
- Down payment info:
  - Amount
  - Status (Pending, Verified, None)
  - GCash receipt (if uploaded):
    - Image preview (clickable for full view)
    - GCash reference number
    - Upload timestamp
- Assigned technician (if any):
  - Name (clickable → navigate to technician profile)
  - Photo
  - Contact number
  - Current status (Assigned, On the way, Arrived, In service)
- Timestamps:
  - Created at
  - Updated at
  - Confirmed at
  - Completed at

**2. Status Timeline (Stepper)**
- Visual timeline showing:
  1. Submitted (✓ with timestamp)
  2. Pending (✓ if payment uploaded, with timestamp)
  3. Confirmed (✓ if admin approved, with timestamp)
  4. Ongoing (✓ if technician started, with timestamp)
  5. Completed (✓ if finished, with timestamp)
  6. If cancelled → Show "Cancelled" with reason & timestamp
  7. If rescheduled → Show "Rescheduled" with old/new dates

**3. Action Buttons (Context-Aware)**

**If Status = "Submitted" (No payment):**
- **Cancel Booking** (red) → Opens cancellation modal
- **Edit Booking** → Opens edit modal
- **Send Reminder** → Email customer about payment

**If Status = "Pending" (Payment uploaded, awaiting admin):**
- **Verify Payment** (green) → Opens payment verification modal
- **Reject Payment** (red) → Opens rejection modal
- **Assign Technician** → Opens technician assignment modal
- **Cancel Booking** → Opens cancellation modal

**If Status = "Confirmed" (Admin approved):**
- **Reassign Technician** → Opens technician assignment modal
- **Reschedule** → Opens reschedule modal
- **Cancel Booking** → Opens cancellation modal (requires refund process)

**If Status = "Ongoing" (Technician working):**
- **View Technician Status** → Show real-time status updates
- **Complete Service** (if technician marked complete) → Opens completion modal
- **Cancel Service** (emergency only) → Opens emergency cancellation modal

**If Status = "Completed":**
- **View Receipt** → Show/download service receipt PDF
- **View Rating** (if customer rated) → Show rating & review
- **Rebook** → Create new booking with same details

**If Status = "Cancelled":**
- **View Cancellation Details** → Show reason, refund status
- **Restore Booking** (if not expired) → Restore to previous status

**If Status = "Expired":**
- **Delete Permanently** → Archive booking
- **Restore & Extend** → Reopen booking with new expiry

**4. Activity Log (within this booking)**
- Chronological list of all actions:
  - Who performed the action (admin/customer/technician/system)
  - What action was taken
  - When it occurred
  - Additional details
- Example: "Sept 10, 2026 10:30 AM - Admin (John) - Assigned technician (Pedro Santos)"

**5. Chat Thread (if any messages)**
- Display all messages between admin and customer
- Message composition box
- Send button
- Real-time updates (WebSocket)

### Create New Booking (Admin)

**Trigger:** Click "Add Booking" button

**Action:** Open booking creation modal

**Flow:**

```
1. Admin clicks "Add Booking"
   ↓
2. Modal opens with booking form
   ↓
3. Form fields (all required unless marked optional):
   
   **Customer Section:**
   - Search existing customer (autocomplete by name/email/phone)
     - If found: Auto-fill customer details
     - If not found: Show "Create new customer" fields:
       - First name
       - Last name
       - Email
       - Contact number
   
   **Address Section:**
   - Region (dropdown, loads from PSGC API)
   - Province (dropdown, loads based on region)
   - City/Municipality (dropdown, loads based on province)
   - Barangay (dropdown, loads based on city)
   - Street address (text input)
   - Landmark (text input, optional)
   
   **Service Section:**
   - Service type (dropdown with images)
   - Brand (dropdown with logos)
   - Preferred date (calendar picker, min: tomorrow)
   - Preferred time (time picker, 8 AM - 5 PM, business hours only)
   
   **Details Section:**
   - Problem description (textarea, optional)
   - Upload aircon photos (optional, max 5 images, 3MB each)
   
   **Assignment Section:**
   - Assign technician (dropdown, optional)
     - Shows: Available technicians on that date
     - Each option shows: Photo, Name, Rating, Jobs completed
   
   **Payment Section:**
   - Down payment amount (auto-filled from service, read-only)
   - Mark as "Pre-verified" checkbox (admin manual verification)
   
   **Action Buttons:**
   - Cancel (gray)
   - Save as Draft (yellow, optional)
   - Create & Notify Customer (blue)
   ↓
4. Admin fills form & clicks "Create & Notify Customer"
   ↓
5. Client-side validation:
   - All required fields filled
   - Valid email format
   - Valid phone format
   - Date not in the past
   - Time within business hours
   ↓
   ├─ Validation fails
   │  └─> Show field errors (red text below fields)
   │      Focus first invalid field
   │      → Return to step 3
   │
   └─ Validation passes
      ↓
6. Submit to API: POST /api/admin/bookings
   - Show loading state (button spinner, form disabled)
   ↓
7. Server-side processing:
   - Create customer account (if new)
   - Send email verification link (if new customer)
   - Create booking record
   - Assign technician (if selected)
   - Generate reference ID
   - If "Pre-verified" checked:
     └─> Set status to "Confirmed"
   - Else:
     └─> Set status to "Submitted"
   - Create audit log entry
   - Send notification email to customer
   - Send push notification (if customer has app)
   - If technician assigned:
     └─> Send notification to technician
   ↓
8. API responds with booking details
   ↓
9. Close modal
   ↓
10. Show success toast:
    "Booking created successfully! Reference ID: KJ-2026-001234"
    ↓
11. Navigate to booking details page
    → END
```

**Error Handling:**

- **Network error:** Show error toast, keep modal open, allow retry
- **Validation error:** Show field errors, highlight invalid fields
- **Server error:** Show error toast with message, keep form data
- **Duplicate booking:** Warn if customer has pending booking with same service/date

### Edit Booking

**Trigger:** Click "Edit" icon on booking row or "Edit Booking" button in details

**Allowed Edits (depends on status):**

**If Status = "Submitted" or "Pending":**
- ✅ Customer contact info
- ✅ Address
- ✅ Service type
- ✅ Brand
- ✅ Preferred date & time
- ✅ Problem description
- ✅ Assign/reassign technician

**If Status = "Confirmed":**
- ✅ Preferred date & time (triggers reschedule flow)
- ✅ Reassign technician
- ❌ Cannot change service/brand (must cancel & rebook)

**If Status = "Ongoing" or "Completed":**
- ❌ No edits allowed

**Flow:**

```
1. Admin clicks "Edit Booking"
   ↓
2. Modal opens with pre-filled form
   ↓
3. Admin modifies allowed fields
   ↓
4. Click "Save Changes"
   ↓
5. Confirmation modal:
   "Save changes to booking #KJ-2026-001234?"
   - Review changes (shows old → new values)
   - Cancel / Confirm buttons
   ↓
6. Click "Confirm"
   ↓
7. Submit to API: PUT /api/admin/bookings/{booking_id}
   ↓
8. Server updates booking
   - Create audit log entry (tracks what changed)
   - Send notification to customer (if major change)
   - Send notification to technician (if reassigned)
   ↓
9. Close modal
   ↓
10. Show success toast: "Booking updated successfully"
    ↓
11. Refresh booking details
    → END
```

### Cancel Booking (Admin)

**Trigger:** Click "Cancel Booking" button

**Flow:**

```
1. Admin clicks "Cancel Booking"
   ↓
2. Cancellation modal opens:
   - Warning message based on status:
     
     If status = "Submitted" or "Pending":
     └─> "Customer eligible for full refund (if paid)"
     
     If status = "Confirmed":
     └─> "Cancellation may require refund approval"
     
     If status = "Ongoing":
     └─> "WARNING: Service is in progress. Only cancel in emergency."
   
   - Cancellation reason (dropdown):
     - Customer requested
     - Duplicate booking
     - Invalid information
     - Technician unavailable
     - Emergency situation
     - Other (requires text input)
   
   - Refund handling (if payment verified):
     - Full refund (auto-approve)
     - Partial refund (specify amount)
     - No refund (requires justification)
   
   - Notify customer checkbox (checked by default)
   - Notify technician checkbox (if assigned, checked by default)
   
   - Action buttons:
     - Go Back (gray)
     - Confirm Cancellation (red)
   ↓
3. Admin selects reason, refund option, clicks "Confirm Cancellation"
   ↓
4. Confirmation modal:
   "Are you sure you want to cancel booking #KJ-2026-001234?"
   - Shows summary:
     - Reason
     - Refund decision
     - Who will be notified
   - "This action cannot be undone" warning
   - Cancel / Yes, Cancel Booking buttons
   ↓
5. Click "Yes, Cancel Booking"
   ↓
6. Submit to API: POST /api/admin/bookings/{booking_id}/cancel
   ↓
7. Server processes cancellation:
   - Update booking status to "Cancelled"
   - Record cancellation reason
   - Process refund (if applicable):
     - Create refund record
     - Update payment status
   - Unassign technician (if assigned)
   - Create audit log entry
   - Send notifications:
     - Email to customer (with reason & refund details)
     - Push notification to customer
     - Email to technician (if assigned)
     - Push notification to technician
   ↓
8. Close modal
   ↓
9. Show success toast:
   "Booking cancelled. Customer will be notified."
   - If refund approved: "Refund of ₱X.XX will be processed."
   ↓
10. Navigate to appointments page
    → END
```

---

## Payment Verification

### Verify Payment Flow

**Starting Point:** Booking with status = "Pending" (payment uploaded, awaiting verification)

**Trigger:** Admin clicks "Verify Payment" button in booking details

**Flow:**

```
1. Admin reviews booking details:
   - Customer info
   - Service & brand
   - Down payment amount
   - GCash receipt image
   - GCash reference number
   ↓
2. Admin clicks "Verify Payment"
   ↓
3. Payment verification modal opens:
   
   **Left Side: Receipt Preview**
   - Full-size GCash receipt image
   - Zoom in/out controls
   - Download button
   
   **Right Side: Verification Form**
   - GCash reference number (read-only, from customer)
   - Expected amount: ₱X,XXX.XX (read-only)
   - Verification status (radio buttons):
     ○ Payment verified (approve)
     ○ Payment rejected (deny)
   
   If "Payment verified" selected:
   - Actual amount received (input, pre-filled with expected amount)
   - Payment date (date picker, defaults to upload date)
   - Admin notes (textarea, optional)
   - Assign technician section:
     - Technician dropdown (optional, can assign later)
     - Shows available technicians
   
   If "Payment rejected" selected:
   - Rejection reason (dropdown):
     - Incorrect amount
     - Invalid receipt
     - Duplicate payment
     - Fraudulent receipt
     - Other (requires text input)
   - Admin notes (textarea, required)
   - Request re-upload checkbox (checked by default)
   
   **Action Buttons:**
   - Cancel (gray)
   - Submit Verification (green/red based on selection)
   ↓
4. Admin selects verification status & fills required fields
   ↓
5. Click "Submit Verification"
   ↓
6. Confirmation modal:
   
   If approving:
   "Approve payment for booking #KJ-2026-001234?"
   - Shows: Customer name, Amount, GCash ref
   - "Booking will be confirmed and customer notified"
   
   If rejecting:
   "Reject payment for booking #KJ-2026-001234?"
   - Shows: Rejection reason
   - "Customer will be notified and may re-upload receipt"
   - "Booking will expire if no payment in 3 hours"
   
   - Cancel / Confirm buttons
   ↓
7. Click "Confirm"
   ↓
8. Submit to API:
   - If approved: POST /api/admin/bookings/{booking_id}/verify-payment
   - If rejected: POST /api/admin/bookings/{booking_id}/reject-payment
   ↓
9. Server processes verification:
   
   **If Approved:**
   - Update payment status to "Verified"
   - Update booking status to "Confirmed"
   - Record verification details (admin, timestamp, notes)
   - If technician assigned:
     └─> Update booking with technician
         Send notification to technician
   - Create audit log entry
   - Send notifications:
     - Email to customer: "Payment verified! Booking confirmed."
     - Push notification to customer
     - SMS (optional): "Your booking #KJ-2026-001234 is confirmed!"
   
   **If Rejected:**
   - Update payment status to "Rejected"
   - Keep booking status as "Pending" (still awaiting payment)
   - Record rejection details (reason, admin, timestamp, notes)
   - Reset expiry timer (3 hours from now)
   - Create audit log entry
   - Send notifications:
     - Email to customer: "Payment verification failed. Reason: [reason]. Please re-upload correct receipt."
     - Push notification to customer
     - Include link to re-upload payment
   ↓
10. Close modal
    ↓
11. Show success toast:
    - If approved: "Payment verified! Booking confirmed."
    - If rejected: "Payment rejected. Customer notified to re-upload."
    ↓
12. Refresh booking details (status updated)
    → END
```

**UI States:**

- **Loading:** Show skeleton loader for receipt image
- **Image not loading:** Show fallback "Unable to load image" with retry button
- **Submission loading:** Button spinner, form disabled
- **Success:** Brief success message, auto-close modal after 2 seconds
- **Error:** Red alert banner, allow retry

**Admin Notes:**
- All admin notes are recorded in audit log
- Visible to other admins in booking history
- Not shown to customer (unless rejection reason)

---

## Refund Processing

### Process Refund Flow

**Starting Point:** Booking with status = "Cancelled" and payment verified

**Trigger:** Customer cancels booking OR admin cancels booking

**Flow:**

```
1. Cancellation triggers refund eligibility check:
   
   **Scenario A: Immediate Cancellation** (Before status = "Confirmed")
   └─> Auto-approve full refund
   
   **Scenario B: Same-day Before Dispatch** (Appointment day, technician not "On the way")
   └─> Require admin approval
   
   **Scenario C: Late Cancellation** (Technician dispatched or service ongoing)
   └─> No refund (non-refundable)
   ↓
2. If refund eligible (Scenario A or B):
   
   **If Auto-Approved (Scenario A):**
   - System creates refund record automatically
   - Status: "Approved"
   - Amount: 100% down payment
   - Admin notified via notification
   - Customer notified via email & push
   - Refund added to "Pending Refunds" list
   → Skip to step 6
   
   **If Requires Admin Approval (Scenario B):**
   → Continue to step 3
   ↓
3. Admin receives notification:
   "Refund request pending approval - Booking #KJ-2026-001234"
   ↓
4. Admin navigates to Payments page → Refunds tab
   ↓
5. Admin reviews refund request:
   
   **Refund Request Card:**
   - Booking reference ID
   - Customer name
   - Original booking details (service, brand, date)
   - Down payment amount: ₱X,XXX.XX
   - Cancellation reason
   - Cancellation timestamp
   - Refund eligibility: "Same-day before dispatch"
   
   **Admin Actions:**
   - View Booking Details (opens booking in new tab)
   - Approve Full Refund (green button)
   - Approve Partial Refund (yellow button)
   - Deny Refund (red button)
   ↓
6. Admin clicks action button
   ↓
   **If "Approve Full Refund":**
   └─> Confirmation modal:
       "Approve full refund of ₱X,XXX.XX?"
       - Customer: [Name]
       - GCash reference: [Ref]
       - Admin notes (optional)
       - Cancel / Approve buttons
       ↓
       Click "Approve"
       ↓
       Submit to API: POST /api/admin/refunds/{refund_id}/approve
       - refund_amount: full amount
       - admin_notes: optional notes
       ↓
       Server processes:
       - Update refund status to "Approved"
       - Record admin approval (admin ID, timestamp, notes)
       - Create audit log entry
       - Send notifications:
         - Email to customer: "Refund approved! ₱X,XXX.XX will be processed."
         - Push notification
       ↓
       Show success toast: "Refund approved. Customer notified."
       → END
   
   **If "Approve Partial Refund":**
   └─> Partial refund modal opens:
       - Original amount: ₱X,XXX.XX (read-only)
       - Refund amount: (input, default 50% of original)
       - Deduction reason (dropdown):
         - Processing fee
         - Cancellation fee
         - Late cancellation penalty
         - Other (requires text input)
       - Admin notes (textarea, required)
       - Cancel / Approve Partial Refund buttons
       ↓
       Admin enters refund amount & reason
       ↓
       Click "Approve Partial Refund"
       ↓
       Confirmation modal:
       "Approve partial refund of ₱X,XXX.XX (Y% of original)?"
       - Shows deduction: ₱Z,ZZZ.ZZ
       - Shows reason
       - Cancel / Confirm buttons
       ↓
       Click "Confirm"
       ↓
       Submit to API: POST /api/admin/refunds/{refund_id}/approve
       - refund_amount: partial amount
       - deduction_amount: deducted amount
       - deduction_reason: reason
       - admin_notes: notes
       ↓
       Server processes (same as full refund)
       ↓
       Show success toast: "Partial refund approved. Customer notified."
       → END
   
   **If "Deny Refund":**
   └─> Denial modal opens:
       - Denial reason (dropdown):
         - Late cancellation (non-refundable)
         - Violation of terms
         - Service already provided
         - Fraudulent claim
         - Other (requires text input)
       - Admin notes (textarea, required)
       - Notify customer checkbox (checked by default)
       - Cancel / Confirm Denial buttons
       ↓
       Admin selects reason & fills notes
       ↓
       Click "Confirm Denial"
       ↓
       Confirmation modal:
       "Deny refund for booking #KJ-2026-001234?"
       - "Customer will be notified of denial reason"
       - "This decision can be appealed"
       - Cancel / Yes, Deny Refund buttons
       ↓
       Click "Yes, Deny Refund"
       ↓
       Submit to API: POST /api/admin/refunds/{refund_id}/deny
       - denial_reason: reason
       - admin_notes: notes
       ↓
       Server processes:
       - Update refund status to "Denied"
       - Record denial details
       - Create audit log entry
       - Send notifications:
         - Email to customer: "Refund request denied. Reason: [reason]"
         - Push notification
         - Include appeal process information
       ↓
       Show success toast: "Refund denied. Customer notified."
       → END
```

### Refund Status Tracking

**Admin View:** `/admin/payments/refunds`

**Tab: Pending Refunds**
- List of refunds awaiting approval (Scenario B only)
- Columns:
  - Refund ID
  - Booking reference
  - Customer name
  - Amount
  - Requested date
  - Days pending
  - Actions (Approve, Deny)
- Sort by: Oldest first (urgent on top)
- Filter: Amount range, Date range

**Tab: Processed Refunds**
- List of approved/denied refunds
- Columns:
  - Refund ID
  - Booking reference
  - Customer name
  - Original amount
  - Refund amount (with % if partial)
  - Status badge (Approved/Denied)
  - Processed by (admin name)
  - Processed date
  - Actions (View Details)
- Filter: Status, Date range, Admin
- Export: CSV/Excel

**Tab: Completed Refunds**
- List of refunds where money has been returned to customer
- Same columns as Processed + "Completed date"
- Admin can mark approved refunds as "Completed" after manual refund via GCash/Bank

---

## Technician Management

### View All Technicians

**Route:** `/admin/technicians`

**Page Layout:**

**Header Actions:**
- Search bar (by name, email, phone, technician ID)
- Filter dropdown:
  - Status (All, Active, Inactive, Pending Approval)
  - Availability (Available, Busy, Off-duty)
  - Rating (All, 5★, 4★+, 3★+, Below 3★)
- Sort: Name (A-Z), Rating (high to low), Jobs completed (high to low)
- Add technician button (opens creation modal)

**Table Columns:**
1. Checkbox
2. Profile photo
3. Technician ID
4. Name
5. Contact number
6. Email
7. Status badge (Active/Inactive/Pending)
8. Rating (stars + count)
9. Jobs completed
10. Current job (if busy)
11. Actions (View, Edit, Deactivate)

### Create Technician Account

**Trigger:** Click "Add Technician" button

**Flow:**

```
1. Admin clicks "Add Technician"
   ↓
2. Modal opens with technician creation form
   ↓
3. Form fields (all required unless marked):
   
   **Personal Information:**
   - First name
   - Middle name (optional)
   - Last name
   - Email (will be used for login)
   - Contact number
   - Birthday (date picker, must be 18+)
   
   **Address:**
   - Region, Province, City/Municipality, Barangay (PSGC API)
   - Street address
   - Landmark (optional)
   
   **Employment Details:**
   - Date hired (date picker, defaults to today)
   - Employee ID (optional, auto-generated if empty)
   - Base salary (₱, for payroll)
   - Commission rate (%, for completed jobs)
   
   **Account Settings:**
   - Profile photo (upload, optional)
   - Auto-generate password (checkbox, checked by default)
     - If unchecked: Show password input field
   - Send credentials via email (checkbox, checked by default)
   
   **Action Buttons:**
   - Cancel
   - Create Account
   ↓
4. Admin fills form & clicks "Create Account"
   ↓
5. Client-side validation
   ↓
6. Submit to API: POST /api/admin/technicians
   ↓
7. Server creates technician account:
   - Generate unique technician ID (TEC-YYYYMMDD-XXXX)
   - Generate random password (16 characters, alphanumeric + symbols)
   - Hash password
   - Set account status to "Active"
   - Set force_password_change = true (for first login)
   - Create user record in database
   - Create audit log entry
   - If "Send credentials via email" checked:
     └─> Send email to technician:
         Subject: "Your KJAC Technician Account"
         Body:
         - Welcome message
         - Technician ID: TEC-YYYYMMDD-XXXX
         - Email: technician@email.com
         - Temporary password: [password]
         - Login link
         - "You must change your password on first login"
   ↓
8. API responds with technician details
   ↓
9. Close modal
   ↓
10. Show success toast:
    "Technician account created! Credentials sent to [email]"
    ↓
11. Add technician to table
    → END
```

**Password Requirements:**
- Min 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- Cannot be common passwords
- Must be changed on first login

### Approve Pending Technician

**Context:** Technician self-registered via mobile app (requires admin approval)

**Flow:**

```
1. Technician submits registration via mobile app
   ↓
2. System creates technician record with status = "Pending Approval"
   ↓
3. Admin receives notification:
   "New technician registration pending approval"
   ↓
4. Admin navigates to Technicians page → Filter by "Pending Approval"
   ↓
5. Admin sees pending technician in table
   ↓
6. Admin clicks "View" on pending technician
   ↓
7. Technician profile modal opens:
   
   **Application Details:**
   - Profile photo
   - Full name
   - Email
   - Contact number
   - Birthday
   - Address (full)
   - Submitted date
   - Application notes (if any)
   
   **Verification Status:**
   - Email verified: ✓ or ✗
   - Phone verified: ✓ or ✗
   - Documents uploaded: ✓ or ✗ (if required)
   
   **Admin Actions:**
   - Approve Application (green)
   - Reject Application (red)
   - Request More Info (yellow) - sends email to applicant
   ↓
8. Admin reviews application
   ↓
   **If approving:**
   ↓
9. Admin clicks "Approve Application"
   ↓
10. Approval modal:
    "Approve technician application?"
    - Name: [Full name]
    - Email: [Email]
    - Auto-generate technician ID (checkbox, checked)
    - Auto-generate password (checkbox, checked)
    - Send welcome email (checkbox, checked)
    - Employment details:
      - Date hired (defaults to today)
      - Base salary (input, required)
      - Commission rate (input, required)
    - Cancel / Approve buttons
    ↓
11. Admin fills employment details & clicks "Approve"
    ↓
12. Submit to API: POST /api/admin/technicians/{tech_id}/approve
    ↓
13. Server processes approval:
    - Update status to "Active"
    - Generate technician ID
    - Generate random password (if auto-generate checked)
    - Set force_password_change = true
    - Send welcome email with credentials
    - Send push notification (if app installed)
    - Create audit log entry
    ↓
14. Show success toast: "Technician approved! Welcome email sent."
    ↓
15. Remove from pending list, add to active technicians
    → END
    
   **If rejecting:**
   ↓
9. Admin clicks "Reject Application"
   ↓
10. Rejection modal:
    "Reject technician application?"
    - Rejection reason (dropdown):
      - Incomplete information
      - Does not meet requirements
      - Duplicate application
      - Failed background check
      - Other (requires text input)
    - Message to applicant (textarea, required)
    - Cancel / Confirm Rejection buttons
    ↓
11. Admin selects reason & writes message
    ↓
12. Click "Confirm Rejection"
    ↓
13. Submit to API: POST /api/admin/technicians/{tech_id}/reject
    ↓
14. Server processes rejection:
    - Update status to "Rejected"
    - Record rejection reason
    - Send rejection email to applicant
    - Delete applicant data (optional, GDPR compliance)
    - Create audit log entry
    ↓
15. Show success toast: "Application rejected. Applicant notified."
    ↓
16. Remove from pending list
    → END
```

---

## Dispatch & Scheduling

### Dispatch Calendar View

**Route:** `/admin/dispatch`

**Page Layout:** Calendar-based scheduling interface

**Calendar Views:**
- Month view (default)
- Week view
- Day view
- List view (all appointments in chronological order)

**Calendar Features:**

**Month View:**
- Grid showing all days of current month
- Each day shows:
  - Number of appointments (badge)
  - Color-coded dots (by status):
    - Blue: Confirmed
    - Yellow: Ongoing
    - Green: Completed
    - Red: Issues/conflicts
- Click day → Opens day details panel

**Week View:**
- 7-day columns
- Time slots (8 AM - 5 PM, 30-min intervals)
- Appointments shown as blocks:
  - Customer name
  - Service type (icon)
  - Assigned technician (photo)
  - Time duration
- Drag & drop to reschedule
- Color-coded by status

**Day View:**
- Single day, detailed view
- Timeline (8 AM - 5 PM)
- Appointments shown as cards:
  - Reference ID
  - Customer name & contact
  - Address (with map icon → opens in modal)
  - Service type & brand
  - Assigned technician
  - Status badge
  - Actions (View, Edit, Reassign)
- Technicians availability sidebar:
  - List of all technicians
  - Status: Available, Busy, Off-duty
  - Current job (if busy)
  - Next available time

**List View:**
- Table format of all appointments
- Columns: Date, Time, Customer, Service, Technician, Status
- Filter, sort, search capabilities
- Bulk actions: Reassign, Reschedule, Cancel

### Assign Technician

**Trigger:** Click "Assign Technician" button in booking details or calendar

**Flow:**

```
1. Admin clicks "Assign Technician"
   ↓
2. Technician assignment modal opens:
   
   **Booking Summary (Top):**
   - Reference ID
   - Customer name
   - Service type & brand
   - Date & time
   - Address
   
   **Available Technicians List:**
   - Filter/search technicians
   - Sort by:
     - Availability (available first)
     - Rating (high to low)
     - Proximity to customer (if geolocation enabled)
     - Workload (least busy first)
   
   Each technician card shows:
   - Profile photo
   - Name
   - Rating (stars + count)
   - Jobs completed this month
   - Current status:
     - ✓ Available (green)
     - ⏰ Busy until [time] (yellow)
     - ✗ Off-duty (gray)
   - Number of jobs on same day
   - Distance from customer location (if available)
   - Select button
   
   **No Available Technicians:**
   - If all busy: "No technicians available at this time"
   - Suggest: "Reschedule booking or assign to waitlist"
   
   **Action Buttons:**
   - Cancel
   - Assign & Notify
   ↓
3. Admin selects technician & clicks "Assign & Notify"
   ↓
4. Confirmation modal:
   "Assign [Technician Name] to booking #KJ-2026-001234?"
   - Shows: Technician details, Booking details
   - "Technician will be notified immediately"
   - Cancel / Confirm Assignment buttons
   ↓
5. Click "Confirm Assignment"
   ↓
6. Submit to API: POST /api/admin/bookings/{booking_id}/assign-technician
   - technician_id: selected technician ID
   ↓
7. Server processes assignment:
   - Update booking with technician_id
   - Update booking status (if still "Pending") to "Confirmed"
   - Create audit log entry
   - Send notifications:
     - Push notification to technician:
       "New job assigned: [Service] at [Address] on [Date]"
     - Email to technician with job details
     - Push notification to customer:
       "Technician assigned: [Name] will arrive on [Date]"
     - Email to customer with technician details
   ↓
8. Close modal
   ↓
9. Show success toast:
   "Technician assigned! [Name] has been notified."
   ↓
10. Update calendar/booking display with technician info
    → END
```

**Auto-Assignment (Optional Feature):**

Admin can enable "Auto-assign" mode:
- System automatically assigns technician based on:
  - Availability
  - Proximity to customer
  - Workload balance
  - Skills/specialization (if tracked)
- Admin reviews and approves suggested assignment
- Can override with manual selection

---

## System Settings

### Business Configuration

**Route:** `/admin/settings/business`

**Settings Categories:**

**1. Business Information**
- Business name (Klein & Justin Airconditioning)
- Short name (KJAC)
- Logo upload
- Contact info:
  - Phone: 0926-633-3129
  - Email: abadeciomar@yahoo.com
- Address: 060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna
- Google Maps link
- Coordinates (lat/long)
- Facebook link
- Business hours:
  - Monday-Saturday: 8:00 AM - 5:00 PM
  - Sunday: Closed (toggle)
- Timezone: Asia/Manila (dropdown)

**2. Booking Settings**
- Booking expiration time (hours): 3 (configurable)
- Booking cooldown (minutes): 30 (configurable)
- Max bookings per cooldown: 3 (configurable)
- Advance booking limit (days): 30 (how far customers can book)
- Same-day booking cutoff time: 12:00 PM (no same-day after this)
- Booking reference ID format: KJ-YYYY-NNNNNN (configurable)

**3. Payment Settings**
- Accepted payment methods:
  - GCash (checkbox, checked)
  - Bank transfer (checkbox)
  - Cash on service (checkbox)
- GCash account details:
  - Account name
  - Account number
  - QR code upload
- Down payment calculation:
  - Fixed amount per service (manual)
  - Percentage of total (auto-calculate)
- Payment verification timeout (hours): 24

**4. Cancellation & Refund Policies**
- Immediate cancellation refund: 100% (dropdown: 100%, 90%, 80%, etc.)
- Same-day cancellation refund: Requires approval (toggle: Auto-approve / Manual)
- Late cancellation refund: None (toggle: Allow / Disallow)
- Refund processing time (days): 3-5 business days
- Policy text (rich text editor, shown to customers)

**5. Rate Limiting**
- Login attempts limit: 5 per 15 minutes
- Account lockout duration (minutes): 15
- API rate limits:
  - Public endpoints: 100 req/min per IP
  - Authenticated endpoints: 300 req/min per user
  - Admin endpoints: 500 req/min per admin

**6. Security Settings**
- Session timeout (minutes): 30
- Remember device duration (days): 30
- 2FA required for admin: Yes (toggle)
- 2FA method: Email (dropdown: Email / SMS / Authenticator app)
- Password requirements:
  - Minimum length: 12
  - Require uppercase: Yes
  - Require numbers: Yes
  - Require special characters: Yes
  - Password expiry (days): 90 (0 = never)
  - Password history: 5 (prevent reuse of last N passwords)

**7. Notification Settings**
- Email notifications: Enabled (toggle)
- Push notifications: Enabled (toggle)
- SMS notifications: Disabled (toggle, future feature)
- Notification templates:
  - Booking confirmed
  - Payment verified
  - Technician assigned
  - Service completed
  - (Each with customizable subject & body)

**8. Archive & Retention**
- Archive auto-delete duration (days): 30
- Warn before auto-delete: Yes (email to admin 7 days before)
- Audit log retention (days): 365 (never delete = 0)
- Customer data retention (days after account deletion): 90 (GDPR)

**Action Buttons:**
- Reset to Defaults
- Save Changes

**Save Flow:**

```
1. Admin modifies settings
   ↓
2. Click "Save Changes"
   ↓
3. Confirmation modal:
   "Save system settings?"
   - "Some changes may require system restart"
   - "Users may be logged out if session settings changed"
   - Shows list of changed settings
   - Cancel / Save buttons
   ↓
4. Click "Save"
   ↓
5. Submit to API: PUT /api/admin/settings
   ↓
6. Server updates settings:
   - Validate all values
   - Update database
   - Create audit log entry (tracks who changed what)
   - Clear cache (if applicable)
   - Apply new rate limits
   - If session timeout changed:
     └─> Force logout all users (except current admin)
         Send notification: "System settings updated. Please log in again."
   ↓
7. Show success toast: "Settings saved successfully"
   ↓
8. Refresh page with new settings
   → END
```

---

## Audit Logs

### View Audit Logs

**Route:** `/admin/audit-logs`

**Purpose:** Track all system activities for security, compliance, and troubleshooting

**Access:** Read-only (admins cannot edit or delete logs)

**Page Layout:**

**Header Filters:**
- Date range picker (From - To)
- Event type (dropdown multi-select):
  - User actions (login, logout, registration)
  - Booking actions (create, update, cancel, complete)
  - Payment actions (verify, reject, refund)
  - Admin actions (settings change, user management)
  - System actions (auto-archive, auto-expire)
- User/Actor filter (dropdown):
  - All users
  - Specific user (search by name/email)
  - Admins only
  - Customers only
  - Technicians only
  - System (automated actions)
- Severity level (dropdown):
  - All
  - Info (normal activities)
  - Warning (failed attempts, errors)
  - Critical (security issues, data deletion)
- Search bar (search by keywords, reference IDs, IPs)
- Export logs (CSV/JSON) - includes all filtered results

**Audit Log Table:**

Columns:
1. Timestamp (sortable, default: newest first)
2. Event type badge (color-coded)
3. Actor (user who performed action):
   - Name
   - Role badge (Admin/Customer/Technician/System)
   - User ID
4. Action (what was done)
5. Target (what entity was affected):
   - Entity type (Booking, User, Payment, etc.)
   - Entity ID
   - Entity name/reference
6. Details (expandable row):
   - Before/after values (for updates)
   - Additional context
7. IP address
8. Device info (browser, OS)
9. Status (Success/Failed)

**Example Log Entries:**

```
[2026-09-10 10:30:15] [Booking Created] [Success]
Actor: Admin (John Doe, admin@kjac.com)
Target: Booking #KJ-2026-001234
Action: Created new booking
Details:
  - Customer: Juan Dela Cruz
  - Service: Aircon Repair
  - Date: 2026-09-15 10:00 AM
IP: 192.168.1.100
Device: Chrome 120 on Windows 11

[2026-09-10 10:25:42] [Payment Verified] [Success]
Actor: Admin (Maria Santos, maria@kjac.com)
Target: Payment #PAY-20260910-00123
Action: Verified payment for booking #KJ-2026-001233
Details:
  - Amount: ₱500.00
  - GCash Ref: 1234567890
  - Admin notes: "Receipt verified, amount correct"
IP: 192.168.1.105
Device: Firefox 118 on macOS

[2026-09-10 09:15:30] [Login Failed] [Warning]
Actor: Unknown (login attempt: tech001)
Target: User account (Technician ID: TEC-20250101-0001)
Action: Failed login attempt
Details:
  - Reason: Incorrect password
  - Attempt: 3/5
IP: 203.0.113.45
Device: Mobile Safari on iOS 17

[2026-09-10 08:00:00] [Auto-Archive] [Success]
Actor: System (Automated Task)
Target: 15 expired bookings
Action: Moved expired bookings to archive
Details:
  - Bookings: #KJ-2026-001200 to #KJ-2026-001214
  - Reason: Payment not received within 3 hours
  - Auto-delete scheduled: 2026-10-10
IP: 127.0.0.1 (Internal)
Device: System

[2026-09-09 16:45:22] [Settings Changed] [Critical]
Actor: Admin (John Doe, admin@kjac.com)
Target: System Settings
Action: Updated system configuration
Details:
  Changed settings:
  - Session timeout: 30 min → 60 min
  - Booking expiration: 3 hours → 6 hours
  - Archive retention: 30 days → 60 days
IP: 192.168.1.100
Device: Chrome 120 on Windows 11
```

**Features:**

- **Real-time updates:** Logs appear immediately after action
- **Expandable rows:** Click row to see full details
- **Pagination:** 50, 100, 200 logs per page
- **Export:** Download filtered logs as CSV or JSON
- **Immutable:** No delete or edit options (security & compliance)

**Log Retention:**
- All logs retained for 365 days (configurable in settings)
- After retention period: Auto-archive to cold storage
- Critical logs never deleted (permanent retention)

---

## Archive Management

### View Archived Items

**Route:** `/admin/archive`

**Purpose:** Soft-deleted items stored for 30 days before permanent deletion

**Archived Entity Types:**
- Bookings (cancelled, expired, completed)
- Users (deleted accounts: customers, technicians)
- Services (discontinued)
- Brands (removed)
- Payments (voided)
- Other entities

**Page Layout:**

**Tabs (by entity type):**
- All (default)
- Bookings
- Customers
- Technicians
- Services
- Brands
- Other

**Header Actions:**
- Search (by ID, name, reference)
- Filter:
  - Archived date range
  - Auto-delete date range
  - Archived by (admin name)
- Sort: Newest first, Oldest first, Deletion date (urgent first)
- Bulk actions (when rows selected):
  - Restore selected
  - Delete permanently (requires confirmation)

**Archive Table:**

Columns:
1. Checkbox
2. Entity type badge
3. Entity ID / Reference
4. Entity name/description
5. Archived date
6. Auto-delete date (countdown if <7 days)
7. Archived by (admin name or "System")
8. Reason for archive
9. Actions:
   - View details (read-only preview)
   - Restore
   - Delete permanently

**Auto-Delete Warning:**
- Items within 7 days of auto-delete show orange warning badge
- Items within 24 hours show red urgent badge
- Admin receives email notification 7 days before auto-delete

### Restore from Archive

**Trigger:** Click "Restore" button on archived item

**Flow:**

```
1. Admin clicks "Restore" on archived item
   ↓
2. Restore confirmation modal:
   "Restore [Entity Type] #[ID]?"
   
   **Entity Details:**
   - Type: Booking / Customer / Technician / etc.
   - Name/Reference
   - Archived date
   - Reason archived
   
   **Restore Options:**
   
   For Bookings:
   - Restore with original status
   - Restore as "Draft" (requires re-confirmation)
   - Notify customer (checkbox, checked by default)
   
   For User Accounts:
   - Restore with active status
   - Require password reset on next login (checkbox, checked)
   - Send welcome-back email (checkbox, checked)
   
   **Warning (if dependencies deleted):**
   - "Associated technician no longer exists. Assign new technician after restore."
   - "Associated service discontinued. Update service type after restore."
   
   **Action Buttons:**
   - Cancel
   - Restore
   ↓
3. Admin reviews & clicks "Restore"
   ↓
4. Submit to API: POST /api/admin/archive/restore/{entity_type}/{entity_id}
   ↓
5. Server processes restoration:
   - Remove deleted_at timestamp
   - Restore entity to original table
   - If user account: Set status to "Active"
   - If booking: Set status based on restore option
   - Create audit log entry:
     - Who restored
     - When
     - Original archive reason
   - Send notifications (if applicable)
   ↓
6. Close modal
   ↓
7. Show success toast:
   "[Entity Type] restored successfully!"
   ↓
8. Remove from archive list
   ↓
9. Navigate to restored entity details page
   → END
```

### Permanent Delete

**Trigger:** Click "Delete Permanently" button

**Flow:**

```
1. Admin clicks "Delete Permanently"
   ↓
2. Critical warning modal:
   "⚠️ PERMANENT DELETION WARNING"
   
   "You are about to permanently delete:"
   - [Entity Type]: [Name/Reference]
   - This action CANNOT be undone
   - All associated data will be lost:
     - For bookings: Payment records, ratings, messages
     - For users: Profile data, history, activity logs
   
   "Type 'DELETE' to confirm:"
   - Text input (must match "DELETE" exactly, case-sensitive)
   - Reason for permanent deletion (textarea, required)
   
   **Action Buttons:**
   - Cancel (gray, larger)
   - Delete Permanently (red, smaller)
   ↓
3. Admin types "DELETE" & reason, clicks "Delete Permanently"
   ↓
4. Final confirmation modal:
   "Are you absolutely sure?"
   - "This is your last chance to cancel."
   - "The data will be permanently erased in 5 seconds..."
   - Countdown timer: 5... 4... 3... 2... 1...
   - Cancel / Yes, Delete Forever buttons
   ↓
5. Admin clicks "Yes, Delete Forever" (or waits for countdown)
   ↓
6. Submit to API: DELETE /api/admin/archive/{entity_type}/{entity_id}
   ↓
7. Server performs hard delete:
   - Delete entity from database
   - Delete all associated records:
     - Cascade delete dependencies
     - Remove files/images from storage
   - Create audit log entry (permanent record of deletion):
     - Who deleted
     - When
     - Reason
     - What was deleted (summary, not full data)
   ↓
8. Close modal
   ↓
9. Show success toast:
   "Entity permanently deleted. This action has been logged."
   ↓
10. Remove from archive list
    → END
```

**Protection Against Accidental Deletion:**
- Triple confirmation required
- Countdown timer forces pause for reconsideration
- Requires typing "DELETE" exactly
- Requires written reason
- Logged in audit trail forever

---

## Chat & Communication

### Admin-Customer Chat

**Access Points:**
- From booking details page: "Message Customer" button
- From customer profile page: "Send Message" button
- From notifications: Click on customer message notification

**Chat Interface:**

**Per-Booking Chat (Threaded):**

```
Left Panel:
- Active chats list
- Each chat item shows:
  - Customer name + photo
  - Booking reference #
  - Last message preview
  - Timestamp
  - Unread count badge
- Filter: All, Unread, By booking status

Right Panel:
- Chat header:
  - Customer name + photo
  - Booking reference (clickable → opens booking details)
  - Service type & date
  - Status badge
  
- Message thread:
  - Chronological messages
  - Customer messages (left-aligned, blue)
  - Admin messages (right-aligned, gray)
  - Each message shows:
    - Sender name
    - Message text
    - Timestamp
    - Read receipts (✓ sent, ✓✓ delivered, ✓✓ read)
  - System messages (center, italic):
    - "Booking created"
    - "Payment verified by Admin Maria"
    - "Technician assigned: Pedro Santos"
  
- Message input (bottom):
  - Text area
  - Attach file button (images, PDF, max 5MB)
  - Send button
  - "Typing..." indicator when customer typing
```

**Flow:**

```
1. Admin navigates to chat
   ↓
2. Admin types message in input area
   ↓
3. Optional: Attach file (image/PDF)
   ↓
4. Click "Send" or press Enter
   ↓
5. Message sent to server via WebSocket
   ↓
6. Server:
   - Saves message to database
   - Sends to customer (push notification + in-app)
   - Returns delivery confirmation
   ↓
7. Message appears in thread (right side)
   - Status: Sent ✓
   ↓
8. When customer reads message:
   - Status updates: Read ✓✓
   ↓
9. Customer replies:
   ↓
10. Admin receives real-time notification:
    - Browser notification (if enabled)
    - Badge count updates on notification bell
    - Chat list updates with new message
    - Message appears in thread (left side)
    ↓
11. Admin sees message, types reply
    → Loop continues
```

**General Messages (Non-Booking Specific):**

Similar interface, but:
- No booking reference
- Accessible from customer profile
- Used for general inquiries, support, follow-ups

### Admin-Technician Chat

**Same interface as Admin-Customer chat**

**Differences:**
- Accessible from:
  - Technician profile page
  - Booking details (if technician assigned)
  - Notifications
- Can include:
  - Job assignment details
  - Schedule changes
  - Performance feedback
  - Admin announcements

**Broadcast Messages:**
- Admin can send message to:
  - All technicians
  - All customers
  - Filtered groups (e.g., active technicians, customers with pending bookings)
- Sent as push notifications + in-app messages
- Not real-time chat, one-way communication

---

## Reports & Analytics

### Generate Reports

**Route:** `/admin/reports`

**Report Types:**

**1. Bookings Report**
- Date range filter
- Status filter
- Service type filter
- Columns: Reference, Customer, Service, Date, Status, Amount, Technician
- Summary: Total bookings, Confirmed, Completed, Cancelled, Revenue

**2. Revenue Report**
- Date range filter
- Breakdown by:
  - Service type (pie chart + table)
  - Brand (bar chart + table)
  - Technician (bar chart + table)
- Summary: Total revenue, Payments collected, Pending payments, Refunds issued

**3. Technician Performance Report**
- Date range filter
- Technician filter (individual or all)
- Metrics:
  - Jobs completed
  - Average rating
  - Customer satisfaction (%)
  - On-time arrival rate
  - Service completion rate
- Chart: Performance trend over time

**4. Customer Analytics**
- Date range filter
- Metrics:
  - New customers
  - Returning customers
  - Customer retention rate
  - Average bookings per customer
  - Customer lifetime value
- Chart: Customer growth over time

**5. Payment Analytics**
- Date range filter
- Metrics:
  - Payments received
  - Payment verification time (average)
  - Refunds issued
  - Refund approval rate
  - Outstanding payments
- Chart: Payment trends

**Export Options:**
- PDF (formatted report with charts)
- Excel (raw data, multiple sheets)
- CSV (simple data export)

**Flow:**

```
1. Admin navigates to Reports page
   ↓
2. Select report type (dropdown)
   ↓
3. Configure filters:
   - Date range (picker)
   - Entity filters (dropdowns)
   - Grouping options (checkboxes)
   ↓
4. Click "Generate Report"
   ↓
5. Show loading state (spinner + "Generating report...")
   ↓
6. Submit to API: POST /api/admin/reports/generate
   - report_type
   - filters
   - format (pdf/excel/csv)
   ↓
7. Server generates report:
   - Query database based on filters
   - Aggregate data
   - Generate charts (if PDF)
   - Format output
   - Save file temporarily
   - Return download URL
   ↓
8. Report preview displays:
   - Summary cards (KPIs)
   - Charts/graphs
   - Data table
   - Export button
   ↓
9. Admin clicks "Export"
   ↓
10. Download modal:
    "Export report as:"
    - PDF (with charts)
    - Excel (with multiple sheets)
    - CSV (data only)
    ↓
11. Admin selects format & clicks "Download"
    ↓
12. File downloads to browser
    ↓
13. Show success toast: "Report exported successfully"
    → END
```

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For questions or clarifications, refer to:
- `AGENTS.md` - Role definitions and access control
- `API.md` - API endpoint specifications
- `DATABASE_TABLES.md` - Database schemas
- `FLOW_BOOKING.md` - Booking lifecycle flows
- `BUSINESS_RULES.md` - Business policies