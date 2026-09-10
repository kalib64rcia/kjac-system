# Product Requirements Document (PRD)
## Klein & Justin Airconditioning Service Management System

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Project Name:** KJAC Integrated Service Management System

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Business Information](#business-information)
3. [Project Overview](#project-overview)
4. [Stakeholders](#stakeholders)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Stack](#technical-stack)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Success Criteria](#success-criteria)

---

## Executive Summary

The **Klein & Justin Airconditioning Service Management System** is a comprehensive digital solution designed to modernize and streamline air conditioning service operations. The system integrates appointment scheduling, payment processing, technician dispatch, inventory management, and customer relationship management into a unified platform accessible through web and mobile interfaces.

### Key Objectives:
- **Automate** booking and scheduling processes
- **Digitize** payment verification and tracking
- **Optimize** technician dispatch and workload management
- **Improve** customer experience through real-time status updates
- **Enable** data-driven business decisions through analytics
- **Secure** sensitive business and customer data

---

## Business Information

**Business Name:** Klein & Justin Airconditioning  
**Short Name:** KJAC  
**Research Title:** Development of an Integrated Web and Mobile-Based Air Conditioning Service Management, Appointment Scheduling, and Inventory Management System for Klein & Justin Airconditioning

### Contact Details
- **Address:** 060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna, Philippines
- **Phone:** 0926-633-3129
- **Email:** abadeciomar@yahoo.com
- **Facebook:** https://www.facebook.com/abadeciomar
- **Google Maps:** https://maps.app.goo.gl/gTEH1mBnUXS1F2vU6
- **Coordinates:** 14.2571542, 121.3957919

### Business Hours
**Monday–Saturday:** 8:00 AM – 5:00 PM  
**Sunday:** Closed

### Timezone
**Asia/Manila** (GMT+8)

---

## Project Overview

### Problem Statement
Klein & Justin Airconditioning currently relies on manual processes for appointment booking, payment verification, technician scheduling, and inventory management. This leads to:
- Inefficient appointment scheduling and double-bookings
- Delayed payment verification
- Poor visibility into technician availability and location
- Lack of service history and customer data
- Manual inventory tracking prone to errors
- Difficulty in generating business reports and analytics

### Proposed Solution
A three-tier system architecture:

1. **Web Admin Panel** - Centralized business management dashboard
2. **Public Web Portal** - Customer-facing landing page and booking system
3. **Mobile Application** - Unified Flutter app for customers and technicians

All systems communicate through a secure FastAPI backend with Supabase for database and authentication.

### Scope
**In Scope:**
- User authentication and authorization (Admin, Customer, Technician)
- Appointment booking and scheduling
- Payment upload and verification
- Technician dispatch and job tracking
- Real-time status updates and notifications
- Inventory management with QR/barcode scanning
- Payroll processing for employees
- Business analytics and reporting
- Customer rating and review system
- Chat/messaging system
- Archive management
- Audit logging

**Out of Scope (Phase 1):**
- Automated payment gateway integration (future: Paymongo)
- AI-powered technician routing optimization
- Customer loyalty program
- Multi-branch management
- Third-party CRM integration

---

## Stakeholders

### Primary Stakeholders
1. **Business Owner** - Final decision maker, system administrator
2. **Office Staff** - Daily admin panel users, appointment managers
3. **Customers** - Service recipients, booking creators
4. **Technicians** - Field workers, service providers

### Secondary Stakeholders
1. **Development Team** - System builders and maintainers
2. **IT Support** - Technical support and troubleshooting
3. **Accountants** - Financial reporting users

---

## Functional Requirements

### FR-001: User Management

#### FR-001.1: Admin Management
- **FR-001.1.1:** Admin login with username/email and password
- **FR-001.1.2:** Two-factor authentication (2FA) for all admin accounts
- **FR-001.1.3:** Admin profile management (name, email, contact, profile picture)
- **FR-001.1.4:** Session timeout after 30 minutes of inactivity
- **FR-001.1.5:** Remember device option (30 days)
- **FR-001.1.6:** Force logout on password change

#### FR-001.2: Customer Management
- **FR-001.2.1:** Customer self-registration with email and password
- **FR-001.2.2:** Email verification via magic link
- **FR-001.2.3:** Customer profile includes: first name, last name, email, contact number, primary address, landmark, profile picture (optional)
- **FR-001.2.4:** Customers must complete profile (including address) before making bookings
- **FR-001.2.5:** Forgot password and reset password functionality
- **FR-001.2.6:** Profile updates don't affect pending/ongoing bookings
- **FR-001.2.7:** Customers cannot delete their own accounts (must contact admin)

#### FR-001.3: Technician Management
- **FR-001.3.1:** Admin creates technician accounts with auto-generated passwords
- **FR-001.3.2:** Credentials sent to technician's email
- **FR-001.3.3:** Technicians can also self-register (requires admin approval)
- **FR-001.3.4:** Mandatory password change on first login
- **FR-001.3.5:** Technician profile includes: first name, middle name, last name, email, contact number, birthday, address
- **FR-001.3.6:** Profile edits require admin approval (except profile picture)
- **FR-001.3.7:** Technicians can view their ratings, service history, and performance metrics
- **FR-001.3.8:** Forgot password functionality

---

### FR-002: Authentication & Authorization

#### FR-002.1: Web Admin Login
- **FR-002.1.1:** Login with username or email and password
- **FR-002.1.2:** Password field with eye toggle visibility
- **FR-002.1.3:** 2FA verification after successful password entry
- **FR-002.1.4:** Rate limiting: 5 failed attempts per 15 minutes → account lock
- **FR-002.1.5:** Email notification on account lockout

#### FR-002.2: Customer Mobile Login
- **FR-002.2.1:** Login with email and password
- **FR-002.2.2:** Password field with eye toggle visibility
- **FR-002.2.3:** Forgot password link (email with reset link)
- **FR-002.2.4:** Register link to registration page
- **FR-002.2.5:** Biometric authentication option (Face ID, Touch ID)
- **FR-002.2.6:** Rate limiting: 5 failed attempts per 15 minutes

#### FR-002.3: Technician Mobile Login
- **FR-002.3.1:** Login with technician ID or email and password
- **FR-002.3.2:** Password field with eye toggle visibility
- **FR-002.3.3:** Forgot password link (email with reset link)
- **FR-002.3.4:** Account creation notice: "Contact admin to create account"
- **FR-002.3.5:** Rate limiting: 5 failed attempts per 15 minutes

#### FR-002.4: Session Management
- **FR-002.4.1:** JWT tokens for authentication
- **FR-002.4.2:** Refresh tokens for mobile persistent login
- **FR-002.4.3:** Token expiration and refresh mechanism
- **FR-002.4.4:** Force re-authentication for sensitive actions

---

### FR-003: Booking Management

#### FR-003.1: Guest Booking (Web - No Account)
- **FR-003.1.1:** Booking form with fields:
  - First name (required, red asterisk)
  - Last name (required, red asterisk)
  - Email (required, red asterisk)
  - Contact number (required, red asterisk)
  - Exact address via PSGC API selection (required, red asterisk)
  - Landmark (required, red asterisk)
  - Aircon brand dropdown (required, red asterisk)
  - Service type dropdown (required, red asterisk)
  - Preferred date & time via calendar picker (available slots only) (required, red asterisk)
  - Problem description (optional, marked as "(optional)")
  - Upload aircon photos (optional, marked as "(optional)")
- **FR-003.1.2:** Cloudflare Turnstile CAPTCHA verification
- **FR-003.1.3:** Down payment policy link and modal
- **FR-003.1.4:** Calculate and display down payment amount
- **FR-003.1.5:** Form validation (client-side for UX, server-side for security)
- **FR-003.1.6:** Generate unique booking reference ID
- **FR-003.1.7:** Display reference ID with copy button after submission
- **FR-003.1.8:** Auto-redirect to booking status page with pre-filled reference ID
- **FR-003.1.9:** Booking status: "Submitted" (expires in 3 hours if no payment)
- **FR-003.1.10:** Rate limiting: 3 bookings per 30 minutes per IP (configurable)

#### FR-003.2: Customer Booking (Mobile - With Account)
- **FR-003.2.1:** Auto-fill customer information from profile
- **FR-003.2.2:** Same booking form as guest (address, landmark pre-filled)
- **FR-003.2.3:** Brand and service dropdowns
- **FR-003.2.4:** Calendar picker showing only available time slots
- **FR-003.2.5:** Optional problem description and photo upload
- **FR-003.2.6:** Generate booking reference ID
- **FR-003.2.7:** Booking appears in "My Bookings" tab
- **FR-003.2.8:** Push notification on status changes
- **FR-003.2.9:** Rate limiting: 3 bookings per 30 minutes per user

#### FR-003.3: Payment Upload
- **FR-003.3.1:** Customer uploads GCash receipt screenshot
- **FR-003.3.2:** Customer enters GCash reference number
- **FR-003.3.3:** Image validation: max 3MB, auto-convert to WebP
- **FR-003.3.4:** Server-side image validation and virus scanning
- **FR-003.3.5:** Booking status changes: "Submitted" → "Pending"
- **FR-003.3.6:** Notification to admin: "New payment uploaded"

#### FR-003.4: Admin Booking Management
- **FR-003.4.1:** View all bookings in CRUD table
- **FR-003.4.2:** Filter by status: Submitted, Pending, Confirmed, Ongoing, Completed, Cancelled, Expired, Rescheduled
- **FR-003.4.3:** Search by reference ID, customer name, email, phone
- **FR-003.4.4:** Sort by date, status, customer name
- **FR-003.4.5:** Verify payment receipt and GCash reference
- **FR-003.4.6:** Approve/reject payment
- **FR-003.4.7:** Assign technician from available list
- **FR-003.4.8:** Confirm booking → status: "Confirmed"
- **FR-003.4.9:** View booking details in modal
- **FR-003.4.10:** Edit booking (requires confirmation modal)
- **FR-003.4.11:** Cancel booking with reason
- **FR-003.4.12:** Process refund (full, partial, or none)
- **FR-003.4.13:** Delete expired bookings manually
- **FR-003.4.14:** Bulk actions (archive, delete, export)

---

### FR-004: Booking Status Tracking

#### FR-004.1: Track by Reference ID (Web - Public)
- **FR-004.1.1:** Search bar for booking reference ID
- **FR-004.1.2:** "Booking not found" message for invalid IDs
- **FR-004.1.3:** Display booking information card:
  - Reference ID
  - Customer name
  - Service type and brand
  - Preferred date & time
  - Address
  - Current status badge (color-coded)
- **FR-004.1.4:** Status timeline/stepper visualization
- **FR-004.1.5:** Status-specific actions and information

#### FR-004.2: Status: Submitted (No Payment Yet)
- **FR-004.2.1:** Display: "Payment pending - expires in X hours Y minutes" (countdown timer)
- **FR-004.2.2:** Payment upload section:
  - GCash receipt image upload
  - GCash reference number input
  - Submit payment button
- **FR-004.2.3:** Cancel booking button (red) with confirmation modal
- **FR-004.2.4:** Automatic status change to "Expired" after 3 hours

#### FR-004.3: Status: Pending (Payment Uploaded)
- **FR-004.3.1:** Display: "Payment under review"
- **FR-004.3.2:** Show uploaded payment receipt preview
- **FR-004.3.3:** Display GCash reference number
- **FR-004.3.4:** Cancel booking button with refund policy note

#### FR-004.4: Status: Confirmed (Admin Approved)
- **FR-004.4.1:** Display assigned technician info:
  - Name
  - Photo
  - Rating (average stars)
- **FR-004.4.2:** Show confirmed appointment date & time
- **FR-004.4.3:** Reschedule button (requires admin approval)
- **FR-004.4.4:** Cancel button with cancellation policy warning
- **FR-004.4.5:** Refund eligibility notice

#### FR-004.5: Status: Ongoing (Technician Working)
- **FR-004.5.1:** Display: "Service in progress"
- **FR-004.5.2:** Show technician information
- **FR-004.5.3:** Show service start timestamp
- **FR-004.5.4:** No cancel/reschedule options (locked)

#### FR-004.6: Status: Completed
- **FR-004.6.1:** Display service completion timestamp
- **FR-004.6.2:** Rate technician button (if not rated yet)
- **FR-004.6.3:** View service receipt/invoice
- **FR-004.6.4:** "Book Again" button

#### FR-004.7: Status: Cancelled
- **FR-004.7.1:** Display cancellation reason
- **FR-004.7.2:** Show refund status: Processing, Approved, Denied, Completed
- **FR-004.7.3:** Show refund amount (if applicable)
- **FR-004.7.4:** "Book Again" button

#### FR-004.8: Status: Rescheduled
- **FR-004.8.1:** Display: Old date → New date
- **FR-004.8.2:** Show rescheduling reason
- **FR-004.8.3:** Same actions as "Confirmed" status

#### FR-004.9: Status: Expired
- **FR-004.9.1:** Display: "Booking expired - no payment received"
- **FR-004.9.2:** Show original booking details
- **FR-004.9.3:** "Book Again" button
- **FR-004.9.4:** Admin can manually delete expired bookings

---

### FR-005: Cancellation & Refund Management

#### FR-005.1: Cancellation Policy Rules
- **FR-005.1.1:** **Immediate Cancellation** (before status = "Confirmed"):
  - Full automatic refund
  - No admin approval required
  - Refund processed within 3-5 business days
- **FR-005.1.2:** **Same-Day Cancellation** (on appointment day, before technician dispatch):
  - Refund eligible but requires admin approval
  - Admin reviews cancellation request
  - Admin decides refund amount (full, partial, or none)
- **FR-005.1.3:** **Late Cancellation** (after technician dispatched or service ongoing):
  - Non-refundable
  - Down payment forfeited
  - Customer can still cancel but receives no refund

#### FR-005.2: Cancellation Process
- **FR-005.2.1:** Customer clicks "Cancel Booking" button
- **FR-005.2.2:** System checks booking status and appointment date
- **FR-005.2.3:** Display appropriate cancellation policy modal
- **FR-005.2.4:** Customer provides cancellation reason (text area)
- **FR-005.2.5:** Confirmation modal with refund eligibility notice
- **FR-005.2.6:** Customer confirms cancellation
- **FR-005.2.7:** System updates booking status to "Cancelled"
- **FR-005.2.8:** If eligible for automatic refund:
  - Refund status: "Approved"
  - Admin processes refund manually (future: automatic via Paymongo)
- **FR-005.2.9:** If requires admin approval:
  - Refund status: "Processing"
  - Notification to admin
  - Admin reviews and approves/denies
- **FR-005.2.10:** Customer receives notification of refund decision

#### FR-005.3: Rescheduling Policy
- **FR-005.3.1:** All reschedule requests require admin approval
- **FR-005.3.2:** Customer selects new preferred date & time
- **FR-005.3.3:** Customer provides rescheduling reason
- **FR-005.3.4:** Admin reviews and approves/denies request
- **FR-005.3.5:** If approved:
  - Booking status changes to "Rescheduled"
  - New date assigned
  - Technician receives notification
- **FR-005.3.6:** If denied:
  - Customer notified with reason
  - Original appointment remains

---

### FR-006: Technician Operations

#### FR-006.1: Mobile App Dashboard
- **FR-006.1.1:** Today's appointments widget (count and list)
- **FR-006.1.2:** Upcoming scheduled jobs (next 7 days)
- **FR-006.1.3:** Performance metrics:
  - Total jobs completed
  - Success rate percentage
  - Average rating (stars)
  - Date since joined
- **FR-006.1.4:** Quick actions: View schedule, Contact admin

#### FR-006.2: Job Status Updates
- **FR-006.2.1:** View assigned job details:
  - Customer name and contact
  - Service type and brand
  - Address with map view
  - Scheduled date & time
  - Special instructions/notes
- **FR-006.2.2:** Status update buttons:
  - "On the Way" (updates customer, sends notification)
  - "Arrived" (timestamp recorded)
  - "Start Service" (booking status → "Ongoing")
  - "Complete Service" (booking status → "Completed")
- **FR-006.2.3:** Location tracking (manual refresh, not real-time)
- **FR-006.2.4:** Customer can view technician location when status = "On the Way"

#### FR-006.3: Schedule Management
- **FR-006.3.1:** Calendar view of all assigned appointments
- **FR-006.3.2:** Filter by date range, status
- **FR-006.3.3:** View job details by tapping calendar event
- **FR-006.3.4:** Receive push notification for new assignments
- **FR-006.3.5:** Receive push notification for schedule changes

#### FR-006.4: Communication
- **FR-006.4.1:** Chat with admin (general and per-booking)
- **FR-006.4.2:** Request profile changes (admin approval required)
- **FR-006.4.3:** Help center access
- **FR-006.4.4:** Contact admin button (opens chat)

---

### FR-007: Rating & Review System

#### FR-007.1: Customer Rating
- **FR-007.1.1:** Rating prompt after booking status = "Completed"
- **FR-007.1.2:** 1-5 star rating (required)
- **FR-007.1.3:** Written review text (optional)
- **FR-007.1.4:** Submit rating (one-time only per booking)
- **FR-007.1.5:** Rating linked to technician and booking

#### FR-007.2: Technician Profile
- **FR-007.2.1:** Display average rating (calculated from all reviews)
- **FR-007.2.2:** Total number of reviews
- **FR-007.2.3:** Individual ratings visible to admin only
- **FR-007.2.4:** Technician can view their own ratings and reviews

#### FR-007.3: Admin Review Management
- **FR-007.3.1:** View all ratings and reviews in table
- **FR-007.3.2:** Filter by rating (1-5 stars), technician, date
- **FR-007.3.3:** Search by customer name or review text
- **FR-007.3.4:** Flag inappropriate reviews
- **FR-007.3.5:** Delete flagged reviews (with audit log entry)

---

### FR-008: Admin Dashboard

#### FR-008.1: Dashboard Widgets
- **FR-008.1.1:** Today's appointments count with list preview
- **FR-008.1.2:** Pending bookings count (requires action)
- **FR-008.1.3:** Active technicians count (currently on jobs)
- **FR-008.1.4:** Monthly revenue total (real-time)
- **FR-008.1.5:** Charts:
  - Customer growth (line chart, last 6 months)
  - Bookings by service type (pie chart)
  - Revenue by month (bar chart, last 12 months)
  - Technician performance comparison (bar chart)
- **FR-008.1.6:** Real-time updates for revenue and booking counts

#### FR-008.2: Dispatch Dashboard
- **FR-008.2.1:** Calendar view of all appointments
- **FR-008.2.2:** Drag-and-drop technician assignment (future phase)
- **FR-008.2.3:** Filter by technician, date range, service type
- **FR-008.2.4:** View technician availability
- **FR-008.2.5:** Prevent double-booking (system validation)
- **FR-008.2.6:** Color-coded appointment statuses
- **FR-008.2.7:** Click appointment to view/edit details

#### FR-008.3: Business Analytics
- **FR-008.3.1:** Key performance indicators (KPIs):
  - Total revenue (monthly, yearly)
  - Average booking value
  - Customer retention rate
  - Technician utilization rate
  - Service completion rate
  - Payment collection rate
- **FR-008.3.2:** Service analysis:
  - Most popular services
  - Revenue by service type
  - Average service duration
- **FR-008.3.3:** Customer analysis:
  - New vs returning customers
  - Customer lifetime value
  - Geographic distribution (via PSGC data)
- **FR-008.3.4:** Technician analysis:
  - Jobs per technician
  - Revenue per technician
  - Average ratings per technician
  - Efficiency metrics

---

### FR-009: Inventory Management

#### FR-009.1: Inventory Items
- **FR-009.1.1:** CRUD operations for inventory items:
  - Aircon units (brand, model, type, quantity, price)
  - Replacement parts (name, part number, quantity, price, minimum stock level)
- **FR-009.1.2:** QR code / barcode generation for each item
- **FR-009.1.3:** QR/barcode scanning via mobile or web camera
- **FR-009.1.4:** Stock tracking:
  - Current quantity
  - Minimum stock level
  - Reorder point alert
- **FR-009.1.5:** Stock movement history (in, out, adjustment)
- **FR-009.1.6:** Low stock notifications to admin

#### FR-009.2: Stock Operations
- **FR-009.2.1:** Add stock (purchase order)
- **FR-009.2.2:** Remove stock (used in service, sold, damaged)
- **FR-009.2.3:** Stock adjustment (inventory count correction)
- **FR-009.2.4:** Transfer stock (future: multi-location)
- **FR-009.2.5:** Audit trail for all stock movements

#### FR-009.3: Inventory Reports
- **FR-009.3.1:** Current stock levels report
- **FR-009.3.2:** Stock movement report (date range)
- **FR-009.3.3:** Low stock items report
- **FR-009.3.4:** Inventory valuation report
- **FR-009.3.5:** Export to Excel

---

### FR-010: Payroll System

#### FR-010.1: Employee Management
- **FR-010.1.1:** Employee records (extends technician profile):
  - Employment type (full-time, part-time, contractual)
  - Salary/hourly rate
  - Commission rate (% per completed job)
  - Bank account details
  - Tax information (TIN, withholding tax)
- **FR-010.1.2:** View all employees in table
- **FR-010.1.3:** Filter by employment type, status (active, inactive)

#### FR-010.2: Payroll Processing
- **FR-010.2.1:** Payroll period selection (weekly, bi-weekly, monthly)
- **FR-010.2.2:** Automatic calculation:
  - Base salary/wages
  - Commission from completed jobs
  - Total earnings
  - Deductions (taxes, SSS, PhilHealth, Pag-IBIG)
  - Net pay
- **FR-010.2.3:** Manual adjustments (bonuses, penalties, advances)
- **FR-010.2.4:** Review payroll summary before finalization
- **FR-010.2.5:** Finalize payroll (locks calculations)
- **FR-010.2.6:** Generate payslips (PDF)
- **FR-010.2.7:** Email payslips to employees

#### FR-010.3: Payroll Reports
- **FR-010.3.1:** Payroll summary report (by period)
- **FR-010.3.2:** Employee earnings report (YTD)
- **FR-010.3.3:** Tax withholding report (BIR compliance)
- **FR-010.3.4:** Export to Excel

#### FR-010.4: Timesheet/Attendance (Optional Phase 2)
- **FR-010.4.1:** Clock in/out via mobile app
- **FR-010.4.2:** GPS location verification
- **FR-010.4.3:** Leave management (file, approve)
- **FR-010.4.4:** Overtime tracking

---

### FR-011: Service & Brand Management

#### FR-011.1: Service Management
- **FR-011.1.1:** CRUD operations for services:
  - Service name (e.g., "Installation", "Repair")
  - Description (detailed explanation)
  - Price (base price)
  - Down payment amount
  - Estimated duration
  - Step-by-step process (markdown or rich text)
  - Service images (before/after examples)
  - Active/inactive status
  - Display order (sort priority)
  - Custom badges (e.g., "Popular", "New", "Premium")
- **FR-011.1.2:** Upload multiple images per service (max 5)
- **FR-011.1.3:** Images auto-converted to WebP
- **FR-011.1.4:** Service details modal on public website
- **FR-011.1.5:** Service carousel on landing page

#### FR-011.2: Brand Management
- **FR-011.2.1:** CRUD operations for aircon brands:
  - Brand name (e.g., "Daikin", "Carrier")
  - Brand logo (image upload)
  - Description
  - Brand images (product photos)
  - Partner brand flag (`is_partner` = true for Daikin)
  - Active/inactive status
  - Display order (sort priority)
  - Custom badges (e.g., "Official Partner", "New Brand", "Authorized")
- **FR-011.2.2:** Daikin highlighted as official partner on website
- **FR-011.2.3:** Brand carousel on landing page (looping, swipeable)
- **FR-011.2.4:** Brand details modal on click
- **FR-011.2.5:** Separate "Partner Brand" section with special design

---

### FR-012: Web Public Portal

#### FR-012.1: Landing Page Sections (In Order)
1. **Navbar:**
   - Business logo (left)
   - Nav links (center): Home, About, Services (dropdown), Brands (dropdown), More (dropdown)
   - Ghost button: "Track Booking Status" (right)
   - Primary button: "Book Appointment Now" (right)
   - Mobile: Hamburger menu with sliding sheet sidebar
   - Sticky footer in mobile sidebar: Book and Track buttons (always visible)
2. **Hero Section:**
   - Business tag/badge: "Authorized Aircon Specialist"
   - Business name: "Klein & Justin Airconditioning"
   - Subheading/description
   - CTA buttons: "Book Now", "Learn More"
3. **About Section:**
   - Business background and history
   - Detailed information about the company
   - Mission, vision, values
4. **Services Section:**
   - Carousel of service cards (not looping, has arrows, swipeable)
   - Click card → modal with full service details
   - CTA: "Book This Service"
5. **Brands Section:**
   - Partner brand spotlight (Daikin) with special design
   - Brand carousel (looping, swipeable)
   - Click brand → modal with brand details
6. **Featured Technicians Section:**
   - Top-rated technicians with photos, names, ratings
7. **Gallery Section:**
   - Before/after photos of past jobs
   - Lightbox image viewer
8. **Certifications Section:**
   - Display business licenses, certifications, awards
9. **Promotions Section:**
   - Current offers and discounts
10. **Why Choose Us Section:**
    - Key differentiators, benefits, guarantees
11. **FAQs Section:**
    - Expandable accordion with common questions
12. **Testimonials Section:**
    - Customer reviews carousel
13. **Location Section:**
    - Leaflet map with business location
    - Coordinates: 14.2571542, 121.3957919
    - Address, phone, email, business hours
14. **Contact Section:**
    - Contact form (name, email, message)
    - Social media links (Facebook)
15. **Footer:**
    - Links: Privacy Policy, Terms of Service, Warranty Terms
    - Copyright notice
    - Business information
    - Professional footer design

#### FR-012.2: Responsive Behavior
- **FR-012.2.1:** Mobile-first design approach
- **FR-012.2.2:** Navbar transforms to mobile version when nav links/buttons are cramped
- **FR-012.2.3:** Dropdowns remain functional in mobile sidebar
- **FR-012.2.4:** Sticky mobile sidebar footer always visible

---

### FR-013: Notifications System

#### FR-013.1: Push Notifications (Mobile)
- **FR-013.1.1:** Firebase Cloud Messaging integration
- **FR-013.1.2:** Notification types:
  - **Booking updates:** Confirmed, Cancelled, Rescheduled, Completed
  - **Technician updates:** Assigned, On the way, Arrived
  - **Payment updates:** Payment received, Refund processed
  - **System alerts:** Booking expiring, Low stock (admin only)
- **FR-013.1.3:** In-app notification center
- **FR-013.1.4:** Notification settings (user can enable/disable by type)

#### FR-013.2: Email Notifications
- **FR-013.2.1:** Transactional emails:
  - Email verification (magic link)
  - Password reset
  - Booking confirmation
  - Payment receipt
  - Service completion
  - Refund processed
  - Technician account creation
- **FR-013.2.2:** Email templates with KJAC branding
- **FR-013.2.3:** SMTP configuration in admin settings

#### FR-013.3: Web Notifications (Admin)
- **FR-013.3.1:** Sliding sheet notification panel
- **FR-013.3.2:** Real-time updates via WebSocket (future) or polling
- **FR-013.3.3:** Notification badge count
- **FR-013.3.4:** Click notification → navigate to relevant page
- **FR-013.3.5:** Mark as read/unread
- **FR-013.3.6:** Clear all notifications

---

### FR-014: Reports & Export

#### FR-014.1: Report Types
- **FR-014.1.1:** Bookings report (date range, status filter)
- **FR-014.1.2:** Revenue report (daily, weekly, monthly, yearly)
- **FR-014.1.3:** Technician performance report
- **FR-014.1.4:** Customer report (new vs returning)
- **FR-014.1.5:** Service popularity report
- **FR-014.1.6:** Inventory stock report
- **FR-014.1.7:** Payroll report
- **FR-014.1.8:** Refund report

#### FR-014.2: Export Formats
- **FR-014.2.1:** Excel (XLSX)
- **FR-014.2.2:** PDF (formatted report with charts)
- **FR-014.2.3:** CSV (raw data)

#### FR-014.3: Report Upload
- **FR-014.3.1:** Admin can upload Excel reports
- **FR-014.3.2:** Server-side validation of file format and content
- **FR-014.3.3:** Parse and store data in database
- **FR-014.3.4:** Error handling for invalid data

---

### FR-015: Archive & Audit Logs

#### FR-015.1: Archive Management
- **FR-015.1.1:** Soft delete for all entities (bookings, users, services, etc.)
- **FR-015.1.2:** Deleted items moved to archive
- **FR-015.1.3:** Archive table with filters and search
- **FR-015.1.4:** Restore button (undelete)
- **FR-015.1.5:** Permanent delete button (with confirmation)
- **FR-015.1.6:** Auto-delete after 30 days (configurable)
- **FR-015.1.7:** Warning modal 24 hours before permanent deletion
- **FR-015.1.8:** Email notification to admin before auto-deletion

#### FR-015.2: Audit Logs
- **FR-015.2.1:** Track all CRUD operations:
  - Who (user ID and name)
  - What (action: created, updated, deleted, restored)
  - When (timestamp)
  - Where (IP address, user agent)
  - Details (before/after values for updates)
- **FR-015.2.2:** Audit log table (read-only for admin)
- **FR-015.2.3:** Filter by user, action, date range, entity type
- **FR-015.2.4:** Search by entity ID or user name
- **FR-015.2.5:** Export audit logs to Excel/PDF
- **FR-015.2.6:** Audit logs are immutable (cannot be deleted or edited)

---

### FR-016: Settings & Configuration

#### FR-016.1: Business Settings
- **FR-016.1.1:** Business information (name, address, contact, hours)
- **FR-016.1.2:** Booking expiration time (default: 3 hours)
- **FR-016.1.3:** Rate limit configuration:
  - Login attempts (default: 5 per 15 minutes)
  - Booking creation (default: 3 per 30 minutes)
  - API requests (default: 100/300/500 per minute)
- **FR-016.1.4:** Auto-archive deletion period (default: 30 days)
- **FR-016.1.5:** Email SMTP settings
- **FR-016.1.6:** Payment methods (GCash details)
- **FR-016.1.7:** Session timeout (default: 30 minutes)

#### FR-016.2: Design Settings (Future Phase)
- **FR-016.2.1:** Font family selection (Manrope, JetBrains, Inter)
- **FR-016.2.2:** Primary color customization
- **FR-016.2.3:** Logo upload
- **FR-016.2.4:** Preview changes before saving

#### FR-016.3: Admin Profile Settings
- **FR-016.3.1:** Update profile information
- **FR-016.3.2:** Change password (requires current password)
- **FR-016.3.3:** Enable/disable 2FA
- **FR-016.3.4:** Session management (view active sessions, logout all)

---

### FR-017: Chat/Messaging System

#### FR-017.1: Chat Types
- **FR-017.1.1:** Per-booking chat threads (linked to specific booking)
- **FR-017.1.2:** General messaging (admin-to-customer, admin-to-technician)

#### FR-017.2: Chat Features
- **FR-017.2.1:** Real-time messaging (WebSocket or polling)
- **FR-017.2.2:** Message history (paginated)
- **FR-017.2.3:** Unread message indicators
- **FR-017.2.4:** Typing indicators
- **FR-017.2.5:** Timestamp for each message
- **FR-017.2.6:** Admin can view all chat threads
- **FR-017.2.7:** Customers/technicians can only view their own chats

#### FR-017.3: Message Notifications
- **FR-017.3.1:** Push notification on new message (mobile)
- **FR-017.3.2:** Toast notification on new message (web)
- **FR-017.3.3:** Email notification if user offline (optional)

---

## Non-Functional Requirements

### NFR-001: Performance
- **NFR-001.1:** Page load time < 2 seconds on 4G connection
- **NFR-001.2:** API response time < 500ms for 95% of requests
- **NFR-001.3:** Database query optimization (indexed columns, efficient joins)
- **NFR-001.4:** Image lazy loading and compression (WebP format)
- **NFR-001.5:** Caching strategy for static content (CDN future phase)
- **NFR-001.6:** Mobile app startup time < 3 seconds
- **NFR-001.7:** Real-time updates < 1 second latency

### NFR-002: Security
- **NFR-002.1:** All passwords hashed with bcrypt (cost factor 12)
- **NFR-002.2:** HTTPS/TLS encryption for all communications
- **NFR-002.3:** JWT tokens with short expiration (15 minutes access, 7 days refresh)
- **NFR-002.4:** CORS configuration (whitelist allowed origins)
- **NFR-002.5:** SQL injection prevention (parameterized queries, ORM)
- **NFR-002.6:** XSS prevention (input sanitization, output encoding)
- **NFR-002.7:** CSRF protection (tokens for state-changing operations)
- **NFR-002.8:** Rate limiting on all endpoints
- **NFR-002.9:** File upload validation (type, size, content scanning)
- **NFR-002.10:** Supabase Row Level Security (RLS) policies
- **NFR-002.11:** API keys stored in environment variables (.env)
- **NFR-002.12:** No sensitive data in client-side code or logs
- **NFR-002.13:** Regular security audits and dependency updates
- **NFR-002.14:** Server-side validation for all inputs (never trust client)

### NFR-003: Scalability
- **NFR-003.1:** Support 1000+ concurrent users
- **NFR-003.2:** Database connection pooling
- **NFR-003.3:** Horizontal scaling capability (load balancer ready)
- **NFR-003.4:** Efficient database indexing
- **NFR-003.5:** Pagination for large datasets (default 20 items/page)
- **NFR-003.6:** Background job processing for heavy operations (email, reports)

### NFR-004: Reliability
- **NFR-004.1:** 99.9% uptime SLA
- **NFR-004.2:** Automated database backups (daily)
- **NFR-004.3:** Transaction rollback on errors
- **NFR-004.4:** Graceful error handling (no system crashes)
- **NFR-004.5:** Logging all errors to monitoring system
- **NFR-004.6:** Health check endpoints for monitoring

### NFR-005: Maintainability
- **NFR-005.1:** Clean code architecture (separation of concerns)
- **NFR-005.2:** Consistent code formatting (linters, formatters)
- **NFR-005.3:** Comprehensive inline comments for complex logic
- **NFR-005.4:** Component-based architecture (reusable components)
- **NFR-005.5:** Centralized configuration management
- **NFR-005.6:** Version control (Git) with meaningful commit messages
- **NFR-005.7:** Code review process
- **NFR-005.8:** Unit tests for critical functions (future phase)
- **NFR-005.9:** API documentation (auto-generated from code)

### NFR-006: Usability
- **NFR-006.1:** Intuitive user interface (minimal learning curve)
- **NFR-006.2:** Consistent design language across all platforms
- **NFR-006.3:** Accessibility compliance (WCAG 2.1 AA future phase)
- **NFR-006.4:** Mobile-first responsive design
- **NFR-006.5:** Loading states (skeleton loaders, not spinners)
- **NFR-006.6:** Error messages: clear, actionable, user-friendly
- **NFR-006.7:** Success feedback (toasts, modals)
- **NFR-006.8:** Keyboard navigation support
- **NFR-006.9:** Form validation: immediate feedback, clear requirements
- **NFR-006.10:** No text wrapping in buttons/badges
- **NFR-006.11:** Smooth animations (not slow, 200-300ms transitions)

### NFR-007: Compatibility
- **NFR-007.1:** Web browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **NFR-007.2:** Mobile OS: iOS 13+, Android 8.0+
- **NFR-007.3:** Screen sizes: 320px (mobile) to 4K (desktop)
- **NFR-007.4:** Touch and mouse/keyboard input support

### NFR-008: Localization (Future Phase)
- **NFR-008.1:** Multi-language support (English, Filipino)
- **NFR-008.2:** Timezone handling (Asia/Manila as default)
- **NFR-008.3:** Currency formatting (PHP)
- **NFR-008.4:** Date/time formatting (12-hour format)

### NFR-009: Monitoring & Analytics
- **NFR-009.1:** Application performance monitoring (APM)
- **NFR-009.2:** Error tracking and alerting
- **NFR-009.3:** User analytics (page views, user flows)
- **NFR-009.4:** Business metrics dashboard (real-time)
- **NFR-009.5:** System health monitoring (CPU, memory, disk)

---

## Technical Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy
- **Database:** Supabase (PostgreSQL 15)
- **Authentication:** Supabase Auth + JWT
- **API Style:** REST
- **Protocol:** HTTP/HTTPS
- **Environment:** .env files for configuration

### Frontend (Web)
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide Icons
- **Routing:** React Router (with routes, not single page)
- **State Management:** React Context API / Zustand (TBD)
- **HTTP Client:** Axios / Fetch API
- **Forms:** React Hook Form + Zod validation

### Mobile
- **Framework:** Flutter (latest stable)
- **Icons:** Lucide Icons (via flutter_lucide package)
- **Design:** iOS Human Interface Guidelines (HIG)
- **Navigation:** Bottom tab navigation
- **State Management:** Provider / Riverpod (TBD)
- **HTTP Client:** Dio
- **Local Storage:** SharedPreferences / Hive

### Infrastructure
- **Database & Auth:** Supabase (hosted PostgreSQL + Auth)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Maps:** Leaflet (web), Google Maps SDK (mobile - future)
- **Address API:** PSGC API (Philippine Standard Geographic Code)
- **CAPTCHA:** Cloudflare Turnstile
- **File Storage:** Supabase Storage (S3-compatible)
- **Email:** SMTP (configurable provider)
- **Future Payment Gateway:** Paymongo

### Development Tools
- **Version Control:** Git + GitHub/GitLab
- **Code Formatting:** Prettier (web), Black (backend), Dart Format (mobile)
- **Linting:** ESLint (web), Pylint (backend), Dart Analyzer (mobile)
- **API Documentation:** FastAPI auto-generated (Swagger/OpenAPI)
- **Design Tool:** Figma (optional)

### Typography
- **Primary Font:** Manrope (headers, body text, buttons, badges)
- **Technical Font:** JetBrains Mono (navbars, sidebars, stats, IDs, numbers)
- **Fallback:** Inter
- **Note:** Fonts configurable by admin (future phase)

---

## User Roles & Permissions

### Admin
- **Full CRUD access** to all entities
- **View:** All data, audit logs, analytics
- **Create:** Users (technician, customer, admin), bookings, services, brands, inventory
- **Update:** All entities, system settings, business configuration
- **Delete:** Archive entities, permanently delete from archive
- **Special:** Assign technicians, approve refunds, process payroll, configure system

### Customer
- **View:** Own profile, own bookings, own service history, public pages
- **Create:** Bookings, ratings/reviews, messages to admin
- **Update:** Own profile (address change doesn't affect pending bookings)
- **Delete:** Cancel own bookings (subject to refund policy)
- **Restrictions:** Cannot delete account, cannot view other customers' data

### Technician
- **View:** Own profile, assigned jobs, own performance metrics, schedule
- **Update:** Job status, own profile (requires admin approval except profile picture)
- **Create:** Messages to admin, profile change requests
- **Restrictions:** Cannot view other technicians' data, cannot modify bookings, cannot access business analytics

### Guest/Public
- **View:** Public website pages, own booking status (via reference ID)
- **Create:** Walk-in bookings, payment uploads for own booking
- **Restrictions:** No account access, no historical data, cannot modify booking after submission

---

## Success Criteria

### Phase 1 (MVP - 3 months)
1. ✅ Core authentication system (all roles)
2. ✅ Booking creation and management (guest + customer)
3. ✅ Payment upload and verification
4. ✅ Technician assignment and job tracking
5. ✅ Admin dashboard with basic analytics
6. ✅ Mobile app (customer and technician)
7. ✅ Push notifications
8. ✅ Rating and review system
9. ✅ Basic inventory management
10. ✅ Archive and audit logs

### Phase 2 (Enhancements - 2 months)
1. ⏳ Payroll system
2. ⏳ Advanced analytics and reports
3. ⏳ Chat/messaging system
4. ⏳ QR/barcode inventory scanning
5. ⏳ Export to Excel/PDF
6. ⏳ Email notification templates
7. ⏳ Enhanced dispatch dashboard

### Phase 3 (Future)
1. 🔮 Paymongo payment gateway integration
2. 🔮 Customer loyalty program
3. 🔮 Multi-branch management
4. 🔮 AI-powered technician routing
5. 🔮 CRM integrations
6. 🔮 Multi-language support
7. 🔮 Advanced reporting with BI tools

### Key Performance Indicators (KPIs)
- **User Adoption:** 100+ active customers in first 3 months
- **Booking Volume:** 50+ bookings per month
- **System Uptime:** 99.9%
- **Admin Efficiency:** 50% reduction in manual appointment scheduling time
- **Payment Verification:** < 24 hours turnaround time
- **Customer Satisfaction:** 4.5+ average rating
- **Mobile App Downloads:** 200+ in first 3 months

---

## Risks & Mitigation

### Risk 1: Low User Adoption
- **Mitigation:** User training, onboarding tutorials, responsive support

### Risk 2: Payment Verification Delays
- **Mitigation:** Clear admin queue dashboard, notification system, future automation

### Risk 3: Data Security Breach
- **Mitigation:** Security best practices, regular audits, encryption, RLS policies

### Risk 4: System Downtime
- **Mitigation:** Reliable hosting (Supabase), backups, monitoring, incident response plan

### Risk 5: Scope Creep
- **Mitigation:** Strict adherence to PRD, change request process, phased approach

---

**Document Approval:**
- [ ] Business Owner
- [ ] Project Manager
- [ ] Lead Developer
- [ ] QA Lead

**Next Steps:**
1. Review and approve PRD
2. Create detailed design mockups (Figma)
3. Set up development environment
4. Initialize database schema
5. Begin Phase 1 development

---

*This document is a living document and will be updated as requirements evolve.*
