# Booking Lifecycle Flows

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Applies To:** Web Public, Mobile Customer App

---

## Table of Contents
1. [Guest Booking Creation (Web)](#guest-booking-creation-web)
2. [Customer Booking Creation (Mobile)](#customer-booking-creation-mobile)
3. [Payment Upload Flow](#payment-upload-flow)
4. [Booking Expiration Logic](#booking-expiration-logic)
5. [Booking Status Tracking](#booking-status-tracking)
6. [Cancellation Flow](#cancellation-flow)
7. [Refund Processing](#refund-processing)
8. [Rescheduling Flow](#rescheduling-flow)
9. [Service Completion & Rating](#service-completion--rating)

---

## Guest Booking Creation (Web)

### User Story
> As a guest visitor, I want to book an aircon service without creating an account, so I can quickly request service.

### Flow Diagram
```
[User visits website: kjac-system.com]
        ↓
[Clicks "Book Appointment Now" button]
        ↓
[Redirects to: /booking]
        ↓
[Booking Form Displayed]
        ↓
--- STEP 1: Personal Information ---
[User fills:]
        • First Name* (required, red asterisk)
        • Last Name* (required)
        • Email* (required)
        • Contact Number* (required)
        ↓
--- STEP 2: Address Selection ---
[User selects via PSGC API dropdowns:]
        • Region* (required)
                ↓ (loads provinces)
        • Province* (required)
                ↓ (loads cities/municipalities)
        • City/Municipality* (required)
                ↓ (loads barangays)
        • Barangay* (required)
        
[User enters:]
        • Street Address* (text input, required)
        • Landmark* (text input, required)
        
[System geocodes address → gets lat/long]
        ↓
--- STEP 3: Service Details ---
[User selects:]
        • Aircon Brand* (dropdown: Daikin, Carrier, etc.)
                ↓ (shows brand logo and partner badge if applicable)
        • Service Type* (dropdown: Repair, Installation, etc.)
                ↓ (displays service price, down payment, duration)
        ↓
--- STEP 4: Scheduling ---
[User selects:]
        • Preferred Date* (calendar picker)
                - Only future dates
                - No Sundays (business closed)
                - Shows available slots
                - Grayed out unavailable dates
        • Preferred Time* (time slot dropdown)
                - 8:00 AM - 10:00 AM
                - 10:00 AM - 12:00 PM
                - 12:00 PM - 2:00 PM
                - 2:00 PM - 4:00 PM
                - 4:00 PM - 5:00 PM
        ↓
--- STEP 5: Problem Details (Optional) ---
[User can enter:]
        • Problem Description (optional, text area)
        • Upload Aircon Photos (optional, max 5 images)
                - Max 3MB per image
                - Formats: JPG, PNG, HEIC
                - Preview shown after upload
        ↓
--- STEP 6: Review & Confirm ---
[System displays summary:]
        • Customer info
        • Service details
        • Down payment amount: ₱XXX.XX
        • Total estimated cost: ₱XXX.XX
        • Selected date & time
        ↓
[User clicks "Down Payment & Refund Policy" link]
        ↓ (opens modal)
[Reads policies, closes modal]
        ↓
[Cloudflare Turnstile CAPTCHA appears]
        ↓
[User completes CAPTCHA]
        ↓
[User clicks "Submit Booking" button]
        ↓
[Button shows loading spinner, text hidden]
        ↓
--- SERVER-SIDE PROCESSING ---
        ↓
[POST /bookings with all data]
        ↓
[Server validates:]
        • All required fields present
        • Email format valid
        • Phone format valid (Philippine)
        • PSGC codes valid
        • Service and brand exist and are active
        • Date is future, not Sunday
        • Time is within business hours (8 AM - 5 PM)
        • Rate limit not exceeded (3 bookings per 30 mins per IP)
        ↓
    Valid? ───NO──→ [Return 422 validation errors]
        ↓                       ↓
       YES          [Display errors inline, highlight fields]
        ↓
[Create booking record:]
        • Status: "submitted"
        • Generate reference ID: "KJAC-2026-ABC123"
        • Calculate expires_at: NOW() + 3 hours
        • Store all customer info (snapshot)
        • Store address (snapshot)
        ↓
[Create booking_status_history entry]
        ↓
[Create notification for admin: "New booking submitted"]
        ↓
[Return success response with booking details]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success modal with prominent display:]
        
        ✅ Booking Submitted Successfully!
        
        Your Booking Reference ID:
        ┌─────────────────────────┐
        │   KJAC-2026-ABC123      │  [Copy] button
        └─────────────────────────┘
        
        ⚠️ IMPORTANT: Save this reference ID!
        It will only be shown once.
        
        Next Steps:
        1. Pay down payment of ₱500.00 via GCash
        2. Upload receipt within 3 hours
        3. Wait for admin verification
        
        [View Booking Status] button
        ↓
[Auto-redirect to: /booking/status?ref=KJAC-2026-ABC123]
        ↓
[Reference ID auto-filled in search box]
        ↓
[User sees booking details and payment upload section]
```

### UI States

#### Loading State (During Submission)
```
[Submit Booking]  →  [ ⟳ ] (spinner, button disabled)
```

#### Success State
```
┌───────────────────────────────────────────┐
│  ✅ Booking Submitted Successfully!       │
│                                           │
│  Your Booking Reference ID:               │
│  ┌─────────────────────────────────────┐ │
│  │  KJAC-2026-ABC123        [Copy 📋]  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ⚠️ IMPORTANT: Save this ID!              │
│  It will only be shown once.             │
│                                           │
│  Expires in: 2:59:45                     │
│                                           │
│  Next Steps:                             │
│  1. Pay ₱500.00 via GCash               │
│  2. Upload receipt on status page        │
│  3. Wait for verification                │
│                                           │
│  [View Booking Status]  [Close]          │
└───────────────────────────────────────────┘
```

### Validation Rules

#### Personal Information
- **First Name, Last Name:**
  - Required
  - 2-100 characters
  - Letters, spaces, hyphens only
  - Trim whitespace

- **Email:**
  - Required
  - Valid RFC 5322 format
  - Max 255 characters
  - Lowercase normalized

- **Phone:**
  - Required
  - Philippine format: 09XX-XXX-XXXX
  - 11 digits starting with 09
  - Format as displayed: 0926-633-3129

#### Address
- **All PSGC fields:** Required
- **Street Address:** Required, min 10 characters
- **Landmark:** Required, helps technician locate

#### Service Details
- **Brand, Service:** Must exist in database and be active
- **Date:** Must be >= today + 1 day, not Sunday
- **Time:** Must be within business hours

#### Optional Fields
- **Problem Description:** Max 1000 characters
- **Photos:** Max 5 images, 3MB each, JPG/PNG/HEIC

---

## Customer Booking Creation (Mobile)

### User Story
> As a registered customer, I want to create a booking from my mobile app with pre-filled information for a faster experience.

### Flow Diagram
```
[Customer opens KJAC mobile app]
        ↓
[Logs in (or already logged in)]
        ↓
[Navigates to "Bookings" tab]
        ↓
[Taps "New Booking" button (floating action button)]
        ↓
--- PROFILE COMPLETENESS CHECK ---
        ↓
[System checks if profile has address]
        ↓
   Has address? ───NO──→ [Show alert:]
        ↓                     "Complete your profile first"
       YES                    "Add your address to continue"
        ↓                     [Go to Profile] button
[Proceed to booking form]            ↓
        ↓                     [Navigate to profile page]
--- BOOKING FORM (Pre-filled) ---
        ↓
[Personal Info Section - Disabled/Read-only:]
        ✓ First Name: John (pre-filled, gray)
        ✓ Last Name: Doe (pre-filled, gray)
        ✓ Email: john@example.com (pre-filled, gray)
        ✓ Phone: 0926-633-3129 (pre-filled, gray)
        [Edit Profile] link (redirects to profile page)
        ↓
[Address Section - Pre-filled:]
        ✓ Region: CALABARZON (pre-filled, can change)
        ✓ Province: Laguna (pre-filled, can change)
        ✓ City: Sta. Cruz (pre-filled, can change)
        ✓ Barangay: Labuin (pre-filled, can change)
        ✓ Street: 123 Main St (pre-filled, can change)
        ✓ Landmark: Near City Hall (pre-filled, can change)
        
        ℹ️ Note: Changes here won't affect your saved address
        ↓
[Service Details Section:]
        • Select Aircon Brand* (picker)
                → Shows brand logo
                → If Daikin, shows "Official Partner" badge
        • Select Service Type* (picker)
                → Shows service details card:
                   - Price: ₱1,500.00
                   - Down Payment: ₱500.00
                   - Duration: ~2 hours
                   - [View Details] → Opens service modal
        ↓
[Scheduling Section:]
        • Preferred Date* (date picker)
                → iOS-style date picker
                → Only available dates selectable
                → Sundays disabled
        • Preferred Time* (time slot picker)
                → iOS-style segmented control or picker
                → Shows available slots only
        ↓
[Problem Details (Optional):]
        • Problem Description (text area, expandable)
                → Placeholder: "Describe the issue (optional)"
        • Add Photos (optional)
                → [+] button to open image picker
                → Shows thumbnails of selected photos
                → Tap thumbnail to view/remove
        ↓
[Review Section:]
        [Expandable summary card:]
                Service: AC Repair
                Brand: Daikin
                Date: Sept 15, 2026
                Time: 10:00 AM - 12:00 PM
                Down Payment: ₱500.00
                Estimated Total: ₱1,500.00
        ↓
[Bottom Sheet with:]
        [Down Payment & Refund Policy] link
                → Opens bottom sheet with policy text
        ↓
[Primary Button: "Submit Booking" (full width)]
        ↓
[Tap Submit]
        ↓
[Show loading overlay with spinner]
        ↓
--- SERVER-SIDE PROCESSING (same as guest) ---
        ↓
[POST /bookings with Authorization header]
        ↓
[Server validates + creates booking]
        ↓
[Return success response]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success bottom sheet:]
        
        ✅ Booking Submitted!
        
        Reference ID:
        KJAC-2026-ABC123  [Copy]
        
        ⚠️ Save this ID!
        
        Expires in: 2:59:45
        
        Next: Upload payment receipt
        
        [View Booking]  [Done]
        ↓
[Booking automatically appears in "My Bookings" tab]
        ↓
[Navigate to booking details screen]
        ↓
[Shows booking status with payment upload section]
```

### Mobile UI Patterns

#### iOS-Style Date Picker
```
┌─────────────────────────┐
│  September  │  15  │ 2026│
│  ─────────────────────── │
│      Thu  │  Fri │  Sat  │
│       14  │  15  │  16   │  ← Swipe to change
└─────────────────────────┘
```

#### Service Selection Card
```
┌───────────────────────────────────┐
│  [Icon] AC Repair                 │
│                                   │
│  Base Price:      ₱1,500.00      │
│  Down Payment:    ₱500.00         │
│  Duration:        ~2 hours        │
│                                   │
│  [View Full Details →]            │
└───────────────────────────────────┘
```

---

## Payment Upload Flow

### User Story
> As a customer, I want to upload my GCash payment receipt so admin can verify and confirm my booking.

### Flow Diagram
```
[Customer pays ₱500.00 via GCash to business account]
        ↓
[Takes screenshot of GCash receipt]
        ↓
[Opens booking status page/app]
        ↓
[Enters reference ID: KJAC-2026-ABC123]
        ↓
[System displays booking details]
        ↓
[Shows current status: "Submitted" (orange badge)]
        ↓
[Shows expiration countdown: "Expires in 2:15:33"]
        ↓
[Payment Upload Section Visible:]
        
        ⚠️ Payment Required
        Upload your GCash receipt to proceed
        
        Down Payment: ₱500.00
        
        [Upload Receipt Image*] (required)
        [📷 Choose File] or [Drag & Drop]
        
        GCash Reference Number*
        [____________] (e.g., GC-12345678)
        
        [Submit Payment] button (disabled until image + ref number)
        ↓
[User taps "Choose File"]
        ↓
    Platform? 
        │
        ├─ Web: [Opens file picker]
        │       → Selects image
        │       → Preview shown
        │
        └─ Mobile: [Opens bottom sheet]
                    [Take Photo 📷]
                    [Choose from Gallery 🖼️]
                    [Cancel]
                    ↓
                    [Selects option]
                    ↓
                    [Image preview shown]
        ↓
[User enters GCash reference number]
        ↓
[Submit Payment button now enabled (blue)]
        ↓
[User taps "Submit Payment"]
        ↓
[Button shows loading: [ ⟳ ]]
        ↓
--- SERVER-SIDE PROCESSING ---
        ↓
[POST /bookings/{id}/payment]
        • Multipart form data
        • File + GCash reference number
        ↓
[Server validates:]
        • File exists and is valid image
        • File size <= 3MB
        • Format: JPG, PNG, or HEIC
        • GCash reference not empty
        • Booking status is "submitted"
        • Booking not expired
        ↓
    Valid? ───NO──→ [Return 400/422 error]
        ↓                       ↓
       YES              [Show error message]
        ↓
[Scan image for viruses/malware]
        ↓
   Safe? ───NO──→ [Return error: "Invalid file"]
        ↓
       YES
        ↓
[Convert image to WebP format]
        ↓
[Upload to Supabase Storage]
        ↓
[Create payment record:]
        • booking_id
        • customer_id
        • amount: 500.00
        • gcash_reference_number
        • gcash_receipt_url
        • status: "pending"
        ↓
[Update booking status: "submitted" → "pending"]
        ↓
[Update booking.pending_at = NOW()]
        ↓
[Create booking_status_history entry]
        ↓
[Create notification for admin:]
        "New payment uploaded for KJAC-2026-ABC123"
        ↓
[Return success response]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success toast/bottom notification:]
        ✅ Payment receipt uploaded successfully!
        Admin will verify within 24 hours.
        ↓
[Update booking status display:]
        Status: "Pending" (yellow badge)
        ↓
[Hide payment upload section]
        ↓
[Show payment status section:]
        
        💰 Payment Submitted
        
        GCash Ref: GC-12345678
        Amount: ₱500.00
        Submitted: Sept 10, 2026 3:00 PM
        
        ⏳ Under Review
        You will be notified once verified
        
        [View Receipt] (opens image in lightbox)
        ↓
[Customer waits for admin verification]
```

### Payment Upload UI States

#### Web - Payment Upload Section
```
┌─────────────────────────────────────────┐
│  ⚠️ Payment Required                    │
│                                         │
│  Upload GCash receipt to proceed        │
│  Down Payment: ₱500.00                  │
│                                         │
│  Receipt Image*                         │
│  ┌───────────────────────────────────┐ │
│  │  📷 Choose File or Drag & Drop    │ │
│  │  Max size: 3MB                    │ │
│  │  Format: JPG, PNG, HEIC           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  GCash Reference Number*                │
│  ┌───────────────────────────────────┐ │
│  │  e.g., GC-123456789               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Submit Payment] (disabled)            │
└─────────────────────────────────────────┘
```

#### With Image Selected
```
┌─────────────────────────────────────────┐
│  Receipt Image*                         │
│  ┌───────────────────────────────────┐ │
│  │  [Receipt Preview Thumbnail]      │ │
│  │  receipt.jpg (1.2 MB)             │ │
│  │  [✕ Remove]                       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  GCash Reference Number*                │
│  ┌───────────────────────────────────┐ │
│  │  GC-123456789                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Submit Payment] (enabled, blue)       │
└─────────────────────────────────────────┘
```

#### Mobile - Bottom Sheet
```
┌─────────────────────────────────────────┐
│  Upload Payment Receipt                 │
│  ─────────────────────────────────────  │
│                                         │
│  [Camera Icon]  Take Photo              │
│  [Gallery Icon] Choose from Gallery     │
│  [Cancel]                               │
└─────────────────────────────────────────┘
```

---

## Booking Expiration Logic

### Flow Diagram
```
[Booking created with status: "submitted"]
        ↓
[System sets expires_at: created_at + 3 hours]
        ↓
[Countdown timer starts on status page]
        ↓
[Shows: "Expires in 2:59:45"]
        ↓
--- TIME PASSES ---
        ↓
[Every second, countdown updates]
        ↓
--- 2 HOURS AFTER CREATION ---
        ↓
[System sends reminder notification:]
        "⏰ Reminder: Upload payment for KJAC-2026-ABC123
         Your booking expires in 1 hour"
        ↓
[Customer may upload payment OR ignore]
        ↓
--- 3 HOURS AFTER CREATION (Expiry Time) ---
        ↓
[Scheduled cron job runs (every 5 minutes)]
        ↓
[Finds bookings where:]
        • status = "submitted"
        • expires_at < NOW()
        ↓
[For each expired booking:]
        ↓
        [Update status: "submitted" → "expired"]
        ↓
        [Create booking_status_history entry]
        ↓
        [Create notification:]
                "Your booking KJAC-2026-ABC123 expired.
                 No payment received. Book again anytime."
        ↓
[If customer tries to upload payment after expiry:]
        ↓
        [System returns 400 error:]
                "This booking has expired.
                 Please create a new booking."
        ↓
[Customer sees expired status on tracking page:]
        
        ❌ Booking Expired
        
        No payment received within 3 hours
        Reference: KJAC-2026-ABC123
        
        [Book Again] button
```

### Expiration Prevention
```
[Customer uploads payment BEFORE expiry]
        ↓
[Status changes: "submitted" → "pending"]
        ↓
[expires_at field cleared (no longer needed)]
        ↓
[Booking no longer eligible for expiration]
        ↓
[Waits for admin verification]
```

---

## Booking Status Tracking

### User Story
> As a customer, I want to track my booking status using the reference ID so I know the progress of my service.

### Flow Diagram
```
[User visits: /booking/status]
        ↓
[Sees search page:]
        
        Track Your Booking
        
        Enter your booking reference ID:
        ┌───────────────────────────┐
        │  KJAC-2026-ABC123         │
        └───────────────────────────┘
        
        [Track Booking] button
        ↓
[User enters reference ID]
        ↓
[Clicks "Track Booking"]
        ↓
[GET /bookings/track/{reference_id}]
        ↓
    Found? ───NO──→ [Show: "Booking not found. Check your reference ID"]
        ↓
       YES
        ↓
[Display booking details page]
        ↓
--- BOOKING DETAILS DISPLAYED ---
        ↓
[Status Timeline (Stepper)]
        
        ✅ Submitted      Sept 10, 2:30 PM
        ✅ Pending        Sept 10, 3:00 PM
        ✅ Confirmed      Sept 10, 4:00 PM
        ⏳ Ongoing        —
        ⏳ Completed      —
        
        [Current Status: Confirmed] (green badge)
        ↓
[Booking Information Card:]
        
        Reference: KJAC-2026-ABC123
        Service: AC Repair
        Brand: Daikin (Official Partner badge)
        Date: Sept 15, 2026
        Time: 10:00 AM - 12:00 PM
        
        Address:
        123 Main St, Brgy. Labuin
        Sta. Cruz, Laguna
        Landmark: Near City Hall
        
        [View on Map] (opens Leaflet map)
        ↓
[Technician Information Card:] (if assigned)
        
        Assigned Technician:
        Pedro Santos
        [Profile Photo]
        ⭐ 4.85 (45 reviews)
        
        [View Profile] button
        ↓
[Payment Information Card:]
        
        Down Payment: ₱500.00
        Status: Verified ✅
        GCash Ref: GC-123456789
        Verified: Sept 10, 4:00 PM
        
        Total Service Cost: ₱1,500.00
        Remaining: ₱1,000.00 (pay on completion)
        ↓
[Action Buttons Based on Status:]
        
        If status = "submitted":
                [Upload Payment] button
        
        If status = "pending":
                [Cancel Booking] button
        
        If status = "confirmed":
                [Reschedule] button
                [Cancel] button (with warning)
        
        If status = "ongoing":
                (No actions available)
        
        If status = "completed":
                [Rate Technician] button (if not rated)
                [View Receipt] button
                [Book Again] button
        ↓
[Cancellation/Rescheduling Policy Links:]
        
        [Cancellation Policy]
        [Rescheduling Policy]
        [Refund Policy]
```

### Status-Specific Views

#### Status: Submitted (No Payment Yet)
```
┌─────────────────────────────────────────┐
│  ⚠️ Payment Required                    │
│                                         │
│  Status: Submitted (orange)             │
│  Expires in: 2:15:33                    │
│                                         │
│  Please upload payment receipt          │
│                                         │
│  [Upload Payment] (primary button)      │
└─────────────────────────────────────────┘
```

#### Status: Pending (Payment Under Review)
```
┌─────────────────────────────────────────┐
│  ⏳ Payment Under Review                │
│                                         │
│  Status: Pending (yellow)               │
│                                         │
│  Your payment is being verified         │
│  You'll be notified within 24 hours     │
│                                         │
│  Payment Details:                       │
│  GCash Ref: GC-123456789               │
│  Amount: ₱500.00                        │
│                                         │
│  [View Receipt]  [Cancel Booking]       │
└─────────────────────────────────────────┘
```

#### Status: Confirmed (Approved)
```
┌─────────────────────────────────────────┐
│  ✅ Booking Confirmed                   │
│                                         │
│  Status: Confirmed (green)              │
│                                         │
│  Your booking is confirmed!             │
│  Scheduled: Sept 15, 2026, 10:00 AM    │
│                                         │
│  Assigned Technician:                   │
│  [Photo] Pedro Santos ⭐ 4.85           │
│                                         │
│  [Reschedule]  [Cancel]                 │
└─────────────────────────────────────────┘
```

#### Status: Ongoing (Service In Progress)
```
┌─────────────────────────────────────────┐
│  🔧 Service In Progress                 │
│                                         │
│  Status: Ongoing (blue)                 │
│                                         │
│  Pedro is currently working on your AC  │
│  Started: Sept 15, 10:05 AM            │
│                                         │
│  (No actions available)                 │
└─────────────────────────────────────────┘
```

#### Status: Completed (Service Done)
```
┌─────────────────────────────────────────┐
│  ✅ Service Completed                   │
│                                         │
│  Status: Completed (green)              │
│  Completed: Sept 15, 12:30 PM          │
│                                         │
│  How was your experience?               │
│                                         │
│  [Rate Technician] (primary button)     │
│                                         │
│  [View Receipt]  [Book Again]           │
└─────────────────────────────────────────┘
```

---

## Cancellation Flow

### Flow Diagram (Immediate Cancellation)
```
[Customer on booking status page]
        ↓
[Status: "Submitted" or "Pending"]
        ↓
[Clicks "Cancel Booking" button]
        ↓
[System shows confirmation modal:]
        
        Cancel Booking?
        
        Reference: KJAC-2026-ABC123
        
        ✅ Eligible for full refund
        
        You will receive:
        • Full down payment refund (₱500.00)
        • Processed within 3-5 business days
        
        Reason for cancellation: (text area)
        
        [Cancel] [Confirm Cancellation]
        ↓
[User enters reason (optional but recommended)]
        ↓
[User clicks "Confirm Cancellation"]
        ↓
[POST /bookings/{id}/cancel]
        Request: { reason, acknowledge_policy: true }
        ↓
--- SERVER-SIDE PROCESSING ---
        ↓
[System checks current status and date]
        ↓
[Determines cancellation policy:]
        • Before confirmed = Immediate refund
        ↓
[Update booking:]
        • status: "cancelled"
        • cancellation_reason
        • cancelled_at: NOW()
        • cancelled_by_user_id
        ↓
[Create refund record:]
        • refund_type: "full"
        • refund_amount: 500.00
        • status: "approved"
        ↓
[Create notifications:]
        • Customer: "Booking cancelled. Full refund approved."
        • Admin: "Booking KJAC-2026-ABC123 cancelled by customer"
        • Technician (if assigned): "Job KJAC-2026-ABC123 cancelled"
        ↓
[Return success response]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success message:]
        
        ✅ Booking Cancelled
        
        Full refund approved: ₱500.00
        
        Refund will be processed within
        3-5 business days via GCash
        
        [OK]
        ↓
[Update booking display:]
        Status: Cancelled (red)
        Cancellation reason: [reason]
        Refund Status: Approved ✅
        ↓
[Show "Book Again" button]
```

### Same-Day Cancellation (Requires Approval)
```
[Customer on booking status page]
        ↓
[Status: "Confirmed", appointment day is TODAY]
        ↓
[Technician NOT yet dispatched]
        ↓
[Clicks "Cancel Booking"]
        ↓
[System shows WARNING modal:]
        
        ⚠️ Same-Day Cancellation
        
        This booking is scheduled for TODAY.
        
        Refund Policy:
        • Requires admin approval
        • Refund amount decided by admin
        • May be full, partial, or none
        
        Are you sure?
        
        Reason: (required text area)
        
        [Go Back] [Proceed with Cancellation]
        ↓
[User enters reason (REQUIRED)]
        ↓
[User clicks "Proceed"]
        ↓
[POST /bookings/{id}/cancel]
        ↓
[Server creates refund request:]
        • status: "processing"
        • requires_admin_approval: true
        ↓
[Update booking status: "cancelled"]
        ↓
[Notify admin: "Same-day cancellation requires review"]
        ↓
[Customer sees:]
        
        Booking Cancelled
        
        Refund Status: Under Review
        
        Admin will review your request and
        notify you of the refund decision.
        ↓
--- ADMIN REVIEWS (in admin panel) ---
        ↓
[Admin sees cancellation request]
        ↓
[Admin reviews:]
        • Cancellation reason
        • Booking details
        • Customer history
        ↓
[Admin decides refund amount:]
        • Full (100%): ₱500.00
        • Partial (50%): ₱250.00
        • None (0%): ₱0.00
        ↓
[Admin clicks "Approve Refund"]
        ↓
[Enter notes and refund amount]
        ↓
[PATCH /admin/refunds/{id}/approve]
        ↓
[Update refund:]
        • status: "approved"
        • refund_amount
        • admin_notes
        ↓
[Notify customer: "Refund decision: ₱XXX approved"]
        ↓
[Process refund via GCash]
```

### Late Cancellation (Non-Refundable)
```
[Customer tries to cancel]
        ↓
[Status: "Confirmed", technician is "On the Way"]
        ↓
OR
        ↓
[Status: "Ongoing"]
        ↓
[System shows WARNING modal:]
        
        ❌ Non-Refundable Cancellation
        
        Your down payment will NOT be refunded because:
        • Technician has been dispatched
          OR
        • Service has already started
        
        Down payment forfeited: ₱500.00
        
        Do you still want to cancel?
        
        Reason: (required)
        
        [Go Back] [Cancel Anyway]
        ↓
   User proceeds? ───NO──→ [Close modal, return]
        ↓
       YES
        ↓
[POST /bookings/{id}/cancel]
        ↓
[Update booking: status = "cancelled"]
        ↓
[Create refund record:]
        • refund_type: "none"
        • refund_amount: 0.00
        • status: "denied"
        • denial_reason: "Late cancellation policy"
        ↓
[Notify customer and technician]
        ↓
[Customer sees:]
        
        Booking Cancelled
        
        Refund Status: Not Eligible
        
        As per our cancellation policy,
        your down payment is non-refundable.
```

---

## Refund Processing

### Admin Refund Approval Flow
```
[Admin logs in to admin panel]
        ↓
[Navigates to: Refunds → Pending]
        ↓
[Sees list of refund requests]
        ↓
[Clicks on refund request]
        ↓
[Views refund details:]
        • Booking reference
        • Customer name
        • Cancellation reason
        • Cancellation type (immediate, same-day, late)
        • Payment amount: ₱500.00
        • Recommended action
        ↓
[Admin reviews and decides]
        ↓
--- APPROVE REFUND ---
        ↓
[Admin clicks "Approve Refund"]
        ↓
[Enters refund details:]
        • Refund Amount: ₱500.00 (can adjust)
        • Refund Method: GCash / Bank Transfer / Cash
        • Admin Notes: (optional)
        ↓
[Clicks "Confirm Approval"]
        ↓
[PATCH /admin/refunds/{id}/approve]
        ↓
[Update refund:]
        • status: "approved"
        • refund_amount
        • refund_method
        • admin_notes
        • processed_by_user_id
        • processed_at
        ↓
[Send notification to customer:]
        "Your refund of ₱500.00 has been approved.
         Processing via GCash within 24 hours."
        ↓
--- MANUAL REFUND PROCESS ---
        ↓
[Admin processes refund via GCash]
        ↓
[Admin marks refund as completed:]
        ↓
[PATCH /admin/refunds/{id}/complete]
        ↓
[Update refund: status = "completed"]
        ↓
[Send notification: "Refund sent. Check your GCash."]
        
--- OR DENY REFUND ---
        ↓
[Admin clicks "Deny Refund"]
        ↓
[Enters denial reason (required)]
        ↓
[PATCH /admin/refunds/{id}/deny]
        ↓
[Update refund:]
        • status: "denied"
        • denial_reason
        ↓
[Notify customer with reason]
```

---

## Rescheduling Flow

### Flow Diagram
```
[Customer on booking status page]
        ↓
[Status: "Confirmed"]
        ↓
[Clicks "Reschedule" button]
        ↓
[System shows reschedule form:]
        
        Reschedule Booking
        
        Current Schedule:
        Date: Sept 15, 2026
        Time: 10:00 AM - 12:00 PM
        
        New Schedule:
        Select Date: [Calendar Picker]
        Select Time: [Time Slot Picker]
        
        Reason: (required text area)
        
        ℹ️ Note: Requires admin approval
        
        [Cancel] [Submit Request]
        ↓
[User selects new date & time]
        ↓
[User enters reason (required)]
        ↓
[User clicks "Submit Request"]
        ↓
[POST /bookings/{id}/reschedule]
        Request: {
          new_preferred_date,
          new_preferred_time,
          reason
        }
        ↓
--- SERVER-SIDE PROCESSING ---
        ↓
[Validate new date/time:]
        • Future date
        • Not Sunday
        • Within business hours
        • Different from current
        ↓
    Valid? ───NO──→ [Return validation errors]
        ↓
       YES
        ↓
[Create reschedule_request record:]
        • booking_id
        • old_date, old_time
        • new_date, new_time
        • reason
        • status: "pending"
        ↓
[Update booking: status = "rescheduled"]
        ↓
[Notify admin: "Reschedule request for KJAC-2026-ABC123"]
        ↓
[Return success response]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success message:]
        
        ✅ Reschedule Request Submitted
        
        New Date: Sept 18, 2026
        New Time: 2:00 PM - 4:00 PM
        
        Admin will review and notify you
        
        [OK]
        ↓
[Update booking display:]
        Status: Rescheduled (blue)
        Pending new date approval
        ↓
--- ADMIN REVIEWS ---
        ↓
[Admin views reschedule request]
        ↓
[Admin checks:]
        • New date availability
        • Technician availability
        • Reason
        ↓
[Admin decision:]
        
        Approve? ───YES──→ [Update booking:]
                                • preferred_date = new_date
                                • preferred_time = new_time
                                • status = "confirmed"
                                ↓
                             [Notify customer & technician:]
                                "Reschedule approved!"
        
        Deny? ───→ [Update booking:]
                        • status = "confirmed" (back to original)
                        ↓
                    [Notify customer:]
                        "Reschedule denied. Reason: [reason]
                         Original schedule remains."
```

---

## Service Completion & Rating

### Flow Diagram
```
--- TECHNICIAN COMPLETES SERVICE ---
        ↓
[Technician clicks "Complete Service" in app]
        ↓
[PATCH /bookings/{id}/status]
        Request: { status: "completed" }
        ↓
[Update booking:]
        • status: "completed"
        • completed_at: NOW()
        ↓
[Update technician stats:]
        • total_jobs_completed += 1
        ↓
[Calculate technician commission]
        ↓
[Create payroll record]
        ↓
[Notify customer: "Service completed. Rate your experience!"]
        ↓
--- CUSTOMER RECEIVES NOTIFICATION ---
        ↓
[Customer opens booking status page/app]
        ↓
[Sees: Status = "Completed" ✅]
        ↓
[Sees "Rate Technician" button (prominent)]
        ↓
[Clicks "Rate Technician"]
        ↓
[Rating modal/screen opens:]
        
        Rate Your Experience
        
        Technician: Pedro Santos
        Service: AC Repair
        Date: Sept 15, 2026
        
        Rating:* (required)
        ⭐ ⭐ ⭐ ⭐ ⭐ (tap to select 1-5 stars)
        
        Review: (optional)
        ┌─────────────────────────────────┐
        │ Tell us about your experience   │
        │                                 │
        └─────────────────────────────────┘
        
        [Skip] [Submit Rating]
        ↓
[User selects rating (1-5 stars)]
        ↓
[User optionally writes review]
        ↓
[User clicks "Submit Rating"]
        ↓
[POST /bookings/{id}/rating]
        Request: { rating, review_text }
        ↓
--- SERVER-SIDE PROCESSING ---
        ↓
[Validate:]
        • Booking status is "completed"
        • Rating not already submitted
        • Rating is 1-5
        ↓
    Valid? ───NO──→ [Return error]
        ↓
       YES
        ↓
[Create rating record:]
        • booking_id
        • customer_id
        • technician_id
        • rating (1-5)
        • review_text
        ↓
[Recalculate technician average rating]
        ↓
[Update users.average_rating for technician]
        ↓
[Notify technician: "You received a new rating: ⭐⭐⭐⭐⭐"]
        ↓
[Return success response]
        ↓
--- CLIENT-SIDE SUCCESS ---
        ↓
[Show success message:]
        
        ✅ Thank You!
        
        Your feedback helps us improve.
        
        [Close]
        ↓
[Hide "Rate Technician" button]
        ↓
[Show rating submitted:]
        
        Your Rating: ⭐⭐⭐⭐⭐
        "Great service!"
        
        Submitted: Sept 15, 3:00 PM
```

### Rating UI

#### Star Rating Component
```
Rate this service:

⭐ ⭐ ⭐ ⭐ ⭐  (5 stars - Excellent)
⭐ ⭐ ⭐ ⭐ ☆  (4 stars - Good)
⭐ ⭐ ⭐ ☆ ☆  (3 stars - Average)
⭐ ⭐ ☆ ☆ ☆  (2 stars - Poor)
⭐ ☆ ☆ ☆ ☆  (1 star - Very Poor)
```

---

## Error Scenarios & Handling

### Booking Creation Errors
- **Rate limit exceeded:** "You've reached the maximum bookings per hour. Try again later."
- **Invalid date:** "Please select a valid future date (not Sunday)."
- **No available slots:** "No technicians available for this date. Choose another."
- **Expired CAPTCHA:** "CAPTCHA expired. Please try again."

### Payment Upload Errors
- **File too large:** "Image too large. Max 3MB allowed."
- **Invalid format:** "Invalid file format. Use JPG, PNG, or HEIC."
- **Booking expired:** "This booking has expired. Please create a new booking."
- **Network error:** "Upload failed. Check your connection and try again."

### Cancellation Errors
- **Already cancelled:** "This booking is already cancelled."
- **Already completed:** "Cannot cancel a completed booking."
- **Invalid status:** "Cancellation not allowed in current status."

---

**Document Status:** Complete ✅  
**Maintained By:** Development Team  
**Related Docs:** API.md, PRD.md, BUSINESS_RULES.md, FLOW_AUTH.md

---

*These booking flows represent the core business process of the KJAC system and must be implemented exactly as specified to ensure proper operation and customer satisfaction.*
