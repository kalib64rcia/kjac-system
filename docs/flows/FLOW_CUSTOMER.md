# FLOW_CUSTOMER.md

**Klein & Justin Airconditioning - Customer Mobile App Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [App Onboarding](#app-onboarding)
3. [Profile Management](#profile-management)
4. [Home Dashboard](#home-dashboard)
5. [Create Booking](#create-booking)
6. [My Bookings](#my-bookings)
7. [Payment Upload](#payment-upload)
8. [Track Booking Status](#track-booking-status)
9. [Cancel Booking](#cancel-booking)
10. [Reschedule Booking](#reschedule-booking)
11. [Rate & Review](#rate--review)
12. [Service History](#service-history)
13. [Promotions & Offers](#promotions--offers)
14. [Notifications](#notifications)
15. [Settings](#settings)
16. [Help & Support](#help--support)

---

## Overview

### Purpose
This document defines all customer workflows in the KJAC mobile app (Flutter), covering registration, booking creation, payment handling, service tracking, and account management.

### Customer Capabilities
- **Self-registration** - Create account with email verification
- **Profile management** - Update personal info and address
- **Booking management** - Create, track, cancel, reschedule bookings
- **Payment handling** - Upload GCash receipts for verification
- **Service tracking** - Real-time status updates
- **Rating system** - Rate technicians after service completion
- **History viewing** - Access past bookings and receipts
- **Promotions** - View active offers and discounts

### Access Control
- **Authentication:** Email + Password
- **Verification:** Magic link via email (required before first booking)
- **Session:** Persistent login with biometric option (Face ID / Touch ID)
- **Profile completion:** Address required before creating first booking

---

## App Onboarding

### First Launch Experience

**Starting Point:** User opens app for first time

**Flow:**

```
1. App launches → Check if first time user
   ↓
2. Onboarding screens (swipeable carousel):
   
   **Screen 1: Welcome**
   - App logo (large, centered)
   - "Welcome to KJAC"
   - "Your trusted aircon service partner"
   - Continue button (bottom)
   
   **Screen 2: Book Services**
   - Illustration: Calendar + aircon icon
   - "Easy Booking"
   - "Schedule your aircon service in just a few taps"
   - Skip button (top right)
   - Next button (bottom)
   
   **Screen 3: Track Progress**
   - Illustration: Map with technician icon
   - "Real-Time Tracking"
   - "Know exactly when your technician will arrive"
   - Skip / Next buttons
   
   **Screen 4: Secure Payments**
   - Illustration: GCash / payment icon
   - "Secure Payment"
   - "Upload your GCash receipt and we'll verify it"
   - Skip / Next buttons
   
   **Screen 5: Quality Service**
   - Illustration: 5-star rating
   - "Quality Guaranteed"
   - "Rate our technicians and help us improve"
   - Skip / Get Started button
   ↓
3. User swipes through or clicks Skip
   ↓
4. Final screen:
   "Ready to get started?"
   - Create Account button (primary, blue)
   - Already have an account? Log in (text link)
   ↓
5. User selects action:
   - Create Account → Go to Registration Flow
   - Log in → Go to Login Flow
   ↓
6. Save preference: onboarding_completed = true
   - Next launch skips onboarding, goes directly to login/home
   → END
```

**UI/UX Guidelines:**
- iOS Human Interface Guidelines
- Smooth page transitions (slide animation)
- Progress dots indicator (bottom center)
- Skip button always visible (top right)
- Auto-advance after 5 seconds (optional, user can disable)

---

## Profile Management

### Complete Profile (First-Time Requirement)

**Context:** New user logged in but hasn't completed profile

**Trigger:** User tries to create booking without address

**Flow:**

```
1. User attempts to create booking
   ↓
2. System checks profile completion:
   - ✓ Name (from registration)
   - ✓ Email (from registration)
   - ✓ Contact number (from registration)
   - ✗ Primary address (missing!)
   ↓
3. Block booking, show modal:
   "Complete Your Profile First"
   - "You need to add your address before booking"
   - Continue to Profile button
   ↓
4. User clicks "Continue to Profile"
   ↓
5. Navigate to Profile Completion page
   ↓
6. Form displays (pre-filled with existing data):
   
   **Personal Information (read-only):**
   - First name
   - Last name
   - Email
   - Contact number
   
   **Profile Picture (optional):**
   - Upload photo button
   - Camera / Gallery options
   - Circular crop preview
   
   **Primary Address (required):**
   - Region (dropdown, PSGC API)
     └─> Shows loading while fetching regions
   - Province (dropdown, loads after region selected)
     └─> Disabled until region selected
     └─> Shows "No province" if region has none
   - City/Municipality (dropdown, loads after province)
     └─> Disabled until province selected
   - Barangay (dropdown, loads after city)
     └─> Disabled until city selected
   - Street address (text input)
     - Placeholder: "House #, Street name, Subdivision"
   - Landmark (text input, optional)
     - Placeholder: "Near McDonald's, Green gate"
   
   **Location Pin (optional):**
   - "Use my current location" button (GPS)
   - Shows map with draggable pin
   - Lat/long displayed (read-only)
   
   **Action Buttons:**
   - Save Profile (primary blue, disabled until address filled)
   ↓
7. User fills address fields
   - Each dropdown loads its children dynamically
   - Skeleton loader while fetching
   - Error handling if API fails: Show retry button
   ↓
8. User clicks "Save Profile"
   ↓
9. Client-side validation:
   - Region, province, city, barangay selected
   - Street address not empty
   - Contact number format valid
   ↓
   ├─ Validation fails
   │  └─> Show field errors (red text below field)
   │      Shake animation on invalid fields
   │      Focus first invalid field
   │      → Return to step 7
   │
   └─ Validation passes
      ↓
10. Submit to API: PUT /api/customer/profile
    - Show loading overlay (dimmed screen + spinner)
    - Disable form inputs
    ↓
11. Server updates profile:
    - Update address fields
    - Upload profile photo (if provided)
    - Set profile_completed = true
    - Create audit log entry
    ↓
12. API responds with updated profile
    ↓
13. Hide loading overlay
    ↓
14. Show success toast (bottom):
    "Profile updated successfully! ✓"
    ↓
15. Navigate back to Home or Booking page
    - User can now create bookings
    → END
```

**Error Handling:**

- **Network error:** Show error banner with retry button
- **PSGC API failure:** Show cached data (if available) or manual input fallback
- **Image upload failure:** Allow save without photo, retry upload later
- **Server error:** Show toast with message, keep form data

### Edit Profile

**Trigger:** User navigates to Profile tab → Edit Profile button

**Important Rule:** Changing profile info (name, address, contact) does NOT affect pending or ongoing bookings

**Flow:**

```
1. User clicks "Edit Profile"
   ↓
2. Profile edit page displays (pre-filled with current data)
   ↓
3. Editable fields:
   - Profile photo
   - First name
   - Last name
   - Contact number
   - Primary address (all components)
   - Landmark
   
   Read-only fields:
   - Email (cannot change, contact admin)
   
   ↓
4. User modifies fields
   ↓
5. User clicks "Save Changes"
   ↓
6. Confirmation modal:
   "Save profile changes?"
   
   **If address changed:**
   └─> Show warning:
       "Your pending bookings will keep the old address.
        Only NEW bookings will use this address."
   
   - Cancel / Save buttons
   ↓
7. User clicks "Save"
   ↓
8. Submit to API: PUT /api/customer/profile
   ↓
9. Server updates profile:
   - Update changed fields only
   - Do NOT update address in existing bookings
   - Create audit log entry
   ↓
10. Show success toast
    ↓
11. Navigate back to Profile view
    → END
```

---

## Home Dashboard

### Home Screen Layout

**Bottom Tab Navigation:**
1. 🏠 Home (active)
2. 📅 Bookings
3. 🎁 Promos
4. 👤 Profile

**Home Screen Sections:**

**1. Header**
- Greeting: "Good morning, Juan!" (time-based)
- Profile photo (clickable → Profile page)
- Notification bell icon (badge count)

**2. Quick Stats Cards (Horizontal Scroll)**
- Card 1: Pending Bookings
  - Count badge
  - "Awaiting payment" subtitle
  - Tap → Navigate to Bookings (Pending filter)
- Card 2: Upcoming Services
  - Next appointment date
  - Service type
  - Tap → Navigate to booking details
- Card 3: Service History
  - Total completed services
  - "View all" link
  - Tap → Navigate to Service History

**3. Quick Actions (2x2 Grid)**
- Book Service (primary blue card)
  - Icon: Calendar +
  - Tap → Navigate to Create Booking
- Track Booking (white card)
  - Icon: Map pin
  - Tap → Navigate to My Bookings
- View Promos (white card)
  - Icon: Gift tag
  - Badge: "3 active" (count)
  - Tap → Navigate to Promotions
- Help Center (white card)
  - Icon: Question circle
  - Tap → Navigate to Help & Support

**4. Active Booking Card (if any)**

Shows current booking with status:

```
┌─────────────────────────────────┐
│ [Status Badge: Confirmed]       │
│                                  │
│ Booking #KJ-2026-001234         │
│ ──────────────────────────────  │
│ 📍 Aircon Repair               │
│ 🏷️ Brand: Daikin                │
│ 📅 Sept 15, 2026 at 10:00 AM   │
│ 👤 Technician: Pedro Santos     │
│     ⭐ 4.8 (120 reviews)        │
│                                  │
│ [View Details] [Cancel Booking] │
└─────────────────────────────────┘
```

If status = "Ongoing":
- Show real-time status (On the way, Arrived, In service)
- Show "Call Technician" button
- Show countdown timer

**5. Recommended Services (Carousel)**
- Horizontal scrolling cards
- Each service card:
  - Service photo
  - Service name
  - Price (with down payment)
  - "Book now" button
- Tap card → Service details modal

**6. Recent Promotions (Horizontal Scroll)**
- Promo banner cards
- Each shows:
  - Promo title
  - Discount badge
  - Expiry date
  - "Learn more" link

**7. Why Choose KJAC Section**
- 3 feature badges:
  - ✓ Authorized Daikin Partner
  - ✓ 500+ Satisfied Customers
  - ✓ Same-Day Service Available

**Pull to Refresh:**
- Drag down to refresh all data
- Loading indicator at top
- Fetches: Stats, active bookings, promos

---

## Create Booking

### Booking Creation Flow

**Starting Point:** User clicks "Book Service" from Home or Bookings tab

**Prerequisites:**
- ✓ Email verified
- ✓ Profile completed (address added)

**Flow:**

```
1. User clicks "Book Service"
   ↓
2. Check prerequisites:
   ↓
   ├─ Email not verified
   │  └─> Show modal:
   │      "Verify your email first"
   │      - "Check your inbox for verification link"
   │      - Resend Link button
   │      - Cancel button
   │      → END (or go to email verification flow)
   │
   ├─ Address not added
   │  └─> Show modal (as described in Profile Completion flow)
   │      → END (or go to profile completion)
   │
   └─ Prerequisites met
      ↓
3. Navigate to Create Booking page
   ↓
4. Booking form displays (multi-step):

   **Step 1: Service Selection**
   
   - Section header: "Choose Your Service"
   - Service cards (grid, 2 columns):
     Each card shows:
     - Service icon/photo
     - Service name
     - Price range
     - Down payment amount
     - Select button
   
   - User taps service card → Highlights border (blue)
   
   - Selected service shows:
     - Checkmark icon
     - "Selected" badge
     - Service details expand:
       - Full description
       - What's included
       - Duration estimate
       - Price breakdown
   
   - "Next: Choose Brand" button (bottom, disabled until service selected)
   ↓
5. User selects service & clicks "Next"
   ↓
   **Step 2: Brand Selection**
   
   - Section header: "Select Aircon Brand"
   - Brand cards (grid, 2 columns):
     Each card shows:
     - Brand logo
     - Brand name
     - Special badge (if partner brand):
       └─> "DAIKIN - Official Partner" (highlighted)
     - Select button
   
   - User taps brand → Selected (same as service selection)
   
   - "Next: Schedule" button (bottom)
   ↓
6. User selects brand & clicks "Next"
   ↓
   **Step 3: Schedule Selection**
   
   - Section header: "Pick Date & Time"
   
   **Date Picker:**
   - Calendar view (month grid)
   - Available dates: Tomorrow onwards (no same-day if past cutoff)
   - Fully booked dates: Grayed out with "Fully Booked" label
   - Available slots badge on each date: "3 slots left"
   - User taps date → Highlights (blue border)
   
   **Time Slot Picker (after date selected):**
   - List of available time slots:
     - 8:00 AM - 9:00 AM [Available]
     - 9:00 AM - 10:00 AM [Available]
     - 10:00 AM - 11:00 AM [2 slots left]
     - 11:00 AM - 12:00 PM [Fully Booked] (grayed out)
     - ...continues to 5:00 PM
   - User taps time slot → Selected (blue)
   
   - "Next: Details" button (bottom)
   ↓
7. User selects date & time, clicks "Next"
   ↓
   **Step 4: Booking Details**
   
   - Section header: "Additional Information"
   
   **Address Confirmation:**
   - Shows saved primary address (read-only)
   - "Use a different address" link
     └─> Opens address picker modal (same PSGC dropdowns)
   
   **Problem Description (optional):**
   - Textarea input
   - Placeholder: "Describe the issue with your aircon (optional)"
   - Character count: 0/500
   
   **Upload Photos (optional):**
   - "Add Photos of Your Aircon" button
   - Opens image picker (camera or gallery)
   - Max 5 photos, 3MB each
   - Shows thumbnail grid with remove (X) button
   - Compresses to WebP before upload
   
   - "Review Booking" button (bottom, always enabled)
   ↓
8. User fills details (or skips) & clicks "Review Booking"
   ↓
   **Step 5: Review & Confirm**
   
   - Section header: "Review Your Booking"
   
   **Booking Summary Card:**
   ```
   ┌─────────────────────────────────┐
   │ Service: Aircon Repair          │
   │ Brand: Daikin                    │
   │ Date: September 15, 2026         │
   │ Time: 10:00 AM - 11:00 AM       │
   │ ────────────────────────────────│
   │ Address:                         │
   │ 123 Main St, Brgy. Labuin        │
   │ Sta. Cruz, Laguna                │
   │ Landmark: Near McDonald's        │
   │ ────────────────────────────────│
   │ Service Fee: ₱1,500.00          │
   │ Down Payment: ₱500.00           │
   │ Balance: ₱1,000.00              │
   │ (Pay on service completion)      │
   └─────────────────────────────────┘
   ```
   
   **Down Payment Policy:**
   - Expandable section: "Payment & Cancellation Policy"
   - Shows:
     - Down payment required: ₱500.00
     - Payment method: GCash only
     - Upload deadline: 3 hours after booking
     - Cancellation policy summary (link to full policy)
     - Refund policy summary (link to full policy)
   
   **Checkbox (required):**
   ☐ I agree to the payment and cancellation policies
   
   **Action Buttons:**
   - Back (to edit)
   - Confirm Booking (primary blue, disabled until checkbox checked)
   ↓
9. User checks policy agreement & clicks "Confirm Booking"
   ↓
10. Rate limit check:
    - Check if user exceeded limit (3 bookings per 30 minutes)
    ↓
    ├─ Limit exceeded
    │  └─> Show error modal:
    │      "Booking limit reached"
    │      - "You can create another booking in X minutes"
    │      - Countdown timer
    │      - OK button
    │      → END
    │
    └─ Within limit
       ↓
11. Submit to API: POST /api/customer/bookings
    - Show loading overlay (full screen spinner + "Creating booking...")
    - Disable all buttons
    ↓
12. Server creates booking:
    - Generate reference ID (KJ-YYYY-NNNNNN)
    - Create booking record (status: "Submitted")
    - Upload photos (if any) to storage
    - Start 3-hour expiration timer
    - Create audit log entry
    - Send confirmation email to customer
    - Send push notification
    ↓
13. API responds with booking details (including reference ID)
    ↓
14. Hide loading overlay
    ↓
15. Navigate to Booking Success page
    ↓
    **Booking Success Screen:**
    
    - Success icon (animated checkmark)
    - "Booking Submitted Successfully!"
    - Booking reference ID (large, bold):
      
      ```
      ┌─────────────────────────────┐
      │  KJ-2026-001234             │
      │  [Copy] button              │
      └─────────────────────────────┘
      ```
    
    - "IMPORTANT: Save this reference ID for tracking"
    
    - **Expiry Warning (prominent box):**
      ```
      ⚠️ Upload Payment Within 3 Hours
      Your booking will expire at: 1:30 PM
      Countdown: 02:59:45 (live countdown)
      ```
    
    - Booking summary (same as review step)
    
    - **Next Steps List:**
      1. ✓ Booking created
      2. → Pay down payment (₱500.00 via GCash)
      3. → Upload GCash receipt
      4. → Wait for admin verification
      5. → Receive confirmation & technician assignment
    
    - **Action Buttons:**
      - Upload Payment Now (primary blue, large)
      - View My Bookings (secondary, outline)
      - Back to Home (text link)
    ↓
16. User clicks "Upload Payment Now"
    └─> Navigate to Payment Upload page with reference ID pre-filled
    
    OR
    
    User clicks "View My Bookings"
    └─> Navigate to Bookings tab
    
    → END
```

**UI/UX Features:**

- **Progress Indicator:** Show steps at top (1/5, 2/5, ..., 5/5)
- **Back Navigation:** Allow user to go back and edit previous steps
- **Data Persistence:** Save form data if user exits (resume later)
- **Validation:** Real-time validation with helpful error messages
- **Accessibility:** Proper labels, contrast, touch targets

**Error Handling:**

- **Network timeout:** Show retry button, save form data
- **Service unavailable:** Show message, suggest alternative service
- **Slot already taken:** Refresh available slots, ask user to re-select
- **Photo upload failure:** Allow continue without photos, retry later

---

## My Bookings

### Bookings List View

**Starting Point:** User taps "Bookings" tab in bottom navigation

**Page Layout:**

**Header:**
- Title: "My Bookings"
- Filter chips (horizontal scroll):
  - All (default)
  - Pending
  - Confirmed
  - Ongoing
  - Completed
  - Cancelled

**Booking Cards (Vertical List):**

Each card shows:
```
┌─────────────────────────────────┐
│ [Status Badge]                   │
│ #KJ-2026-001234           [Icon] │
│ ──────────────────────────────  │
│ 📍 Aircon Repair                │
│ 🏷️ Daikin                       │
│ 📅 Sept 15, 2026 at 10:00 AM    │
│                                  │
│ If Confirmed/Ongoing:            │
│ 👤 Tech: Pedro Santos            │
│    ⭐ 4.8 (120)                  │
│                                  │
│ [Primary Action Button]          │
└─────────────────────────────────┘
```

**Primary Action Button (varies by status):**

- **Submitted:** "Upload Payment" (blue)
- **Pending:** "Awaiting Verification" (yellow, disabled)
- **Confirmed:** "View Details" (blue)
- **Ongoing:** "Track Service" (green)
- **Completed:** "Rate Service" (blue) or "View Receipt" if rated
- **Cancelled:** "View Details" (gray)
- **Expired:** "Rebook" (blue)

**Tap Card:** Navigate to booking details page

**Pull to Refresh:** Reload bookings list

**Empty States:**

- No bookings at all:
  - Illustration (empty calendar)
  - "No bookings yet"
  - "Book your first service now!"
  - "Book Service" button

- No bookings in filter:
  - "No [status] bookings"
  - "Try a different filter"

**Loading State:**
- Skeleton loaders (3-4 card skeletons)

---

## Payment Upload

### Upload GCash Receipt

**Trigger:** User clicks "Upload Payment" from:
- Booking success page
- Booking card
- Booking details page

**Flow:**

```
1. User clicks "Upload Payment"
   ↓
2. Payment upload page displays
   ↓
3. Page sections:
   
   **Booking Summary (Top Card):**
   - Booking reference #
   - Service & brand
   - Date & time
   - Down payment amount: ₱500.00 (large, bold)
   
   **Expiry Countdown (Warning Box):**
   - "Time remaining: 02:45:30" (live countdown)
   - "Your booking will expire if payment not uploaded"
   
   **GCash Payment Instructions:**
   ```
   Step 1: Send ₱500.00 to our GCash account
   
   GCash Name: Klein & Justin Aircon
   GCash Number: 0926-633-3129
   
   [Copy Number] button
   
   OR
   
   [Show QR Code] button → Opens modal with GCash QR
   ```
   
   **Upload Receipt Section:**
   
   - "Take Screenshot of GCash Receipt"
   - Receipt sample image (what to screenshot)
   
   - "Upload Receipt Photo" button
     └─> Opens image picker:
         - Camera (take photo now)
         - Gallery (select existing)
   
   - If image selected:
     └─> Show preview:
         - Thumbnail image
         - Edit button (re-select)
         - Remove button (X icon)
   
   - "GCash Reference Number" input field
     - Placeholder: "13-digit reference number"
     - Numeric keyboard
     - Format: XXXX-XXXX-XXXXX (auto-format as user types)
     - Info icon → "Find this on your GCash receipt"
   
   **Payment Policy (Expandable):**
   - "Important: Read before uploading"
   - Shows:
     - Verification may take up to 24 hours
     - Incorrect receipts will be rejected
     - How to get help if payment not verified
   
   **Action Buttons:**
   - Cancel (outline)
   - Upload Payment (primary blue, disabled until both receipt & ref number provided)
   ↓
4. User uploads receipt image & enters reference number
   ↓
5. User clicks "Upload Payment"
   ↓
6. Client-side validation:
   - Receipt image selected (not empty)
   - Reference number format valid (13 digits)
   - Image size < 3MB
   - Image format: JPG, PNG, or WebP
   ↓
   ├─ Validation fails
   │  └─> Show error messages below fields
   │      → Return to step 4
   │
   └─ Validation passes
      ↓
7. Submit to API: POST /api/customer/bookings/{booking_id}/upload-payment
   - Show loading overlay (dimmed + spinner + "Uploading payment...")
   - Compress image to WebP (if not already)
   - Disable all buttons
   ↓
8. Server processes upload:
   - Save receipt image to cloud storage
   - Save GCash reference number
   - Update booking payment status to "Uploaded"
   - Update booking status to "Pending" (awaiting admin verification)
   - Record upload timestamp
   - Create audit log entry
   - Send notification to admin (payment pending verification)
   - Send confirmation email to customer
   ↓
9. API responds with success
   ↓
10. Hide loading overlay
    ↓
11. Navigate to Payment Success page
    ↓
    **Payment Upload Success Screen:**
    
    - Success icon (animated checkmark)
    - "Payment Uploaded Successfully!"
    
    - Payment details:
      - Amount: ₱500.00
      - GCash Ref: 1234-5678-90123
      - Uploaded at: Sept 10, 2026 at 10:30 AM
    
    - **Next Steps:**
      ```
      ✓ Payment receipt uploaded
      → Admin will verify your payment (within 24 hours)
      → You'll receive notification when verified
      → Technician will be assigned
      → Service confirmed!
      ```
    
    - "You can close this page. We'll notify you when payment is verified."
    
    - **Action Buttons:**
      - View Booking Details (primary blue)
      - Back to Bookings (secondary)
      - Home (text link)
    ↓
12. User navigates away
    → END
```

**Error Handling:**

- **Image too large:** "Image must be smaller than 3MB. Try taking a screenshot instead of photo."
- **Invalid reference number:** "Please enter a valid 13-digit GCash reference number"
- **Network error:** "Upload failed. Check your connection and try again." (Retry button)
- **Server error:** "Something went wrong. Your payment data has been saved. Please try again." (Retry button with saved data)

**UI/UX Notes:**

- **Auto-save draft:** If user exits, save uploaded image & ref number for later
- **Copy button:** One-tap copy GCash number to clipboard
- **QR code modal:** Large, zoomable QR code for GCash payment
- **Help link:** "Need help?" → Opens support chat or FAQ

---

## Track Booking Status

### View Booking Details

**Trigger:** User taps booking card from My Bookings list

**Flow:**

```
1. User taps booking card
   ↓
2. Navigate to Booking Details page
   ↓
3. Page displays full booking information:

   **Status Header (Top):**
   - Large status badge (color-coded):
     - Submitted (gray)
     - Pending (yellow)
     - Confirmed (blue)
     - Ongoing (green)
     - Completed (green with checkmark)
     - Cancelled (red)
     - Expired (dark gray)
   - Booking reference # (with copy button)
   
   **Status Timeline (Stepper):**
   Visual timeline showing progress:
   
   ```
   ✓ Submitted
   │ Sept 10, 2026 at 10:00 AM
   │
   ✓ Pending (if payment uploaded)
   │ Sept 10, 2026 at 10:30 AM
   │ "Payment under review"
   │
   ⏳ Confirmed (current step if confirmed)
   │ Waiting for technician assignment
   │
   ⏳ Ongoing
   │
   ⏳ Completed
   ```
   
   Completed steps: Blue checkmark
   Current step: Blue circle (pulsing animation)
   Future steps: Gray circle
   
   **Booking Information Card:**
   - Service type (icon + name)
   - Brand (logo + name)
   - Date & time
   - Address (full, with landmark)
   - Problem description (if provided)
   - Photos (if uploaded, tappable gallery)
   
   **Payment Information Card:**
   
   If status = "Submitted" (no payment):
   ```
   ⚠️ Payment Required
   Down payment: ₱500.00
   Expires in: 02:30:45 (live countdown)
   [Upload Payment Now] button
   ```
   
   If status = "Pending" (payment uploaded):
   ```
   ⏳ Payment Under Review
   Amount: ₱500.00
   GCash Ref: 1234-5678-90123
   Uploaded: Sept 10 at 10:30 AM
   [View Receipt] button → Opens image viewer
   
   "Your payment is being verified by our admin.
    You'll be notified within 24 hours."
   ```
   
   If status = "Confirmed" or later:
   ```
   ✓ Payment Verified
   Amount: ₱500.00
   Verified: Sept 10 at 11:00 AM
   Balance: ₱1,000.00 (pay on completion)
   [View Receipt] button
   ```
   
   **Technician Information Card (if assigned):**
   ```
   ┌─────────────────────────────────┐
   │ Your Technician                  │
   │ ──────────────────────────────  │
   │ [Photo]  Pedro Santos            │
   │          ⭐ 4.8 (120 reviews)    │
   │          📞 0917-123-4567        │
   │                                  │
   │ If Ongoing:                      │
   │ Current Status: On the way       │
   │ ETA: 10 minutes                  │
   │                                  │
   │ [Call Technician] [View Profile] │
   └─────────────────────────────────┘
   ```
   
   **Price Breakdown Card:**
   - Service fee: ₱1,500.00
   - Down payment: ₱500.00 (paid)
   - Balance due: ₱1,000.00 (on completion)
   - Total: ₱1,500.00
   
   **Action Buttons (Bottom, context-aware):**
   
   If status = "Submitted":
   - [Upload Payment] (primary blue)
   - [Cancel Booking] (outline red)
   
   If status = "Pending":
   - [Cancel Booking] (outline red)
     └─> Shows refund eligibility
   
   If status = "Confirmed":
   - [Reschedule] (outline blue)
   - [Cancel Booking] (outline red)
     └─> Shows cancellation policy warning
   
   If status = "Ongoing":
   - [Call Technician] (primary blue)
   - [Report Issue] (outline yellow)
   - Cancel disabled (locked)
   
   If status = "Completed":
   - [Rate Service] (primary blue) if not rated
   - [View Receipt] (outline) if rated
   - [Book Again] (secondary)
   
   If status = "Cancelled":
   - View cancellation details
   - [Book Again] (primary blue)
   
   If status = "Expired":
   - [Rebook] (primary blue)
     └─> Pre-fills form with same details
   
   **Activity Log (Collapsible Section):**
   - "Activity History" header with dropdown arrow
   - Chronological list:
     ```
     Sept 10, 2026 at 11:00 AM
     ✓ Payment verified by admin
     
     Sept 10, 2026 at 10:30 AM
     → Payment receipt uploaded
     
     Sept 10, 2026 at 10:00 AM
     ✓ Booking created
     ```
   
   **Need Help Section (Bottom):**
   - "Have questions?"
   - [Chat with Support] button
   - [View FAQs] link
   - [Call Us] link (opens dialer)
   
4. User reviews details
   - Can tap action buttons for various flows
   → END
```

**Real-Time Updates:**

If booking status = "Ongoing":
- WebSocket connection for live updates
- Auto-refresh technician status every 30 seconds
- Show technician location updates:
  - "On the way" → "Arrived" → "Service started" → "Completed"
- Push notification triggers screen update

**Pull to Refresh:**
- Drag down to refresh booking data
- Fetches latest status, technician updates

---

## Cancel Booking

### Cancellation Flow

**Trigger:** User clicks "Cancel Booking" button in booking details

**Flow:**

```
1. User clicks "Cancel Booking"
   ↓
2. System determines cancellation scenario:
   
   **Scenario A: Submitted (No payment)**
   - Can cancel anytime
   - No refund (nothing paid yet)
   - Simple cancellation
   
   **Scenario B: Pending/Confirmed (Before dispatch)**
   - Refund eligibility depends on timing
   - Show cancellation policy
   
   **Scenario C: Ongoing (Technician dispatched)**
   - Late cancellation
   - Non-refundable
   - Requires strong confirmation
   ↓
3. Cancellation modal displays:
   
   **Modal Title:** "Cancel Booking?"
   
   **Booking Summary:**
   - Reference #
   - Service & date
   
   **Refund Information (if applicable):**
   
   If Scenario A:
   └─> "No refund applicable (payment not made)"
   
   If Scenario B (Immediate/Before confirmed):
   └─> "✓ Full refund: ₱500.00
        Refund will be processed automatically"
   
   If Scenario B (Same-day before dispatch):
   └─> "⚠️ Refund subject to admin approval
        May receive full or partial refund
        Decision within 24 hours"
   
   If Scenario C (Late cancellation):
   └─> "❌ Non-refundable
        Down payment will not be returned
        Technician already dispatched"
   
   **Cancellation Reason (dropdown, required):**
   - Change of schedule
   - Found another service
   - Issue resolved
   - Emergency situation
   - Incorrect booking details
   - Other (requires text input)
   
   **Additional Notes (textarea, optional):**
   - Placeholder: "Tell us more (optional)"
   
   **Cancellation Policy Link:**
   - "View full cancellation policy"
   
   **Action Buttons:**
   - Keep Booking (gray, larger)
   - Cancel Booking (red, smaller)
   ↓
4. User selects reason & clicks "Cancel Booking"
   ↓
5. If Scenario C (non-refundable):
   └─> Additional confirmation modal:
       "Are you sure?"
       - "Your ₱500.00 down payment will NOT be refunded"
       - "This action cannot be undone"
       - Go Back / Yes, Cancel buttons
       ↓
       User must confirm again
   ↓
6. Submit to API: POST /api/customer/bookings/{booking_id}/cancel
   - Show loading overlay
   ↓
7. Server processes cancellation:
   - Update booking status to "Cancelled"
   - Record cancellation reason
   - Determine refund eligibility:
     - Scenario A: No refund
     - Scenario B (immediate): Auto-approve full refund
     - Scenario B (same-day): Create refund request for admin approval
     - Scenario C: No refund
   - If technician assigned: Notify technician (job cancelled)
   - Notify admin
   - Create audit log entry
   - Send confirmation email to customer
   ↓
8. API responds with cancellation confirmation
   ↓
9. Close modal
   ↓
10. Show cancellation confirmation screen:
    
    - "Booking Cancelled"
    - Reference #: KJ-2026-001234
    
    **Refund Status:**
    
    If full refund approved:
    └─> "✓ Refund Approved: ₱500.00
         Processing time: 3-5 business days
         You'll receive it via GCash"
    
    If pending admin approval:
    └─> "⏳ Refund Pending Approval
         We'll review your request within 24 hours
         You'll be notified of the decision"
    
    If no refund:
    └─> "❌ No Refund
         Down payment forfeited as per policy"
    
    **Next Steps:**
    - Check email for confirmation
    - If refund pending: Wait for admin decision
    - Need to rebook? Same service available
    
    **Action Buttons:**
    - Book Again (primary blue)
    - Back to Bookings (outline)
    - Home (text link)
    ↓
11. User navigates away
    ↓
12. Booking card updates to "Cancelled" status
    → END
```

**Error Handling:**

- **Cancellation not allowed:** "This booking cannot be cancelled at this stage"
- **Network error:** "Cancellation failed. Please try again."
- **Already cancelled:** "This booking has already been cancelled"

---

## Rate & Review

### Rate Technician After Service

**Trigger:** Service completed, user prompted to rate

**Flow:**

```
1. Service completed → Booking status changes to "Completed"
   ↓
2. User receives push notification:
   "Service completed! Rate your technician"
   ↓
3. User opens notification → App opens to booking details
   OR
   User opens app → Home screen shows "Rate Service" prompt
   ↓
4. User taps "Rate Service" button
   ↓
5. Rating modal displays:
   
   **Modal Title:** "Rate Your Experience"
   
   **Booking Summary:**
   - Service: Aircon Repair
   - Date: Sept 15, 2026
   
   **Technician Info:**
   - Photo
   - Name: Pedro Santos
   
   **Star Rating (required):**
   ```
   How would you rate the service?
   
   ⭐ ⭐ ⭐ ⭐ ⭐  (tap to select)
   
   1 star: Poor
   2 stars: Below Average
   3 stars: Average
   4 stars: Good
   5 stars: Excellent
   ```
   
   - Large, tappable stars (50px each)
   - Selected stars: Yellow fill
   - Unselected stars: Gray outline
   - Tap star → Fills that star + all previous
   
   **Written Review (optional):**
   - "Tell us more about your experience (optional)"
   - Textarea input
   - Placeholder: "What did you like? Any suggestions?"
   - Character count: 0/500
   
   **Quick Feedback Tags (optional):**
   - Chip buttons (multi-select):
     - Professional
     - On-time
     - Friendly
     - Expert
     - Clean work
     - Thorough
     - Fast service
     - Good communication
   
   **Upload Service Photos (optional):**
   - "Upload photos of completed work (optional)"
   - Max 3 photos
   - Shows thumbnail grid
   
   **Action Buttons:**
   - Skip for Now (text link, top right)
   - Submit Rating (primary blue, disabled until stars selected)
   ↓
6. User selects rating (1-5 stars)
   - Star selection → Enables Submit button
   - Optional: Writes review
   - Optional: Selects tags
   - Optional: Uploads photos
   ↓
7. User clicks "Submit Rating"
   ↓
8. Submit to API: POST /api/customer/bookings/{booking_id}/rate
   - rating: 1-5 (required)
   - review: text (optional)
   - tags: array (optional)
   - photos: array (optional)
   - Show loading overlay
   ↓
9. Server processes rating:
   - Save rating & review
   - Update technician average rating (recalculate)
   - Increment technician review count
   - Upload photos to storage
   - Mark booking as "Rated"
   - Create audit log entry
   - Send thank-you email to customer
   - Notify admin (new review received)
   - Notify technician (new rating received)
   ↓
10. API responds with success
    ↓
11. Close modal
    ↓
12. Show thank-you screen:
    
    - "Thank you for your feedback! 🎉"
    - "Your rating helps us improve our service"
    
    - Your rating: ⭐⭐⭐⭐⭐ (shows what they selected)
    
    **Action Buttons:**
    - Book Again (primary blue)
    - View Service History (outline)
    - Home (text link)
    ↓
13. User navigates away
    ↓
14. Booking details updated: Shows "Rated" badge
    - "Rate Service" button replaced with "View Your Rating"
    → END
```

**If User Skips Rating:**

```
1. User clicks "Skip for Now"
   ↓
2. Confirmation modal:
   "Skip rating?"
   - "You can still rate this service later from your booking history"
   - Go Back / Skip buttons
   ↓
3. User confirms skip
   ↓
4. Close modal
   ↓
5. Booking remains "Unrated"
   - Can rate anytime from booking details
   → END
```

**Error Handling:**

- **Already rated:** "You've already rated this service. View your rating in booking details."
- **Network error:** "Failed to submit rating. Please try again." (Retry with saved data)
- **Photo upload failure:** "Rating submitted, but photos failed to upload. Retry?" (Partial success)

---

## Service History

### View Past Bookings

**Trigger:** User taps "Service History" card from Home or Profile

**Route:** Dedicated Service History page (or filtered Bookings tab)

**Page Layout:**

**Header:**
- Title: "Service History"
- Filter icon (opens filter modal)
- Search bar (search by service, brand, reference)

**Filter Options (Modal):**
- Date range (picker)
- Service type (multi-select)
- Brand (multi-select)
- Rated vs Unrated
- Apply / Reset buttons

**History Cards (Vertical List):**

Each card shows:
```
┌─────────────────────────────────┐
│ ✓ Completed                      │
│ #KJ-2026-001234                  │
│ ──────────────────────────────  │
│ 📍 Aircon Repair                │
│ 🏷️ Daikin                       │
│ 📅 Sept 15, 2026 at 10:00 AM    │
│ 👤 Pedro Santos                  │
│    ⭐ Rated 5★                   │
│                                  │
│ Total: ₱1,500.00                │
│                                  │
│ [View Receipt] [Book Again]      │
└─────────────────────────────────┘
```

**If Not Rated:**
- Show "Rate Service" button instead of rating display

**Tap Card:** View full booking details (read-only history view)

**Statistics Header (Top):**
- Total services: 12
- Total spent: ₱18,000.00
- Favorite service: Aircon Repair (8 times)

**Empty State:**
- "No service history yet"
- "Your completed bookings will appear here"

---

## Promotions & Offers

### View Active Promotions

**Route:** Promos tab in bottom navigation

**Page Layout:**

**Header:**
- Title: "Promotions & Offers"
- Active promos count badge

**Promo Cards (Vertical List):**

Each card (banner-style):
```
┌─────────────────────────────────┐
│ [Promo Banner Image]             │
│ ──────────────────────────────  │
│ SUMMER AIRCON CLEANING SALE      │
│ 20% OFF                          │
│ ──────────────────────────────  │
│ Valid until: Sept 30, 2026       │
│ Min. purchase: ₱1,000.00        │
│                                  │
│ [Learn More] [Book Now]          │
└─────────────────────────────────┘
```

**Tap "Learn More":** Opens promo details modal
- Full description
- Terms & conditions
- How to avail
- "Book Now" button

**Tap "Book Now":** Navigate to booking form with promo pre-applied

**Promo Types:**
- Discount promos (% off or fixed amount)
- Free service add-ons
- Seasonal offers
- Referral rewards

**Expired Promos (Separate Tab):**
- Shows past promos (grayed out)
- "Expired" badge

**Empty State:**
- "No active promos right now"
- "Check back soon for great deals!"

---

## Notifications

### Notification Center

**Access:** Tap notification bell icon (top right on Home screen)

**Page Layout:**

**Header:**
- Title: "Notifications"
- Mark all as read button
- Filter: All / Unread

**Notification List:**

Each notification:
```
┌─────────────────────────────────┐
│ 🔵 [Icon] Booking Confirmed      │
│ Your booking #KJ-2026-001234     │
│ has been confirmed!              │
│ 2 hours ago                      │
└─────────────────────────────────┘
```

- Unread: Blue dot indicator + bold text
- Read: Gray text, no dot
- Tap: Opens related page (booking details, etc.)
- Swipe left: Delete notification

**Notification Types:**

1. **Booking Updates:**
   - Payment verified
   - Booking confirmed
   - Technician assigned
   - Schedule changed
   - Booking cancelled

2. **Service Updates:**
   - Technician on the way
   - Technician arrived
   - Service started
   - Service completed
   - Rating request

3. **Payment Updates:**
   - Payment approved
   - Payment rejected (re-upload required)
   - Refund approved
   - Refund processed

4. **Promotions:**
   - New promo available
   - Promo expiring soon

5. **System Announcements:**
   - Maintenance scheduled
   - New features
   - Policy updates

**Empty State:**
- "No notifications"
- "You're all caught up!"

**Push Notification Settings:**
- Enable/disable by category
- Managed in Settings page

---

## Settings

### App Settings

**Route:** Profile tab → Settings button

**Settings Sections:**

**1. Account Settings**
- Edit Profile
- Change Password
- Email Preferences
- Delete Account (requires confirmation)

**2. Notification Preferences**
- Push notifications (toggle)
- Email notifications (toggle)
- SMS notifications (toggle, future)
- By category:
  - Booking updates
  - Payment updates
  - Promotions
  - Announcements

**3. Security & Privacy**
- Enable biometric login (Face ID / Touch ID)
- Remember me (toggle)
- Two-factor authentication (future)
- View privacy policy
- View terms of service

**4. App Preferences**
- Language (English, Filipino)
- Theme (Light, Dark, System)
- Default payment method (GCash, Bank, etc.)

**5. Help & Support**
- FAQs
- Contact support
- Report a problem
- About KJAC

**6. Advanced**
- Clear cache
- App version
- Check for updates

**Logout:**
- "Log Out" button (red, bottom)
- Confirmation modal: "Log out of your account?"

---

## Help & Support

### Support Options

**Route:** Profile → Help & Support

**Page Sections:**

**1. FAQs (Categorized)**
- Booking process
- Payment & refunds
- Scheduling
- Cancellations
- Technical issues

**2. Contact Support**
- Live chat (if available)
- Email: abadeciomar@yahoo.com
- Phone: 0926-633-3129
- Business hours: Mon-Sat, 8 AM - 5 PM

**3. Report a Problem**
- Form to submit issue
- Category dropdown
- Description textarea
- Attach screenshot option

**4. About KJAC**
- Business information
- Services offered
- Certifications
- Privacy policy
- Terms of service

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_AUTH.md` - Authentication flows
- `FLOW_BOOKING.md` - Booking lifecycle (includes customer flows)
- `FLOW_ADMIN.md` - Admin workflows (payment verification, etc.)
- `API.md` - Customer API endpoints
- `DESIGN.md` - Mobile UI/UX specifications