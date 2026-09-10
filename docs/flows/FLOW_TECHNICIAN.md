# FLOW_TECHNICIAN.md

**Klein & Justin Airconditioning - Technician Mobile App Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Account Registration](#account-registration)
3. [First Login & Password Change](#first-login--password-change)
4. [Home Dashboard](#home-dashboard)
5. [Today's Appointments](#todays-appointments)
6. [Job Status Updates](#job-status-updates)
7. [Schedule Calendar](#schedule-calendar)
8. [Job Details View](#job-details-view)
9. [Customer Location & Navigation](#customer-location--navigation)
10. [Profile Management](#profile-management)
11. [Performance Metrics](#performance-metrics)
12. [Admin Communication](#admin-communication)
13. [Notifications](#notifications)
14. [Settings](#settings)
15. [Help Center](#help-center)

---

## Overview

### Purpose
This document defines all technician workflows in the KJAC mobile app (Flutter), covering account creation, job management, status updates, schedule viewing, and performance tracking.

### Technician Capabilities
- **View assigned jobs** - Access today's and upcoming appointments
- **Update job status** - Report progress (On the way, Arrived, Start service, Complete)
- **View schedule** - Calendar view of all assigned appointments
- **View customer info** - Contact details and location
- **Navigate to location** - GPS integration for directions
- **View performance** - Personal metrics (jobs completed, ratings, success rate)
- **Communicate with admin** - Request help or report issues
- **Manage profile** - Update info (requires admin approval)

### Access Control
- **Account Creation:** Self-registration (requires admin approval) OR Admin-created account
- **Authentication:** Technician ID/Email + Password
- **First Login:** Must change password (if admin-created)
- **Session:** Persistent login with biometric option
- **Profile Edits:** Require admin approval (except profile picture)

---

## Account Registration

### Self-Registration Flow

**Starting Point:** Technician opens app, clicks "Register as Technician"

**Important Note:** Self-registered accounts require admin approval before becoming active

**Flow:**

```
1. Technician taps "Register as Technician" on login page
   ↓
2. Registration form displays:
   
   **Personal Information:**
   - First name (required)
   - Middle name (optional)
   - Last name (required)
   - Email (required, must be unique)
   - Contact number (required, Philippine format)
   - Birthday (date picker, must be 18+)
   
   **Address:**
   - Region (dropdown, PSGC API)
   - Province (dropdown)
   - City/Municipality (dropdown)
   - Barangay (dropdown)
   - Street address (text input)
   - Landmark (optional)
   
   **Account Credentials:**
   - Password (required, min 12 characters)
   - Confirm password (required, must match)
   
   **Password Requirements Display:**
   - ✓/✗ At least 12 characters
   - ✓/✗ Contains uppercase letter
   - ✓/✗ Contains lowercase letter
   - ✓/✗ Contains number
   - ✓/✗ Contains special character
   
   **Profile Photo (optional):**
   - Upload photo button (camera/gallery)
   - Circular crop
   
   **Terms & Conditions:**
   - ☐ I agree to the terms and conditions
   - ☐ I agree to background verification
   - Both checkboxes required
   
   **Action Buttons:**
   - Cancel
   - Submit Application (disabled until valid)
   ↓
3. Technician fills form
   - Real-time validation on each field
   - Password strength indicator
   - Address dropdowns load dynamically
   ↓
4. Technician clicks "Submit Application"
   ↓
5. Client-side validation:
   - All required fields filled
   - Email format valid
   - Phone format valid (Philippine)
   - Birthday makes technician 18+
   - Passwords match
   - Password meets requirements
   - Terms accepted
   ↓
   ├─ Validation fails
   │  └─> Show field errors
   │      Focus first invalid field
   │      → Return to step 3
   │
   └─ Validation passes
      ↓
6. Submit to API: POST /api/technician/register
   - Show loading overlay
   ↓
7. Server processes registration:
   - Check if email already exists
   - Check if phone already exists
   - Create technician record:
     - Status: "Pending Approval"
     - force_password_change: false (they set their own)
     - account_verified: false
   - Upload profile photo (if provided)
   - Send verification email to technician
   - Send notification to admin:
     "New technician registration pending approval"
   - Create audit log entry
   ↓
8. API responds with success
   ↓
9. Navigate to Registration Success page
   ↓
   **Registration Success Screen:**
   
   - Success icon (animated checkmark)
   - "Application Submitted Successfully!"
   
   - "Your application is under review"
   - "Admin will review and approve within 1-3 business days"
   
   - **What happens next:**
     1. ✓ Application submitted
     2. → Admin reviews your information
     3. → Background verification (if required)
     4. → You'll receive email when approved
     5. → You can log in once approved
   
   - "Check your email: [technician@email.com]"
   - "We sent a verification link"
   
   - **Action Buttons:**
     - Check Email App (opens email app)
     - Back to Login (primary blue)
   ↓
10. Technician waits for admin approval
    - Receives email when approved
    - Can then log in
    → END
```

**Error Handling:**

- **Email already exists:** "This email is already registered. Try logging in or use a different email."
- **Phone already exists:** "This phone number is already registered."
- **Network error:** "Registration failed. Please check your connection and try again." (Saves form data for retry)
- **Server error:** "Something went wrong. Please try again later."

### Admin-Created Account Activation

**Context:** Admin created technician account with auto-generated password

**Flow:**

```
1. Admin creates technician account in admin panel
   ↓
2. System generates credentials:
   - Technician ID: TEC-YYYYMMDD-XXXX
   - Email: (provided by admin)
   - Random password: (16 characters)
   - Status: "Active"
   - force_password_change: true
   ↓
3. System sends email to technician:
   
   Subject: "Welcome to KJAC - Your Technician Account"
   
   Body:
   - Welcome message
   - Your credentials:
     - Technician ID: TEC-20260910-0001
     - Email: pedro.santos@email.com
     - Temporary Password: [shown in email]
   - "Download the KJAC Technician App"
   - App Store / Play Store links
   - "You must change your password on first login"
   ↓
4. Technician receives email
   ↓
5. Technician downloads app
   ↓
6. Technician opens app → Login page
   ↓
7. Technician enters credentials
   → Go to First Login & Password Change Flow
```

---

## First Login & Password Change

### Forced Password Change (Admin-Created Accounts Only)

**Starting Point:** Admin-created account logging in for first time

**Flow:**

```
1. Technician enters login credentials:
   - Technician ID: TEC-20260910-0001
   - Temporary password: (from email)
   ↓
2. Submit to API: POST /api/technician/login
   ↓
3. Server validates credentials:
   - Credentials correct
   - Account status: Active
   - force_password_change: true
   ↓
4. API responds:
   - success: true
   - requires_password_change: true
   - temporary_token: (limited access token)
   ↓
5. App detects requires_password_change = true
   ↓
6. Navigate to Change Password page (cannot skip)
   ↓
7. Change Password form displays:
   
   **Page Header:**
   - "Change Your Password"
   - "For security, you must set a new password"
   
   **Form Fields:**
   - Current password (required, pre-filled from login)
   - New password (required)
   - Confirm new password (required)
   
   **Password Requirements (live validation):**
   - ✓/✗ At least 12 characters
   - ✓/✗ Different from temporary password
   - ✓/✗ Contains uppercase letter
   - ✓/✗ Contains lowercase letter
   - ✓/✗ Contains number
   - ✓/✗ Contains special character
   
   **Password Strength Meter:**
   - Weak (red) | Fair (yellow) | Good (blue) | Strong (green)
   
   **Action Buttons:**
   - Change Password (disabled until valid)
   - Logout (if user wants to try later)
   ↓
8. Technician enters new password
   ↓
9. Technician clicks "Change Password"
   ↓
10. Client-side validation
    ↓
11. Submit to API: POST /api/technician/change-password
    - temporary_token
    - old_password
    - new_password
    - Show loading overlay
    ↓
12. Server processes:
    - Validate old password
    - Validate new password (requirements)
    - Check new password not same as old
    - Hash new password
    - Update password in database
    - Set force_password_change: false
    - Generate full access token
    - Create audit log entry
    - Send confirmation email
    ↓
13. API responds with success
    ↓
14. Show success toast:
    "Password changed successfully!"
    ↓
15. Navigate to Home Dashboard
    → First login complete
    → END
```

---

## Home Dashboard

### Dashboard Layout

**Bottom Tab Navigation:**
1. 🏠 Home (active)
2. 📅 Schedule
3. 📊 Performance
4. 👤 Profile

**Home Screen Sections:**

**1. Header**
- Greeting: "Good morning, Pedro!" (time-based)
- Profile photo (clickable → Profile page)
- Notification bell (badge count)

**2. Status Card (Top)**
```
┌─────────────────────────────────┐
│ Your Status: Available           │
│ [Toggle: Available / Off-duty]   │
│                                  │
│ If Available:                    │
│ "Ready for new assignments"      │
│                                  │
│ If Off-duty:                     │
│ "You won't receive new jobs"     │
└─────────────────────────────────┘
```

**3. Today's Summary (3 Stats Cards - Horizontal Scroll)**

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 3                │  │ 2                │  │ 1                │
│ Jobs Today       │  │ Completed        │  │ Ongoing          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**4. Current Job Card (if any)**

If technician has ongoing job:

```
┌─────────────────────────────────┐
│ [Status Badge: Ongoing]          │
│                                  │
│ Current Job                      │
│ #KJ-2026-001234                 │
│ ──────────────────────────────  │
│ 📍 Aircon Repair                │
│ 🏷️ Brand: Daikin                │
│                                  │
│ Customer: Juan Dela Cruz         │
│ 📞 0917-123-4567                │
│ 📍 123 Main St, Sta. Cruz        │
│    Landmark: Near McDonald's     │
│                                  │
│ Current Status: In Service       │
│ Started: 10:30 AM                │
│                                  │
│ [View Details] [Update Status]   │
└─────────────────────────────────┘
```

If no ongoing job:
```
┌─────────────────────────────────┐
│ No Active Job                    │
│ "You have no ongoing service"    │
│ "View today's appointments below"│
└─────────────────────────────────┘
```

**5. Today's Appointments Section**
- Section header: "Today's Schedule"
- If no appointments: "No appointments today. Enjoy your day!"
- List of appointment cards (see Today's Appointments section)

**6. Quick Actions (2x2 Grid)**
- View Full Schedule (calendar icon)
- Contact Admin (chat icon)
- View Performance (chart icon)
- Help Center (question icon)

**7. Recent Notifications (3 most recent)**
- Notification cards (tap to view full notification)
- "View All" link → Notifications page

**Pull to Refresh:**
- Updates: Current job, today's jobs, stats

---

## Today's Appointments

### Appointment List View

**Starting Point:** Home screen → Today's Appointments section OR Schedule tab → Today filter

**Page Layout:**

**Header:**
- Title: "Today's Appointments"
- Date: September 10, 2026
- Count: "3 jobs scheduled"
- Filter chips: All / Confirmed / Ongoing / Completed

**Appointment Cards (Chronological Order):**

```
┌─────────────────────────────────┐
│ 8:00 AM - 9:00 AM                │
│ [Status Badge: Confirmed]        │
│ ──────────────────────────────  │
│ #KJ-2026-001232                 │
│                                  │
│ Service: Aircon Installation     │
│ Brand: Daikin                    │
│                                  │
│ Customer: Maria Santos           │
│ 📞 0917-234-5678                │
│ 📍 456 Oak St, Brgy. Labuin      │
│    Landmark: Green gate          │
│                                  │
│ [View Details] [Start Navigation]│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 10:00 AM - 11:00 AM              │
│ [Status Badge: Ongoing]          │
│ ──────────────────────────────  │
│ #KJ-2026-001234                 │
│ (Current job - details above)    │
│                                  │
│ [View Details] [Update Status]   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 2:00 PM - 3:00 PM                │
│ [Status Badge: Confirmed]        │
│ ──────────────────────────────  │
│ #KJ-2026-001236                 │
│ (Next job details)               │
│                                  │
│ [View Details] [Start Navigation]│
└─────────────────────────────────┘
```

**Card States:**

- **Confirmed:** Blue border, "View Details" + "Start Navigation" buttons
- **Ongoing:** Green border, pulsing animation, "Update Status" button
- **Completed:** Gray, checkmark, "View Details" (read-only)

**Tap Card:** Opens full job details

**Empty State:**
- "No appointments today"
- "Check your schedule for upcoming jobs"

---

## Job Status Updates

### Update Job Status Flow

**Context:** Technician progresses through job stages

**Status Progression:**
1. Confirmed → 2. On the way → 3. Arrived → 4. Start service → 5. Complete

**Starting Point:** Technician taps "Update Status" button

**Flow:**

```
1. Technician views current job card
   - Current status: Confirmed
   ↓
2. Technician taps "Update Status" button
   ↓
3. Status update modal opens:
   
   **Current Status Display:**
   - Shows current status badge
   - Job reference #
   - Customer name
   
   **Status Progression (Stepper):**
   ```
   ✓ Confirmed
   │
   → On the way (next step, highlighted)
   │
   ○ Arrived
   │
   ○ Start service
   │
   ○ Complete
   ```
   
   **Next Status Action:**
   - Large button: "Update Status to: ON THE WAY"
   - Note: "Customer will be notified"
   
   **Action Buttons:**
   - Cancel
   - Confirm Update (primary blue)
   ↓
4. Technician taps "Confirm Update"
   ↓
5. Submit to API: PUT /api/technician/jobs/{job_id}/status
   - new_status: "on_the_way"
   - timestamp: current time
   - Show loading overlay
   ↓
6. Server updates job:
   - Update booking status
   - Record timestamp
   - Send push notification to customer:
     "Your technician is on the way!"
   - Send notification to admin
   - Create audit log entry
   ↓
7. API responds with success
   ↓
8. Close modal
   ↓
9. Show success toast:
   "Status updated! Customer notified."
   ↓
10. Job card updates with new status:
    - Status badge: "On the way"
    - Shows: "Updated at 9:45 AM"
    ↓
11. After reaching location:
    Technician taps "Update Status" again
    ↓
12. Modal shows next step: "ARRIVED"
    ↓
13. Confirm update
    ↓
    Customer receives notification:
    "Your technician has arrived!"
    ↓
14. Status badge: "Arrived"
    ↓
15. When ready to start work:
    Technician taps "Update Status" again
    ↓
16. Modal shows next step: "START SERVICE"
    ↓
17. Confirm update
    ↓
    Additional prompt:
    "Starting service now?"
    - This will start the service timer
    - Customer will be notified
    - Confirm / Cancel buttons
    ↓
18. Confirm start
    ↓
    Status badge: "In service"
    Timer starts: "00:15:30" (elapsed time)
    Customer notification:
    "Service has started!"
    ↓
19. After completing work:
    Technician taps "Update Status" again
    ↓
20. Modal shows final step: "COMPLETE SERVICE"
    ↓
21. Completion form displays:
    
    **Service Completion Details:**
    
    - Service duration (auto-filled from timer)
    - Work performed (textarea, required)
      - "Describe what was done"
    - Parts used (optional):
      - Search inventory items
      - Add quantities
    - Additional charges (optional):
      - Extra parts: ₱XXX.XX
      - Additional labor: ₱XXX.XX
    - Customer signature pad:
      - "Customer signature (required)"
      - Clear button
    - Before/after photos (optional):
      - Upload before photos
      - Upload after photos
      - Max 5 each
    
    **Total Summary:**
    - Original service fee: ₱1,500.00
    - Additional charges: ₱200.00
    - Total: ₱1,700.00
    
    **Action Buttons:**
    - Cancel
    - Complete Service (disabled until signature)
    ↓
22. Technician fills completion details
    - Describes work performed
    - Adds parts used (if any)
    - Adds additional charges (if any)
    - Gets customer signature
    - Takes after photos (optional)
    ↓
23. Technician taps "Complete Service"
    ↓
24. Confirmation modal:
    "Complete this service?"
    - "This action marks the job as done"
    - "Customer will be asked to pay balance"
    - "You cannot undo this action"
    - Review summary
    - Cancel / Confirm Completion buttons
    ↓
25. Technician taps "Confirm Completion"
    ↓
26. Submit to API: PUT /api/technician/jobs/{job_id}/complete
    - completion_notes
    - parts_used
    - additional_charges
    - customer_signature (base64 image)
    - before_photos
    - after_photos
    - duration
    - Show loading overlay
    ↓
27. Server processes completion:
    - Update booking status to "Completed"
    - Record completion timestamp
    - Save signature & photos to storage
    - Update inventory (if parts used)
    - Calculate total charges
    - Calculate technician commission
    - Send notifications:
      - Push to customer: "Service completed! Please rate."
      - Email with service receipt
      - Push to admin: "Job completed by [Technician]"
    - Create audit log entry
    ↓
28. API responds with success
    ↓
29. Navigate to Completion Success screen:
    
    - Success icon (animated checkmark)
    - "Service Completed!"
    - "Great job, Pedro!"
    
    - Job summary:
      - Reference #
      - Customer name
      - Duration: 1 hr 30 mins
      - Total amount: ₱1,700.00
      - Your commission: ₱170.00 (10%)
    
    - "Customer will be asked to rate your service"
    
    - **Action Buttons:**
      - View Receipt (PDF)
      - Back to Home (primary blue)
      - View Next Job (if any)
    ↓
30. Job card updates:
    - Status badge: "Completed" (green with checkmark)
    - Shows completion time
    - Read-only
    ↓
31. Job moves to "Completed Jobs" list
    → END
```

**Important Notes:**

- **Cannot skip steps:** Must go in order (On the way → Arrived → Start → Complete)
- **Cannot go backwards:** Once updated, cannot revert to previous status
- **Timer:** Service duration automatically tracked
- **Customer signature:** Required for completion (proof of service)
- **Photos:** Recommended but optional (documentation)

**Error Handling:**

- **Network error:** "Update failed. Please try again." (Status not changed)
- **Already updated:** "This job status has been updated by admin/system"
- **Invalid status transition:** "Cannot update to this status. Please follow the correct order."

---

## Schedule Calendar

### Calendar View

**Starting Point:** Tap "Schedule" tab in bottom navigation

**Page Layout:**

**Calendar Views (Tabs):**
- Week (default)
- Month
- List

**Week View:**
```
        Mon    Tue    Wed    Thu    Fri    Sat
8 AM    [Job]  -      -      -      [Job]  -
9 AM    ...    -      -      -      ...    -
10 AM   -      [Job]  -      -      -      -
11 AM   -      ...    -      -      -      -
12 PM   -      -      -      -      -      -
1 PM    -      -      [Job]  -      -      -
2 PM    -      -      ...    -      -      [Job]
3 PM    -      -      -      -      -      ...
4 PM    -      -      -      -      -      -
5 PM    -      -      -      -      -      -
```

- Each job shows: Customer name, Service type (icon)
- Tap job → Opens job details
- Color-coded by status:
  - Blue: Confirmed
  - Green: Ongoing
  - Gray: Completed
- Current time indicator (red line)
- Swipe left/right to navigate weeks

**Month View:**
```
September 2026

S   M   T   W   T   F   S
1   2   3   4   5   6   7
8   9   10  11  12  13  14
15  16  17  18  19  20  21
22  23  24  25  26  27  28
29  30
```

- Days with jobs: Bold with blue dot
- Today: Blue circle
- Tap day → Shows jobs for that day (bottom sheet)

**List View:**
- Chronological list of all upcoming jobs
- Grouped by date
- Same card design as Today's Appointments
- Filter: This week / This month / All upcoming

**Empty States:**
- "No jobs scheduled"
- "New assignments will appear here"

---

## Job Details View

### View Full Job Information

**Trigger:** Tap job card from any list or calendar

**Page Layout:**

**Header:**
- Large status badge
- Job reference # (with copy button)

**Customer Information Card:**
```
┌─────────────────────────────────┐
│ Customer Details                 │
│ ──────────────────────────────  │
│ Name: Juan Dela Cruz             │
│ Phone: 0917-123-4567             │
│ [Call] [Message] buttons         │
│                                  │
│ Address:                         │
│ 123 Main St, Brgy. Labuin        │
│ Sta. Cruz, Laguna                │
│ Landmark: Near McDonald's        │
│                                  │
│ [View on Map] [Start Navigation] │
└─────────────────────────────────┘
```

**Service Information Card:**
```
┌─────────────────────────────────┐
│ Service Details                  │
│ ──────────────────────────────  │
│ Service: Aircon Repair           │
│ Brand: Daikin                    │
│ Date: Sept 10, 2026              │
│ Time: 10:00 AM - 11:00 AM        │
│                                  │
│ Problem Description:             │
│ "Aircon not cooling properly.    │
│  Making strange noise."          │
│                                  │
│ Customer Photos: (if any)        │
│ [Photo 1] [Photo 2] [Photo 3]    │
│ (Tap to view full size)          │
└─────────────────────────────────┘
```

**Service Fee Card:**
```
┌─────────────────────────────────┐
│ Payment Information              │
│ ──────────────────────────────  │
│ Service fee: ₱1,500.00          │
│ Down payment: ₱500.00 (paid)    │
│ Balance: ₱1,000.00               │
│ (To be collected on completion)  │
└─────────────────────────────────┘
```

**Status Timeline:**
- Visual stepper showing progress (same as customer view)

**Action Buttons (Bottom, context-aware):**

If status = "Confirmed":
- [Start Navigation] (primary blue)
- [Contact Customer] (outline)
- [Update Status: On the way] (green)

If status = "On the way":
- [Update Status: Arrived] (green)
- [Call Customer] (outline)

If status = "Arrived":
- [Update Status: Start Service] (green)

If status = "In service":
- [Update Status: Complete] (green)
- Service timer showing elapsed time
- [Report Issue] (outline yellow)

If status = "Completed":
- [View Completion Details] (outline)
- [View Receipt] (outline)

**Need Help Section:**
- [Contact Admin] button
- [Report Problem] button

---

## Customer Location & Navigation

### View Location on Map

**Trigger:** Tap "View on Map" button in job details

**Flow:**

```
1. Technician taps "View on Map"
   ↓
2. Full-screen map view opens (Leaflet)
   ↓
3. Map displays:
   - Customer location (red pin with house icon)
   - Technician current location (blue pin with person icon)
   - Route line connecting both (if navigation started)
   - Distance & estimated time (at top)
   
   **Map Controls:**
   - Zoom in / Zoom out buttons
   - Center on customer button
   - Center on my location button
   - Layer toggle (Standard / Satellite)
   
   **Customer Info Card (Bottom):**
   ```
   ┌─────────────────────────────────┐
   │ Juan Dela Cruz                   │
   │ 123 Main St, Sta. Cruz           │
   │ Near McDonald's                  │
   │                                  │
   │ Distance: 2.5 km                 │
   │ Est. time: 8 minutes             │
   │                                  │
   │ [Call] [Start Navigation] [Close]│
   └─────────────────────────────────┘
   ```
   ↓
4. Technician taps "Start Navigation"
   ↓
5. Navigation options modal:
   "Open in:"
   - Google Maps (if installed)
   - Waze (if installed)
   - Apple Maps (iOS only)
   - In-app navigation (basic)
   - Cancel
   ↓
6. Technician selects navigation app
   ↓
7. App opens selected navigation app with coordinates
   - Passes customer address as destination
   ↓
8. Technician navigates to customer location
   - Can return to KJAC app anytime
   - Job details remain accessible
   → END
```

**Location Permissions:**

If location permission not granted:
```
1. Prompt: "Enable location access?"
   - "We need your location to navigate to customers"
   - [Enable Location] button
   ↓
2. System permission dialog
   ↓
3. If granted: Show map
4. If denied: Show error message
   - "Cannot show map without location permission"
   - [Go to Settings] button
```

---

## Profile Management

### View Profile

**Trigger:** Tap "Profile" tab in bottom navigation

**Profile Page Layout:**

**Header:**
- Large profile photo (tappable to change)
- Name: Pedro Santos
- Technician ID: TEC-20260910-0001
- Status badge: Active

**Quick Stats (3 Cards - Horizontal):**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 150          │  │ 4.8 ⭐       │  │ 95%          │
│ Jobs Done    │  │ Rating       │  │ Success Rate │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Personal Information Section:**
- Full name
- Email
- Contact number
- Birthday
- Address (full)
- [Edit Profile] button

**Employment Information Section:**
- Date hired: Jan 15, 2025
- Employee ID: TEC-20260910-0001
- Status: Active
- Commission rate: 10%

**Account Settings Section:**
- Change password
- Notification preferences
- Language
- Help & Support

**Action Button (Bottom):**
- [Logout] (red)

### Edit Profile

**Trigger:** Tap "Edit Profile" button

**Important Rule:** Profile edits require admin approval (except profile picture)

**Flow:**

```
1. Technician taps "Edit Profile"
   ↓
2. Edit profile page displays
   ↓
3. Editable fields:
   
   **Profile Photo:**
   - Tap to change (Camera / Gallery)
   - Changes immediately (no approval needed)
   
   **Personal Information:**
   - First name
   - Middle name
   - Last name
   - Contact number
   - Address (all components)
   
   Read-only fields:
   - Email (cannot change)
   - Technician ID
   - Date hired
   
   **Note displayed:**
   ⚠️ "Changes to your profile require admin approval"
   "Except profile photo, which updates immediately"
   ↓
4. Technician modifies fields
   ↓
5. Technician taps "Save Changes"
   ↓
6. Confirmation modal:
   "Submit profile changes?"
   
   - Shows what changed:
     Old → New
   
   - "Changes will be reviewed by admin"
   - "You'll be notified when approved"
   
   - Cancel / Submit buttons
   ↓
7. Tap "Submit"
   ↓
8. Submit to API: PUT /api/technician/profile
   - changes: {field: new_value}
   - requires_approval: true
   - Show loading overlay
   ↓
9. Server processes:
   - Save changes to pending_changes table
   - Keep current data unchanged
   - Send notification to admin:
     "Technician [Name] requested profile changes"
   - Send confirmation email to technician
   - Create audit log entry
   ↓
10. API responds with success
    ↓
11. Show success modal:
    "Changes submitted for approval!"
    - "Admin will review your request"
    - "Current profile remains until approved"
    - OK button
    ↓
12. Profile page shows:
    - Current data (unchanged)
    - Yellow banner: "Profile changes pending approval"
    - [View Pending Changes] button
    ↓
13. After admin approval:
    - Technician receives push notification:
      "Your profile changes have been approved!"
    - Email notification
    - Profile updates with new data
    - Banner removed
    → END
```

**Profile Photo Change (Immediate):**

```
1. Tap profile photo
   ↓
2. Photo options modal:
   - Take Photo (camera)
   - Choose from Gallery
   - Remove Photo (if has photo)
   - Cancel
   ↓
3. Select option
   ↓
4. If camera/gallery:
   - Open image picker
   - Technician selects/takes photo
   - Crop to circle
   ↓
5. Preview modal:
   - Shows cropped photo
   - Discard / Save buttons
   ↓
6. Tap "Save"
   ↓
7. Submit to API: POST /api/technician/profile-photo
   - photo: base64 image
   - Show loading overlay
   ↓
8. Server:
   - Resize & compress image
   - Save to cloud storage
   - Update technician record (immediate, no approval)
   - Create audit log entry
   ↓
9. Profile photo updates immediately
   ↓
10. Show success toast:
    "Profile photo updated!"
    → END
```

---

## Performance Metrics

### View Performance Dashboard

**Trigger:** Tap "Performance" tab in bottom navigation

**Page Layout:**

**Overview Cards (Top):**

```
┌───────────────────────────────────────┐
│ This Month's Performance               │
│ ─────────────────────────────────────│
│                                        │
│  150        4.8 ⭐      95%      8     │
│  Jobs       Rating    Success   Days  │
│  Total                 Rate    Active │
└───────────────────────────────────────┘
```

**Detailed Stats Sections:**

**1. Job Statistics**
- Total jobs completed (all-time): 150
- This month: 45
- This week: 12
- Today: 3
- Average jobs per day: 5.2

**2. Rating & Reviews**
- Overall rating: 4.8 ⭐ (from 120 reviews)
- 5 stars: 85%
- 4 stars: 12%
- 3 stars: 2%
- 2 stars: 1%
- 1 star: 0%
- [View All Reviews] button

**3. Performance Metrics**
- On-time arrival rate: 95%
- Service completion rate: 98%
- Customer satisfaction: 4.8/5.0
- Average service duration: 1 hr 15 mins
- Rework rate: 2% (lower is better)

**4. Earnings (This Month)**
- Total service fees: ₱67,500.00
- Your commission (10%): ₱6,750.00
- Additional charges: ₱1,200.00
- Total earnings: ₱7,950.00
- [View Detailed Breakdown] button

**5. Ranking (Optional)**
- Your rank: #3 out of 12 technicians
- Top performer: Mario Reyes (165 jobs)
- "Keep up the great work! 💪"

**Charts:**

**Chart 1: Jobs Trend (Line Chart)**
- X-axis: Last 30 days
- Y-axis: Number of jobs
- Shows daily job count

**Chart 2: Rating Trend (Line Chart)**
- X-axis: Last 6 months
- Y-axis: Average rating
- Shows monthly average rating

**Chart 3: Service Types Distribution (Pie Chart)**
- Breakdown by service type
- Installation: 40%
- Repair: 35%
- Maintenance: 20%
- Cleaning: 5%

**Recent Reviews Section:**
- Last 5 customer reviews
- Each shows:
  - Star rating
  - Customer name (first name only)
  - Review text
  - Date
  - Service type

**Pull to Refresh:**
- Updates all stats and charts

---

## Admin Communication

### Contact Admin

**Trigger:** Tap "Contact Admin" button (from various places)

**Communication Options:**

**1. In-App Chat**

```
1. Technician taps "Contact Admin"
   ↓
2. Chat page opens
   ↓
3. Chat interface:
   
   **Header:**
   - Title: "Admin Support"
   - Status: Online / Offline
   
   **Message Thread:**
   - Previous messages (chronological)
   - Technician messages (right, blue)
   - Admin messages (left, gray)
   - System messages (center, italic)
   
   **Message Input (Bottom):**
   - Text area
   - Attach photo button (send job photos, etc.)
   - Send button
   ↓
4. Technician types message
   ↓
5. Tap "Send"
   ↓
6. Message sent to admin (WebSocket)
   - Admin receives push notification
   - Message appears in admin's chat list
   ↓
7. Admin replies
   ↓
8. Technician receives:
   - Push notification (if app in background)
   - Message appears in thread (real-time)
   ↓
9. Conversation continues
   → END
```

**2. Report Issue**

```
1. Technician taps "Report Problem"
   ↓
2. Issue report form displays:
   
   **Form Fields:**
   - Issue category (dropdown, required):
     - Job-related issue
     - Customer problem
     - App technical issue
     - Payment inquiry
     - Schedule conflict
     - Other
   
   - Related job (optional):
     - Search by reference #
   
   - Issue description (textarea, required):
     - "Describe the issue in detail"
   
   - Attach photos (optional):
     - Max 5 photos
   
   - Urgency level:
     - Normal (default)
     - Urgent (needs immediate attention)
   
   **Action Buttons:**
   - Cancel
   - Submit Report
   ↓
3. Technician fills form
   ↓
4. Tap "Submit Report"
   ↓
5. Submit to API: POST /api/technician/report-issue
   - Show loading overlay
   ↓
6. Server creates issue ticket:
   - Generate ticket #: ISSUE-YYYYMMDD-XXX
   - Assign to admin team
   - Send notification to admin (high priority if urgent)
   - Create audit log entry
   - Send confirmation to technician
   ↓
7. Success screen:
   "Issue Reported"
   - Ticket #: ISSUE-20260910-001
   - "Admin will respond within 24 hours"
   - "You can track this in Notifications"
   - OK button
   ↓
8. Technician receives updates:
   - When admin responds
   - When issue resolved
   → END
```

**3. Call Admin (Direct)**

```
1. Tap "Call Admin" button
   ↓
2. Confirmation modal:
   "Call KJAC Office?"
   - Phone: 0926-633-3129
   - Business hours: Mon-Sat, 8 AM - 5 PM
   - Cancel / Call buttons
   ↓
3. Tap "Call"
   ↓
4. Opens phone dialer with number
   → END
```

---

## Notifications

### Notification Center

**Access:** Tap notification bell icon (top right)

**Page Layout:**

**Header:**
- Title: "Notifications"
- Mark all as read button
- Filter: All / Unread

**Notification Types:**

**1. Job Assignments**
```
┌─────────────────────────────────┐
│ 🔵 New Job Assigned              │
│ Aircon Repair at 123 Main St    │
│ Tomorrow at 10:00 AM             │
│ 2 hours ago                      │
└─────────────────────────────────┘
```

**2. Schedule Changes**
```
┌─────────────────────────────────┐
│ ⚠️ Schedule Updated              │
│ Job #KJ-2026-001234              │
│ Rescheduled to Sept 12 at 2 PM   │
│ 1 hour ago                       │
└─────────────────────────────────┘
```

**3. Customer Messages**
```
┌─────────────────────────────────┐
│ 💬 Message from Admin            │
│ "Please confirm arrival time"    │
│ 30 minutes ago                   │
└─────────────────────────────────┘
```

**4. Performance Updates**
```
┌─────────────────────────────────┐
│ ⭐ New Rating Received           │
│ 5 stars from Maria Santos        │
│ "Excellent service!"             │
│ 5 minutes ago                    │
└─────────────────────────────────┘
```

**5. System Announcements**
```
┌─────────────────────────────────┐
│ 📢 System Update                 │
│ "New features available!"        │
│ Yesterday                        │
└─────────────────────────────────┘
```

**Tap Notification:** Opens related page (job details, chat, etc.)
**Swipe Left:** Delete notification

---

## Settings

### App Settings

**Route:** Profile tab → Settings button (gear icon)

**Settings Sections:**

**1. Account**
- Change password
- Email: (read-only, contact admin to change)
- Phone: (edit requires approval)

**2. Notifications**
- Push notifications (toggle)
- Email notifications (toggle)
- SMS notifications (toggle, future)
- By category:
  - Job assignments
  - Schedule changes
  - Customer messages
  - Performance updates
  - System announcements

**3. Availability**
- Default status: Available / Off-duty
- Auto-switch off-duty at: (time picker, optional)
- Days off: (multi-select weekdays)

**4. App Preferences**
- Language: English / Filipino
- Theme: Light / Dark / System
- Default navigation app: Google Maps / Waze / Apple Maps

**5. Security & Privacy**
- Enable biometric login (Face ID / Touch ID)
- Require password for sensitive actions
- View privacy policy
- View terms of service

**6. Help & Support**
- FAQs
- Tutorial videos
- Contact admin
- Report a problem

**7. About**
- App version
- Check for updates
- Licenses

**Logout Button (Bottom, Red):**
- Confirmation modal: "Log out?"

---

## Help Center

### Support Resources

**Route:** Profile → Help Center

**Page Sections:**

**1. FAQs (Accordion)**

Categories:
- Getting Started
- Managing Jobs
- Updating Status
- Customer Communication
- Payment & Earnings
- Technical Issues

Each FAQ:
- Question (tap to expand)
- Answer with screenshots/GIFs

**2. Tutorial Videos**
- How to update job status
- How to complete a service
- How to navigate to customer
- How to use the chat feature

**3. Quick Links**
- Contact admin support
- View performance tips
- Read service guidelines
- Report a bug

**4. Contact Information**
- Email: abadeciomar@yahoo.com
- Phone: 0926-633-3129
- Business hours: Mon-Sat, 8 AM - 5 PM

**5. Feedback**
- "Rate this app" button
- "Suggest a feature" button

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_AUTH.md` - Technician authentication flows
- `FLOW_ADMIN.md` - Admin workflows (technician management)
- `FLOW_BOOKING.md` - Booking lifecycle (technician assignment)
- `API.md` - Technician API endpoints
- `DESIGN.md` - Mobile UI/UX specifications (HIG)