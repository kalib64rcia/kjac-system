# FLOW_GUEST.md

**Klein & Justin Airconditioning - Public Website & Guest User Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Landing Page Navigation](#landing-page-navigation)
3. [Hero Section](#hero-section)
4. [About Section](#about-section)
5. [Services Exploration](#services-exploration)
6. [Brands Exploration](#brands-exploration)
7. [Walk-In Booking](#walk-in-booking)
8. [Track Booking Status](#track-booking-status)
9. [Upload Payment (Guest)](#upload-payment-guest)
10. [Gallery & Portfolio](#gallery--portfolio)
11. [Testimonials](#testimonials)
12. [Location & Contact](#location--contact)
13. [FAQs](#faqs)
14. [Footer & Legal Pages](#footer--legal-pages)

---

## Overview

### Purpose
This document defines all guest user workflows for the KJAC public website, covering navigation, service exploration, walk-in booking creation, payment upload, and booking status tracking without requiring an account.

### Guest User Capabilities
- **Browse website** - View all public information
- **Explore services** - View service details, pricing, process
- **Explore brands** - View supported aircon brands
- **Create walk-in bookings** - Book services without account registration
- **Track bookings** - Check status using reference ID
- **Upload payments** - Submit GCash receipts for bookings
- **View portfolio** - Gallery of past projects
- **Read testimonials** - Customer reviews and ratings
- **Contact business** - Via form, phone, email, or social media

### Access Level
- **No authentication required** - Fully public access
- **Rate limiting** - Protected by Cloudflare Turnstile CAPTCHA
- **Privacy** - No personal data collected except during booking

---

## Landing Page Navigation

### Website Structure

**Public Routes:**
- `/` - Home/Landing page
- `/booking` - Create booking form
- `/booking/status` - Track booking by reference ID
- (All sections accessible from home page)

**Responsive Behavior:**

**Desktop/Tablet Navigation (Wide Screen):**

```
┌─────────────────────────────────────────────────────┐
│ [LOGO] Home About Services▾ Brands▾ More▾ [Track][Book]│
└─────────────────────────────────────────────────────┘
```

- Horizontal navbar
- Dropdowns for Services, Brands, More
- Ghost button: "Track Booking Status"
- Primary button: "Book Appointment Now"

**Mobile Navigation (Narrow Screen):**

When nav links + buttons have no spacing:
- Navbar collapses to hamburger menu
- Shows only logo and hamburger icon

```
┌─────────────────────────────────────┐
│ [LOGO]                     [☰]      │
└─────────────────────────────────────┘
```

Tap hamburger → Sliding sheet sidebar opens:

```
┌─────────────────────────────────┐
│ [X] Close                        │
│                                  │
│ Home                            │
│ About                           │
│ Services ▾ (expandable)          │
│   → Service 1                   │
│   → Service 2                   │
│   → Service 3                   │
│ Brands ▾ (expandable)            │
│   → Daikin (Partner)            │
│   → Carrier                     │
│   → Other brands...             │
│ Gallery                         │
│ Testimonials                    │
│ FAQs                            │
│ Contact                         │
│                                  │
│ ─────────────────────────────   │
│ Sticky Footer (Always Visible):  │
│ [Book Appointment Now] (primary) │
│ [Track Booking Status] (outline) │
└─────────────────────────────────┘
```

**Dropdown Menus (Desktop):**

**Services Dropdown:**
```
┌─────────────────────────────┐
│ Aircon Installation          │
│ Aircon Repair               │
│ Aircon Maintenance          │
│ Aircon Cleaning             │
│ General Check-up            │
│ ─────────────────────────   │
│ View All Services →         │
└─────────────────────────────┘
```

**Brands Dropdown:**
```
┌─────────────────────────────┐
│ ⭐ Daikin (Official Partner) │
│ Carrier                      │
│ Panasonic                   │
│ LG                          │
│ Samsung                     │
│ ─────────────────────────   │
│ View All Brands →           │
└─────────────────────────────┘
```

**More Dropdown:**
```
┌─────────────────────────────┐
│ Gallery                      │
│ Certifications              │
│ Testimonials                │
│ FAQs                        │
│ Contact Us                  │
│ About Us                    │
│ Our Mission & Vision        │
└─────────────────────────────┘
```

**Sticky Navbar:**
- Remains at top when scrolling
- Background becomes solid (with shadow) after scrolling 50px
- Smooth scroll to sections when nav link clicked

---

## Hero Section

### Home Page Hero

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│         [Background: Gradient blue + image overlay] │
│                                                      │
│              ┌─────────────────┐                    │
│              │ Badge/Tag       │                    │
│              │ "Authorized     │                    │
│              │  Aircon         │                    │
│              │  Specialist"    │                    │
│              └─────────────────┘                    │
│                                                      │
│          KLEIN & JUSTIN                             │
│          AIRCONDITIONING                            │
│                                                      │
│     Your Trusted Partner for All                    │
│     Aircon Services in Laguna                       │
│                                                      │
│     ✓ Official Daikin Partner                       │
│     ✓ 500+ Satisfied Customers                      │
│     ✓ Same-Day Service Available                    │
│                                                      │
│  [Book Appointment Now]  [Learn More]               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Elements:**

1. **Business Badge:** "Authorized Aircon Specialist" (small pill badge)
2. **Business Name:** Large, bold, primary blue color (#38b6ff)
3. **Tagline:** Subheading, describes value proposition
4. **Trust Indicators:** 3 checkmarks with key benefits
5. **CTA Buttons:**
   - Primary: "Book Appointment Now" (blue, large) → `/booking`
   - Secondary: "Learn More" (outline) → Scroll to About section

**Animations:**
- Fade in on page load
- CTA buttons: Hover effect (scale + glow)
- Background: Subtle parallax scroll effect

**Responsive:**
- Desktop: Text aligned left, image on right
- Mobile: Text centered, full-width, image as background overlay

---

## About Section

### Business Information

**Section ID:** `#about`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│                  About KJAC                          │
│                                                      │
│  [Company Photo/Video]     [Text Content]           │
│                                                      │
│  Who We Are                                          │
│  Klein & Justin Airconditioning has been serving    │
│  Laguna for over X years with professional aircon   │
│  installation, repair, and maintenance services...  │
│                                                      │
│  What We Do                                          │
│  - Residential & Commercial AC Services              │
│  - Official Daikin Partner                          │
│  - Certified Technicians                            │
│  - Emergency Repairs                                │
│                                                      │
│  Why Choose Us                                       │
│  ✓ Licensed & Certified                             │
│  ✓ Experienced Technicians                          │
│  ✓ Quality Service Guaranteed                       │
│  ✓ Competitive Pricing                              │
│  ✓ Same-Day Service Available                       │
│                                                      │
│  [View Our Services] button                          │
└─────────────────────────────────────────────────────┘
```

**Content:**
- Company history and background
- Core values
- Service areas covered
- Team introduction (optional)
- Certifications and credentials

**Responsive:**
- Desktop: Two-column (image left, text right)
- Mobile: Single column (image top, text below)

---

## Services Exploration

### Services Section

**Section ID:** `#services`

**Layout:** Horizontal carousel (non-looping, arrows, swipeable)

```
┌─────────────────────────────────────────────────────┐
│                  Our Services                        │
│  Professional aircon solutions for every need        │
│                                                      │
│  [◀]  [Service Card 1] [Service Card 2] [Card 3]  [▶]│
│                                                      │
│        • • ○ ○ ○  (pagination dots)                 │
└─────────────────────────────────────────────────────┘
```

**Service Card Design:**

```
┌───────────────────────────┐
│ [Service Icon/Image]       │
│                           │
│ Aircon Installation       │
│ ₱1,500 - ₱3,000          │
│                           │
│ Professional installation │
│ of all aircon brands...   │
│                           │
│ Down payment: ₱500        │
│                           │
│ [Learn More]              │
└───────────────────────────┘
```

**Interaction:**

```
1. User hovers/taps service card
   ↓
2. Card elevates (shadow increases)
   ↓
3. User clicks "Learn More"
   ↓
4. Service details modal opens
   ↓
   **Service Detail Modal:**
   
   ┌─────────────────────────────────────┐
   │ [X] Close                            │
   │                                      │
   │ [Large Service Image]                │
   │                                      │
   │ Aircon Installation                  │
   │ ────────────────────────────────    │
   │                                      │
   │ Description:                         │
   │ Complete aircon installation service │
   │ for all brands. Includes mounting,   │
   │ piping, electrical connection...     │
   │                                      │
   │ What's Included:                     │
   │ ✓ Site inspection                    │
   │ ✓ Professional installation          │
   │ ✓ Testing and commissioning          │
   │ ✓ 6-month warranty                   │
   │                                      │
   │ Price Range: ₱1,500 - ₱3,000        │
   │ Down Payment: ₱500                   │
   │ Duration: 2-3 hours                  │
   │                                      │
   │ Step-by-Step Process:                │
   │ 1. Book appointment & pay deposit    │
   │ 2. Technician inspects location      │
   │ 3. Installation & setup              │
   │ 4. Testing & quality check           │
   │ 5. Customer approval & payment       │
   │                                      │
   │ [Sample Images Carousel]             │
   │ [Before] [During] [After]            │
   │                                      │
   │ [Book This Service] (primary CTA)    │
   │ [Contact Us] (secondary)             │
   └─────────────────────────────────────┘
   ↓
5. User reviews service details
   ↓
6. User clicks "Book This Service"
   ↓
7. Navigate to booking page with service pre-selected
   → See Walk-In Booking flow
```

**Services List (Examples):**
1. Aircon Installation
2. Aircon Repair
3. Aircon Maintenance
4. Aircon Cleaning
5. General Check-up
6. Emergency Service (if available)

**Admin-Configurable:**
- Service name, description, images
- Price range and down payment
- Step-by-step process
- Service badges (New, Popular, Recommended)

---

## Brands Exploration

### Brands Section

**Section ID:** `#brands`

**Layout:**

**1. Partner Brand Spotlight (Top):**

```
┌─────────────────────────────────────────────────────┐
│         ⭐ Official Daikin Partner ⭐                 │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  [Daikin Logo]                                       │
│                                                      │
│  As an authorized Daikin partner, we provide        │
│  genuine parts, expert service, and warranty        │
│  support for all Daikin aircon units.               │
│                                                      │
│  ✓ Certified Technicians                            │
│  ✓ Genuine Daikin Parts                             │
│  ✓ Extended Warranty                                │
│  ✓ Priority Service                                 │
│                                                      │
│  [Learn More] [Book Daikin Service]                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**2. All Brands Carousel (Below Partner):**

```
┌─────────────────────────────────────────────────────┐
│              All Supported Brands                    │
│  We service all major aircon brands                  │
│                                                      │
│  ← [Brand Card] [Brand Card] [Brand Card] [Card] →  │
│                                                      │
│  (Auto-scrolling carousel, looping, swipeable)      │
└─────────────────────────────────────────────────────┘
```

**Brand Card Design:**

```
┌───────────────────────────┐
│                           │
│    [Brand Logo]           │
│                           │
│    Carrier                │
│                           │
│ [Badge: Popular/New/etc]  │
│                           │
│    [View Details]         │
│                           │
└───────────────────────────┘
```

**Interaction:**

```
1. User clicks "View Details" on brand card
   ↓
2. Brand details modal opens
   ↓
   **Brand Detail Modal:**
   
   ┌─────────────────────────────────────┐
   │ [X] Close                            │
   │                                      │
   │ [Brand Logo]                         │
   │                                      │
   │ Carrier                              │
   │ [Badge: Popular Brand]               │
   │ ────────────────────────────────    │
   │                                      │
   │ About Carrier:                       │
   │ Carrier is a leading global provider │
   │ of heating, air-conditioning, and    │
   │ refrigeration solutions...           │
   │                                      │
   │ Key Features:                        │
   │ ✓ Energy-efficient models            │
   │ ✓ Inverter technology                │
   │ ✓ Smart features available           │
   │ ✓ Wide range of capacities          │
   │                                      │
   │ Popular Models:                      │
   │ • Carrier XPower Series              │
   │ • Carrier Deluxe Inverter           │
   │ • Carrier Smart Aircon              │
   │                                      │
   │ Services Available:                  │
   │ - Installation                       │
   │ - Repair                            │
   │ - Maintenance                        │
   │ - Parts replacement                  │
   │                                      │
   │ [Book Carrier Service]               │
   │ [View Carrier Models] (external)     │
   └─────────────────────────────────────┘
   ↓
3. User clicks "Book Carrier Service"
   ↓
4. Navigate to booking page with brand pre-selected
   → See Walk-In Booking flow
```

**Supported Brands:**
1. Daikin (Official Partner - special highlighting)
2. Carrier
3. Panasonic
4. LG
5. Samsung
6. Hitachi
7. Midea
8. TCL
9. Sharp
10. Toshiba

**Admin-Configurable:**
- Brand name, logo, description
- Partner status (is_partner flag)
- Custom badges (New, Popular, Premium, etc.)
- External links (brand website, catalog)

---

## Walk-In Booking

### Guest Booking Creation

**Route:** `/booking`

**Starting Point:** User clicks "Book Appointment" from anywhere on site

**Important:** No account required, no login needed

**Flow:**

```
1. User navigates to /booking
   ↓
2. Booking page displays
   ↓
   **Page Header:**
   - "Book Your Appointment"
   - "No account needed • Fast & easy • Secure payment"
   
   **Booking Form (Single Page, Progressive):**
   
   ╔═══════════════════════════════════════════════╗
   ║ Step 1: Your Information                      ║
   ╚═══════════════════════════════════════════════╝
   
   - First name * (text input)
   - Last name * (text input)
   - Email * (email input)
     - "We'll send booking confirmation here"
   - Contact number * (phone input)
     - Format: 09XX-XXX-XXXX or +639XX-XXX-XXXX
   
   ╔═══════════════════════════════════════════════╗
   ║ Step 2: Service Location                      ║
   ╚═══════════════════════════════════════════════╝
   
   - Region * (dropdown, PSGC API)
     → Shows loading while fetching
   - Province * (dropdown, loads after region)
     → Disabled until region selected
     → Shows "No province" if region has none
   - City/Municipality * (dropdown)
     → Disabled until province selected
   - Barangay * (dropdown)
     → Disabled until city selected
   - Street address * (text input)
     - Placeholder: "House #, Street, Subdivision"
   - Landmark * (text input)
     - Placeholder: "e.g., Near McDonald's, Green gate"
     - Now REQUIRED for guests
   
   ╔═══════════════════════════════════════════════╗
   ║ Step 3: Service Details                       ║
   ╚═══════════════════════════════════════════════╝
   
   - Aircon brand * (dropdown with logos)
     - Each option shows brand logo + name
     - Partner brand (Daikin) highlighted
   
   - Service type * (dropdown with icons)
     - Each option shows service icon + name
     - Shows price range below
   
   - When service selected:
     → Shows service details card:
       - Price range
       - Down payment amount
       - Duration estimate
       - [View Details] link (opens modal)
   
   ╔═══════════════════════════════════════════════╗
   ║ Step 4: Schedule                              ║
   ╚═══════════════════════════════════════════════╝
   
   - Preferred date * (calendar picker)
     - Min date: Tomorrow
     - Max date: 30 days from today
     - Disabled dates: Sundays (business closed)
     - Fully booked dates: Grayed out with label
     - Shows available slots badge on each date
   
   - Preferred time * (dropdown)
     - Only shows available time slots for selected date
     - Business hours: 8:00 AM - 5:00 PM
     - 1-hour intervals
     - Disabled slots: Grayed out "Fully Booked"
   
   ╔═══════════════════════════════════════════════╗
   ║ Step 5: Additional Information (Optional)     ║
   ╚═══════════════════════════════════════════════╝
   
   - Problem description (optional) (textarea)
     - "Describe the issue with your aircon"
     - Character count: 0/500
   
   - Upload photos (optional) (file upload)
     - "Add photos of your aircon (optional)"
     - Max 5 photos, 3MB each
     - Accepts: JPG, PNG, WebP
     - Shows thumbnail grid with remove (X) button
   
   ╔═══════════════════════════════════════════════╗
   ║ Review & Submit                               ║
   ╚═══════════════════════════════════════════════╝
   
   **Booking Summary Card:**
   ```
   ┌─────────────────────────────────────┐
   │ Your Booking Summary                │
   │ ─────────────────────────────────── │
   │ Service: Aircon Repair              │
   │ Brand: Daikin                       │
   │ Date: Sept 15, 2026 at 10:00 AM    │
   │ Location: Sta. Cruz, Laguna         │
   │ ─────────────────────────────────── │
   │ Service Fee: ₱1,500.00             │
   │ Down Payment: ₱500.00              │
   │ Balance: ₱1,000.00 (on completion) │
   └─────────────────────────────────────┘
   ```
   
   **Payment & Cancellation Policies:**
   - Expandable section: "Payment & Cancellation Policy"
   - Shows:
     - Down payment required: ₱500.00 via GCash
     - Upload deadline: 3 hours after booking
     - Full cancellation policy (link to full text)
     - Full refund policy (link to full text)
   
   **Cloudflare Turnstile CAPTCHA:**
   - "Verify you're human" CAPTCHA widget
   - Must complete before submit
   
   **Terms Agreement (Required):**
   - ☐ I agree to the payment and cancellation policies *
   - ☐ I agree to the terms of service *
   
   **Submit Button:**
   - "Submit Booking" (primary blue, large)
   - Disabled until:
     - All required fields filled
     - CAPTCHA completed
     - Both checkboxes checked
   
   ↓
3. User fills entire form
   - Real-time validation on each field
   - Address dropdowns load progressively
   - Service/brand selection shows details
   - Calendar shows availability
   ↓
4. User completes CAPTCHA
   ↓
5. User checks policy agreements
   ↓
6. User clicks "Submit Booking"
   ↓
7. Client-side validation:
   - All required fields filled
   - Valid email format
   - Valid phone format (Philippine)
   - All address fields selected
   - Service and brand selected
   - Date & time selected (not in past)
   - CAPTCHA verified
   - Policies agreed
   ↓
   ├─ Validation fails
   │  └─> Scroll to first error
   │      Highlight invalid fields (red border)
   │      Show error messages
   │      → Return to step 3
   │
   └─ Validation passes
      ↓
8. Rate limit check (Cloudflare + API):
   - Check: 3 bookings per 30 minutes per IP
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
9. Submit to API: POST /api/public/bookings
   - Show full-page loading overlay:
     - Spinner
     - "Creating your booking..."
     - "Please wait, do not close this page"
   - Disable all form inputs
   - Prevent back navigation
   ↓
10. Server creates booking:
    - Generate unique reference ID (KJ-YYYY-NNNNNN)
    - Create booking record (status: "Submitted")
    - Upload photos to cloud storage (if any)
    - Start 3-hour expiration timer
    - Create audit log entry
    - Send confirmation email:
      - Booking reference ID
      - Booking details
      - Payment instructions
      - Link to track booking
      - Link to upload payment
    - Send notification to admin:
      "New walk-in booking: #KJ-2026-001234"
    ↓
11. API responds with booking details
    ↓
12. Hide loading overlay
    ↓
13. Navigate to Booking Success page
    ↓
    **Booking Success Page:**
    
    ┌─────────────────────────────────────┐
    │ ✓ Booking Created Successfully!      │
    │                                      │
    │ Your Booking Reference ID:           │
    │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
    │ ┃  KJ-2026-001234                ┃ │
    │ ┃  [Copy to Clipboard] button    ┃ │
    │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
    │                                      │
    │ ⚠️ IMPORTANT: Save this ID!          │
    │ This is shown only once.             │
    │ You'll need it to track your booking.│
    │                                      │
    │ ⏰ Upload Payment Within 3 Hours     │
    │ Your booking will expire at: 1:30 PM │
    │ Countdown: 02:59:45 (live timer)     │
    │                                      │
    │ ─────────────────────────────────── │
    │                                      │
    │ Booking Details:                     │
    │ Service: Aircon Repair               │
    │ Brand: Daikin                        │
    │ Date: Sept 15, 2026 at 10:00 AM     │
    │ Location: Sta. Cruz, Laguna          │
    │                                      │
    │ Down Payment: ₱500.00                │
    │ Payment Method: GCash only           │
    │                                      │
    │ ─────────────────────────────────── │
    │                                      │
    │ Next Steps:                          │
    │ 1. ✓ Booking created                 │
    │ 2. → Pay ₱500 down payment (GCash)  │
    │ 3. → Upload GCash receipt            │
    │ 4. → Wait for admin verification     │
    │ 5. → Receive confirmation            │
    │                                      │
    │ ─────────────────────────────────── │
    │                                      │
    │ Confirmation email sent to:          │
    │ juandelacruz@email.com              │
    │                                      │
    │ [Upload Payment Now] (primary, large)│
    │ [Track My Booking] (secondary)       │
    │ [Back to Home] (text link)           │
    └─────────────────────────────────────┘
    ↓
14. User chooses action:
    
    If "Upload Payment Now":
    └─> Navigate to /booking/status?ref=KJ-2026-001234
        → Auto-filled reference ID
        → See Upload Payment flow
    
    If "Track My Booking":
    └─> Navigate to /booking/status?ref=KJ-2026-001234
        → See Track Booking Status flow
    
    If "Back to Home":
    └─> Navigate to /
    
    → END
```

**Important UX Notes:**

- **Auto-save:** Form data saved in browser (localStorage) if user exits
- **Pre-fill:** If returning user, offer to restore saved data
- **Validation:** Real-time, helpful error messages
- **CAPTCHA:** Only on final submit (not on every field)
- **Mobile-friendly:** Large touch targets, proper keyboard types
- **Accessibility:** Proper labels, ARIA attributes, keyboard navigation

**Error Handling:**

- **Network timeout:** "Connection timed out. Please check your internet and try again." (Retry button, form data preserved)
- **Server error:** "Something went wrong. Please try again in a moment." (Retry button)
- **Duplicate booking:** "You already have a pending booking. Please complete or cancel it first."
- **Service unavailable:** "This service is temporarily unavailable. Please choose another service or contact us."
- **Slot taken:** "This time slot was just booked. Please select another time."

---

## Track Booking Status

### Guest Booking Tracking

**Route:** `/booking/status`

**Starting Point:** User clicks "Track Booking Status" or has reference ID

**Flow:**

```
1. User navigates to /booking/status
   ↓
2. Track booking page displays
   ↓
   **Page Layout:**
   
   ┌─────────────────────────────────────┐
   │ Track Your Booking                   │
   │                                      │
   │ Enter your booking reference ID      │
   │ to check status                      │
   │                                      │
   │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
   │ ┃ KJ-2026-001234                 ┃ │
   │ ┃ (text input)                    ┃ │
   │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
   │                                      │
   │ [Track Booking] button               │
   │                                      │
   │ Don't have your reference ID?        │
   │ Check your email confirmation.       │
   │                                      │
   │ Need help? [Contact Us]              │
   └─────────────────────────────────────┘
   
   **If accessed from success page:**
   - Reference ID auto-filled in input
   - Auto-submit (skip manual entry)
   ↓
3. User enters reference ID: KJ-2026-001234
   ↓
4. User clicks "Track Booking"
   ↓
5. Client-side validation:
   - Reference ID format: KJ-YYYY-NNNNNN
   ↓
   ├─ Invalid format
   │  └─> Show error:
   │      "Invalid reference ID format"
   │      "Format should be: KJ-YYYY-NNNNNN"
   │      → Return to step 3
   │
   └─ Valid format
      ↓
6. Submit to API: GET /api/public/bookings/track?ref=KJ-2026-001234
   - Show loading spinner
   ↓
7. Server retrieves booking data
   ↓
   ├─ Booking not found
   │  └─> Show error screen:
   │      
   │      ┌─────────────────────────────────┐
   │      │ ❌ Booking Not Found             │
   │      │                                  │
   │      │ We couldn't find a booking with  │
   │      │ reference ID: KJ-2026-001234     │
   │      │                                  │
   │      │ Please check:                    │
   │      │ • Reference ID is correct        │
   │      │ • No typos or extra spaces       │
   │      │ • Booking hasn't been deleted    │
   │      │                                  │
   │      │ [Try Again] [Contact Support]    │
   │      └─────────────────────────────────┘
   │      → END
   │
   └─ Booking found
      ↓
8. Display booking status page
   ↓
   **Booking Status Page:**
   
   ┌─────────────────────────────────────┐
   │ [Large Status Badge]                 │
   │ (Color-coded: Submitted/Pending/     │
   │  Confirmed/Ongoing/Completed/        │
   │  Cancelled/Expired)                  │
   │                                      │
   │ Booking #KJ-2026-001234 [Copy]       │
   │                                      │
   │ ─────────────────────────────────── │
   │ Status Timeline (Stepper):           │
   │ ─────────────────────────────────── │
   │                                      │
   │ ✓ Submitted                          │
   │ │ Sept 10, 2026 at 10:00 AM          │
   │ │                                    │
   │ ⏳ Pending (current)                 │
   │ │ Payment uploaded, awaiting review  │
   │ │ Uploaded: Sept 10 at 10:30 AM      │
   │ │                                    │
   │ ○ Confirmed                          │
   │ │ Waiting for verification           │
   │ │                                    │
   │ ○ Ongoing                            │
   │ │                                    │
   │ ○ Completed                          │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Booking Information:                 │
   │ ─────────────────────────────────── │
   │ Service: Aircon Repair               │
   │ Brand: Daikin                        │
   │ Date: Sept 15, 2026                  │
   │ Time: 10:00 AM - 11:00 AM            │
   │ Location: Sta. Cruz, Laguna          │
   │ Customer: Juan Dela Cruz             │
   │ Contact: 0917-123-4567               │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ [Status-Specific Content & Actions]  │
   │ (See below for each status)          │
   │                                      │
   └─────────────────────────────────────┘
   
   **Status-Specific Content:**
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Submitted" (No payment yet)      ║
   ╚═══════════════════════════════════════════════╝
   
   ⚠️ Payment Required
   Down payment: ₱500.00
   
   ⏰ Expires in: 02:30:15 (live countdown)
   Your booking will expire if payment not uploaded
   
   Payment Instructions:
   1. Send ₱500 to our GCash account
   2. Take screenshot of receipt
   3. Upload receipt below
   
   [Upload Payment Now] (primary blue, large)
   [Cancel Booking] (outline red)
   [Download Payment Instructions] (PDF)
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Pending" (Payment uploaded)      ║
   ╚═══════════════════════════════════════════════╝
   
   ⏳ Payment Under Review
   Your payment is being verified by our admin
   You'll be notified within 24 hours
   
   Payment Details:
   Amount: ₱500.00
   GCash Ref: 1234-5678-90123
   Uploaded: Sept 10 at 10:30 AM
   
   [View Receipt] (opens image viewer)
   [Cancel Booking] (outline red)
   
   Note: Full refund available if cancelled now
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Confirmed" (Admin approved)      ║
   ╚═══════════════════════════════════════════════╝
   
   ✓ Booking Confirmed!
   Your appointment is confirmed
   
   Technician Assigned:
   ┌─────────────────────────────────┐
   │ [Photo] Pedro Santos             │
   │         ⭐ 4.8 (120 reviews)     │
   │         📞 0917-234-5678         │
   │ [Call Technician]                │
   └─────────────────────────────────┘
   
   Payment Status:
   ✓ Down payment verified: ₱500.00
   Balance due: ₱1,000.00 (on completion)
   
   [Reschedule] (outline blue)
   [Cancel Booking] (outline red)
   
   Note: Cancellation policy applies
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Ongoing" (Service in progress)   ║
   ╚═══════════════════════════════════════════════╝
   
   ⏰ Service In Progress
   
   Current Status: In Service
   Started: 10:30 AM
   Duration: 00:45:30 (elapsed time)
   
   Technician: Pedro Santos
   [Call Technician] [Report Issue]
   
   Note: Cancellation not available
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Completed"                       ║
   ╚═══════════════════════════════════════════════╝
   
   ✓ Service Completed!
   Completed: Sept 15, 2026 at 11:30 AM
   
   Service Duration: 1 hour 30 minutes
   
   Total Charges:
   Service fee: ₱1,500.00
   Additional charges: ₱200.00
   Total paid: ₱1,700.00
   
   [Download Receipt] (PDF)
   [View Service Photos]
   [Book Again] (primary blue)
   
   Did you enjoy our service?
   [Leave a Review] (outline)
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Cancelled"                       ║
   ╚═══════════════════════════════════════════════╝
   
   ❌ Booking Cancelled
   Cancelled: Sept 10, 2026 at 11:00 AM
   Reason: Customer requested
   
   Refund Status:
   ✓ Full refund approved: ₱500.00
   Processing time: 3-5 business days
   You'll receive it via GCash
   
   [Book Again] (primary blue)
   [Contact Support]
   
   ╔═══════════════════════════════════════════════╗
   ║ If Status = "Expired"                         ║
   ╚═══════════════════════════════════════════════╝
   
   ⏰ Booking Expired
   Payment was not received within 3 hours
   
   This booking has been cancelled
   No charges applied
   
   [Rebook with Same Details] (primary blue)
   [Contact Support]
   
   ↓
9. User reviews booking status
   - Can perform status-specific actions
   - Can refresh page to update status
   → END
```

**Refresh & Real-Time Updates:**

- **Pull to refresh:** Reload booking data
- **Auto-refresh:** Every 30 seconds if status = Ongoing
- **Push events:** If future enhancement (WebSocket)

**Cancellation & Rescheduling Policies (Links):**

When user clicks policy links:
- Opens modal with full policy text
- No navigation away from tracking page
- Easy to read, formatted text

---

## Upload Payment (Guest)

### Guest Payment Upload

**Context:** Guest with "Submitted" status booking needs to upload payment

**Starting Point:** Track booking page OR email link

**Flow:**

```
1. User clicks "Upload Payment Now" button
   ↓
2. Payment upload modal/page opens
   ↓
   **Payment Upload Interface:**
   
   ┌─────────────────────────────────────┐
   │ Upload Payment Receipt               │
   │                                      │
   │ Booking #KJ-2026-001234              │
   │ Down Payment: ₱500.00                │
   │                                      │
   │ ⏰ Time Remaining: 02:30:15          │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Step 1: Send Payment                 │
   │                                      │
   │ GCash Account Details:               │
   │ Name: Klein & Justin Aircon          │
   │ Number: 0926-633-3129                │
   │ [Copy Number] button                 │
   │                                      │
   │ OR                                   │
   │                                      │
   │ [Show QR Code] button                │
   │ (Opens full-screen QR modal)         │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Step 2: Take Screenshot              │
   │                                      │
   │ After sending payment via GCash:     │
   │ 1. Take screenshot of receipt        │
   │ 2. Make sure GCash ref # is visible  │
   │                                      │
   │ [Sample Receipt Image]               │
   │ (Shows what to screenshot)           │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Step 3: Upload Receipt               │
   │                                      │
   │ [Upload Receipt Photo]               │
   │ (Drag & drop or click to browse)     │
   │                                      │
   │ If image uploaded:                   │
   │ ┌─────────────────────────────────┐ │
   │ │ [Receipt Preview Thumbnail]      │ │
   │ │ receipt.png (245 KB)             │ │
   │ │ [Remove] [Change]                │ │
   │ └─────────────────────────────────┘ │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Step 4: Enter Reference Number       │
   │                                      │
   │ GCash Reference Number *             │
   │ ┌─────────────────────────────────┐ │
   │ │ 1234-5678-90123                  │ │
   │ │ (13-digit number from receipt)   │ │
   │ └─────────────────────────────────┘ │
   │                                      │
   │ ℹ️ Find this on your GCash receipt  │
   │    [Show me where] (opens help)     │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Important Notes:                     │
   │ • Admin will verify within 24 hours  │
   │ • Incorrect receipts will be rejected│
   │ • You'll be notified when verified   │
   │                                      │
   │ [Cancel] [Upload Payment]            │
   │                                      │
   └─────────────────────────────────────┘
   ↓
3. User sends GCash payment
   ↓
4. User uploads receipt screenshot
   - Drag & drop OR click to browse
   - Opens file picker
   - Selects image file
   ↓
5. Image preview displays
   ↓
6. User enters GCash reference number
   - 13-digit format
   - Auto-formats as user types: XXXX-XXXX-XXXXX
   ↓
7. User clicks "Upload Payment"
   ↓
8. Client-side validation:
   - Receipt image selected (not empty)
   - Image format valid (JPG, PNG, WebP)
   - Image size < 3MB
   - Reference number format valid (13 digits)
   ↓
   ├─ Validation fails
   │  └─> Show error messages below fields
   │      Highlight invalid fields
   │      → Return to step 4 or 6
   │
   └─ Validation passes
      ↓
9. Submit to API: POST /api/public/bookings/{ref}/upload-payment
   - ref: KJ-2026-001234
   - receipt_image: file (compressed to WebP)
   - gcash_reference: 1234567890123
   - Show loading overlay:
     - Spinner
     - "Uploading payment..."
     - Progress bar (if large file)
   ↓
10. Server processes upload:
    - Validate booking exists and status = "Submitted"
    - Check expiration (must be within 3 hours)
    - Compress image to WebP (if not already)
    - Save receipt to cloud storage (S3/Firebase)
    - Save GCash reference number
    - Update payment status to "Uploaded"
    - Update booking status to "Pending"
    - Record upload timestamp
    - Create audit log entry
    - Send notification to admin:
      "Payment uploaded for booking #KJ-2026-001234"
    - Send confirmation email to customer:
      "Payment received! We're verifying it now."
    ↓
11. API responds with success
    ↓
12. Close upload modal
    ↓
13. Show success screen:
    
    ┌─────────────────────────────────────┐
    │ ✓ Payment Uploaded Successfully!     │
    │                                      │
    │ Booking #KJ-2026-001234              │
    │                                      │
    │ Payment Details:                     │
    │ Amount: ₱500.00                     │
    │ GCash Ref: 1234-5678-90123          │
    │ Uploaded: Sept 10, 2026 at 10:30 AM │
    │                                      │
    │ What's Next?                         │
    │ ✓ Payment receipt uploaded           │
    │ → Admin will verify (within 24 hrs)  │
    │ → You'll receive email notification  │
    │ → Booking will be confirmed          │
    │                                      │
    │ You can close this page now.         │
    │ We'll notify you when verified.      │
    │                                      │
    │ [View Booking Status] (primary blue) │
    │ [Back to Home] (text link)           │
    └─────────────────────────────────────┘
    ↓
14. Booking status page updates:
    - Status: "Pending"
    - Timeline shows payment uploaded step
    - Shows payment details
    ↓
15. User waits for admin verification
    - Receives email when verified
    → END
```

**Error Handling:**

- **Booking expired:** "This booking has expired. Payment can no longer be uploaded."
- **Already uploaded:** "Payment has already been uploaded for this booking."
- **Image too large:** "Image must be smaller than 3MB. Please compress or take a screenshot instead."
- **Invalid reference:** "Please enter a valid 13-digit GCash reference number."
- **Network error:** "Upload failed. Please check your connection and try again." (Retry with saved data)
- **Server error:** "Something went wrong. Please try again." (Data saved, can retry)

---

## Gallery & Portfolio

### Work Gallery Section

**Section ID:** `#gallery`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│                  Our Work                            │
│  See what we've accomplished                         │
│                                                      │
│  [Filter: All | Installation | Repair | Maintenance] │
│                                                      │
│  [Image Grid - Masonry Layout]                       │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│  │       │ │       │ │       │ │       │           │
│  │ IMG 1 │ │ IMG 2 │ │ IMG 3 │ │ IMG 4 │           │
│  │       │ │       │ │       │ │       │           │
│  └───────┘ └───────┘ └───────┘ └───────┘           │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│  │ IMG 5 │ │ IMG 6 │ │ IMG 7 │ │ IMG 8 │           │
│  └───────┘ └───────┘ └───────┘ └───────┘           │
│                                                      │
│  [Load More] button                                  │
└─────────────────────────────────────────────────────┘
```

**Image Interaction:**

```
1. User clicks image
   ↓
2. Lightbox opens (full-screen)
   ↓
   - Large image display
   - Image caption (if any)
   - Project details:
     - Service type
     - Brand
     - Location
     - Date completed
   - Navigation arrows (prev/next)
   - Close button (X)
   - Zoom in/out buttons
   ↓
3. User navigates through images
4. User closes lightbox
   → Returns to gallery
```

**Certifications Section:**

```
┌─────────────────────────────────────────────────────┐
│           Certifications & Awards                    │
│                                                      │
│  [Cert 1]  [Cert 2]  [Cert 3]  [Cert 4]            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│  │ Badge│  │ Badge│  │ Badge│  │ Badge│            │
│  │      │  │      │  │      │  │      │            │
│  └──────┘  └──────┘  └──────┘  └──────┘            │
│  Daikin    Licensed  ISO       Customer            │
│  Partner   Contractor Certified Choice             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Testimonials

### Customer Reviews Section

**Section ID:** `#testimonials`

**Layout:** Carousel (auto-rotating, manual navigation)

```
┌─────────────────────────────────────────────────────┐
│              What Our Customers Say                  │
│                                                      │
│  ← [Testimonial Card] [Card] [Card] →              │
│                                                      │
│  • • ○ ○ ○  (pagination dots)                       │
└─────────────────────────────────────────────────────┘
```

**Testimonial Card:**

```
┌───────────────────────────────────┐
│ ⭐⭐⭐⭐⭐                          │
│                                   │
│ "Excellent service! Very          │
│ professional and prompt. My       │
│ aircon is working perfectly       │
│ now. Highly recommended!"         │
│                                   │
│ [Customer Photo]                  │
│ Maria Santos                      │
│ Verified Customer                 │
│ Sta. Cruz, Laguna                 │
│                                   │
│ Service: Aircon Repair            │
│ Date: August 2026                 │
└───────────────────────────────────┘
```

**Stats Summary (Below Testimonials):**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 500+         │  │ 4.9 ⭐       │  │ 98%          │
│ Customers    │  │ Avg Rating   │  │ Satisfaction │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Location & Contact

### Contact Section

**Section ID:** `#contact`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│                  Visit Us                            │
│                                                      │
│  [Interactive Map - Leaflet]                         │
│  (Shows business location marker)                    │
│                                                      │
│  Klein & Justin Airconditioning                      │
│  060 Sitio Narra, Brgy. Labuin                       │
│  Sta. Cruz, Laguna, Philippines                      │
│                                                      │
│  [Get Directions] (opens Google Maps)                │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Contact Information                                 │
│                                                      │
│  📞 Phone: 0926-633-3129                            │
│  📧 Email: abadeciomar@yahoo.com                    │
│  🕒 Hours: Monday–Saturday, 8:00 AM – 5:00 PM       │
│  📱 Facebook: facebook.com/abadeciomar              │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Send Us a Message                                   │
│                                                      │
│  [Contact Form]                                      │
│  - Name *                                            │
│  - Email *                                           │
│  - Phone *                                           │
│  - Message *                                         │
│  - [CAPTCHA]                                         │
│  - [Send Message] button                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Contact Form Submission:**

```
1. User fills contact form
2. Completes CAPTCHA
3. Clicks "Send Message"
4. Submit to API: POST /api/public/contact
5. Server sends email to business
6. Show success message:
   "Message sent! We'll respond within 24 hours."
7. Clear form
```

---

## FAQs

### Frequently Asked Questions

**Section ID:** `#faqs`

**Layout:** Accordion (expandable items)

```
┌─────────────────────────────────────────────────────┐
│              Frequently Asked Questions              │
│                                                      │
│  ▼ How do I book an appointment?                    │
│  You can book directly through our website...       │
│                                                      │
│  ▶ What payment methods do you accept?              │
│                                                      │
│  ▶ How long does installation take?                 │
│                                                      │
│  ▶ Do you provide warranty?                         │
│                                                      │
│  ▶ What areas do you serve?                         │
│                                                      │
│  ▶ Can I reschedule my appointment?                 │
│                                                      │
│  ▶ How do I cancel a booking?                       │
│                                                      │
│  Still have questions?                               │
│  [Contact Us] button                                 │
└─────────────────────────────────────────────────────┘
```

**FAQ Categories:**
- Booking & Scheduling
- Payment & Pricing
- Services
- Warranties & Guarantees
- Coverage Area
- Cancellation & Refunds

---

## Footer & Legal Pages

### Website Footer

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  [Business Logo]                                     │
│                                                      │
│  Your trusted aircon service partner in Laguna      │
│                                                      │
│  ───────────────────────────────────────────────── │
│                                                      │
│  Quick Links      Services         Contact          │
│  • Home           • Installation   📞 0926-633-3129 │
│  • About          • Repair         📧 Email us      │
│  • Services       • Maintenance    🏢 Visit us      │
│  • Brands         • Cleaning       📱 Facebook      │
│  • Book Now                                         │
│  • Track Status                                     │
│                                                      │
│  ───────────────────────────────────────────────── │
│                                                      │
│  [Facebook] [Instagram] [Twitter] (social icons)    │
│                                                      │
│  ───────────────────────────────────────────────── │
│                                                      │
│  Privacy Policy | Terms of Service | Warranty Terms │
│                                                      │
│  © 2026 Klein & Justin Airconditioning.             │
│  All rights reserved.                                │
└─────────────────────────────────────────────────────┘
```

### Legal Pages

**Privacy Policy (`/privacy-policy`):**
- Data collection practices
- How data is used
- Data protection measures
- User rights
- Cookie policy

**Terms of Service (`/terms`):**
- Service terms and conditions
- User responsibilities
- Limitation of liability
- Dispute resolution

**Warranty Terms (`/warranty`):**
- Service warranty coverage
- Parts warranty
- Warranty claims process
- Exclusions

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_AUTH.md` - No authentication for guests
- `FLOW_BOOKING.md` - Complete booking lifecycle (includes guest booking)
- `FLOW_ADMIN.md` - Admin payment verification for guest bookings
- `API.md` - Public API endpoints
- `DESIGN.md` - Web UI/UX specifications