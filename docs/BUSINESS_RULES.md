# KJAC Business Rules & Policies

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Business:** Klein & Justin Airconditioning

---

## Table of Contents
1. [Booking Rules](#booking-rules)
2. [Payment Rules](#payment-rules)
3. [Cancellation Policy](#cancellation-policy)
4. [Refund Policy](#refund-policy)
5. [Rescheduling Policy](#rescheduling-policy)
6. [Service Level Agreement](#service-level-agreement)
7. [Warranty & Guarantee](#warranty--guarantee)
8. [Privacy Policy](#privacy-policy)
9. [Terms of Service](#terms-of-service)
10. [Operational Rules](#operational-rules)

---

## Booking Rules

### BR-001: Booking Creation
1. **Required Information:**
   - Customer: First name, last name, email, contact number
   - Location: Complete address (via PSGC API), landmark
   - Service: Aircon brand, service type
   - Schedule: Preferred date and time
   
2. **Optional Information:**
   - Problem description (text)
   - Aircon problem photos (max 3MB per image, up to 5 images)

3. **Booking Validation:**
   - All required fields must be filled
   - Email must be valid format
   - Contact number must be Philippine format (09XX-XXX-XXXX or +639XX-XXX-XXXX)
   - Address must be selected from PSGC API (prevents invalid addresses)
   - Preferred date must be future date (not past)
   - Preferred time must be within business hours (8:00 AM - 5:00 PM)
   - **Preferred date cannot be Sunday** (business closed by default, configurable by admin)
   - If admin enables Sunday bookings in settings, Sunday becomes available for selection

4. **Rate Limiting:**
   - **Guest/Public users:** 3 bookings per 30 minutes per IP address
   - **Registered customers:** 3 bookings per 30 minutes per user account
   - **Purpose:** Prevent spam and abuse
   - **Configurable:** Admin can adjust limits in settings

5. **CAPTCHA Verification:**
   - Cloudflare Turnstile required for all web bookings
   - Not required for mobile app bookings (authenticated users)

### BR-002: Booking Reference ID
1. **Format:** Unique alphanumeric string (e.g., "KJAC-2026-ABC123")
2. **Generation:** Server-side only (never client-side)
3. **Display:** Shown once after booking submission
4. **Features:**
   - Copy button for easy copying
   - Auto-filled in booking status search after submission (good UX)
5. **Security:** Non-sequential to prevent enumeration attacks

### BR-003: Booking Expiration
1. **Timeout:** 3 hours from booking submission (configurable by admin)
2. **Trigger:** If no payment receipt uploaded within timeout period
3. **Status Change:** "Submitted" → "Expired"
4. **Notification:** Email/push notification 2 hours after submission (1 hour before expiration)
5. **Recovery:**
   - Expired bookings remain searchable by reference ID
   - Display "Booking expired - no payment received"
   - "Book Again" button available
6. **Cleanup:** Admin can manually delete expired bookings

### BR-004: Booking Status Workflow
**Status Progression:**
```
Submitted → Pending → Confirmed → Ongoing → Completed
    ↓         ↓          ↓
 Expired  Cancelled  Cancelled
                ↓
           Rescheduled → Confirmed
```

**Status Definitions:**
- **Submitted:** Booking created, awaiting payment upload
- **Pending:** Payment uploaded, awaiting admin verification
- **Confirmed:** Admin approved payment and assigned technician
- **Ongoing:** Technician clicked "Start Service"
- **Completed:** Service finished, awaiting customer rating
- **Cancelled:** Customer or admin cancelled booking
- **Expired:** No payment within 3 hours
- **Rescheduled:** Date/time changed, awaiting new appointment

### BR-005: Available Time Slots
1. **Business Hours:** Monday-Saturday, 8:00 AM - 5:00 PM (configurable by admin)
2. **Sunday Bookings:** Disabled by default, can be enabled by admin in system settings
3. **Slot Duration:** 2-hour windows (8-10, 10-12, 12-2, 2-4, 4-5)
4. **Technician Capacity:** Maximum 3 appointments per technician per day
5. **Double-Booking Prevention:** System validates technician availability before confirmation
6. **Calendar Display:** Only show available slots to customers

---

## Payment Rules

### PAY-001: Down Payment Requirement
1. **Mandatory:** Down payment required for all bookings
2. **Amount:** Set per service type by admin (e.g., ₱500 for repair, ₱1,000 for installation)
3. **Display:** Shown clearly during booking creation
4. **Purpose:** Secures appointment slot, reduces no-shows

### PAY-002: Payment Method
1. **Phase 1:** Manual verification only (GCash)
   - **GCash Account Number:** 0912-345-6789 (configurable by admin)
   - **Account Name:** Juan Dela Cruz (configurable by admin)
   - **Payment Process:**
     1. Customer sends down payment to KJAC's GCash account
     2. Customer takes screenshot of GCash receipt
     3. Customer uploads receipt to booking system
     4. Customer provides GCash reference number
     5. Admin manually verifies payment
   - **Payment Instructions for Customers:**
     ```
     Step 1: Open your GCash app
     Step 2: Select "Send Money"
     Step 3: Enter recipient number: 0912-345-6789
     Step 4: Recipient name should show: Juan Dela Cruz
     Step 5: Enter amount: [Down Payment Amount]
     Step 6: Add note: Your booking reference (e.g., KJAC-2026-ABC123)
     Step 7: Confirm and send payment
     Step 8: Screenshot the receipt (must show reference number)
     Step 9: Upload screenshot and enter reference number in booking system
     ```
2. **Future (Phase 3):** Paymongo integration
   - Automated payment gateway
   - Credit/debit card support
   - Instant verification
   - GCash API integration (automatic verification)

### PAY-003: Payment Upload Requirements
1. **File Format:** JPG, PNG, HEIC (auto-converted to WebP on server)
2. **File Size:** Maximum 3MB per image
3. **Validation:**
   - Server-side image validation (not just client-side)
   - Virus/malware scanning
   - Image dimensions verification (min 200x200, max 5000x5000)
4. **Required Information:**
   - GCash receipt image (required)
   - GCash reference number (required)
   - Both must be provided together

### PAY-004: Payment Verification Process
1. **Admin Verification Checklist:**
   - ✓ GCash reference number matches receipt
   - ✓ Amount matches down payment requirement
   - ✓ Recipient matches business GCash account
   - ✓ Date is recent (within last 24 hours)
2. **Approval:** Admin clicks "Approve Payment" → Status: "Confirmed"
3. **Rejection:** Admin clicks "Reject Payment" → Status back to "Submitted" → Customer notified with reason
4. **Turnaround Time:** Target < 24 hours

### PAY-005: Full Payment
1. **Timing:** After service completion
2. **Methods:**
   - Cash payment to technician
   - GCash transfer (same process as down payment)
   - Future: Online payment via Paymongo
3. **Receipt:** Technician or admin issues official receipt
4. **Balance:** Full service cost minus down payment already paid

---

## Cancellation Policy

### CANCEL-001: Immediate Cancellation (Before Confirmation)
**Eligibility:** Booking status = "Submitted" or "Pending" (not yet confirmed by admin)

**Rules:**
- ✅ **Full refund** (100% down payment)
- ✅ **Automatic approval** (no admin review needed)
- ✅ **No penalties**

**Process:**
1. Customer clicks "Cancel Booking"
2. System checks status (must be Submitted or Pending)
3. Confirmation modal: "You are eligible for full refund. Confirm cancellation?"
4. Customer confirms
5. Status → "Cancelled"
6. Refund status → "Approved"
7. Admin processes refund manually (bank transfer or GCash)
8. Estimated refund time: 3-5 business days

**Business Justification:** Customer changed mind before business allocated resources (technician assignment).

---

### CANCEL-002: Same-Day Cancellation (Before Technician Dispatch)
**Eligibility:** 
- Booking status = "Confirmed"
- Cancellation requested on appointment day
- Technician has NOT started traveling (no "On the Way" status)

**Rules:**
- ⚠️ **Refund eligible but requires admin approval**
- ⚠️ **Refund amount decided by admin** (full, partial, or none)
- ⚠️ **Admin reviews circumstances**

**Process:**
1. Customer clicks "Cancel Booking"
2. System checks:
   - Status = "Confirmed"
   - Today = Appointment date
   - Technician status ≠ "On the Way"
3. Warning modal: "Same-day cancellation requires admin approval. Refund is not guaranteed. Continue?"
4. Customer provides cancellation reason (required)
5. Customer confirms
6. Status → "Cancelled"
7. Refund status → "Processing"
8. Admin notification: "Same-day cancellation request from [Customer Name]"
9. Admin reviews:
   - Customer reason
   - Booking details
   - Customer history (frequent canceller?)
10. Admin decides:
    - **Full refund:** Valid emergency (medical, natural disaster)
    - **Partial refund:** Late notice but reasonable cause (50% down payment)
    - **No refund:** Insufficient reason, short notice
11. Customer notified of decision

**Business Justification:** Business may have already prepared for the appointment (allocated technician, scheduled route), but service not yet started.

---

### CANCEL-003: Late Cancellation (After Technician Dispatch)
**Eligibility:**
- Technician status = "On the Way" or "Arrived"
- OR Booking status = "Ongoing"

**Rules:**
- ❌ **NON-REFUNDABLE**
- ❌ **Down payment forfeited**
- ⚠️ **Cancellation still allowed** (customer can cancel, but no refund)

**Process:**
1. Customer attempts to cancel
2. System checks technician status
3. If technician dispatched or service started:
   - Warning modal: "⚠️ Late Cancellation Policy: Your down payment is non-refundable as the technician has been dispatched. Do you still wish to cancel?"
4. Customer options:
   - **Cancel anyway:** Status → "Cancelled", Refund status → "Denied"
   - **Keep appointment:** Return to booking status page
5. If cancelled:
   - Technician notified immediately
   - Admin notified
   - Down payment retained by business

**Business Justification:** Technician has already traveled (fuel cost, time cost, opportunity cost of other bookings).

---

### CANCEL-004: Admin-Initiated Cancellation
**Reasons:**
- Technician unavailable (sick, emergency)
- Weather conditions (typhoon, flooding)
- Business emergency
- Customer unreachable
- Safety concerns

**Rules:**
- ✅ **Always eligible for full refund** (100%)
- ✅ **Automatic approval**
- ✅ **Admin provides reason**

**Process:**
1. Admin clicks "Cancel Booking" in admin panel
2. Admin selects reason from dropdown or enters custom reason
3. Confirmation modal
4. Admin confirms
5. Status → "Cancelled"
6. Refund status → "Approved"
7. Customer notified via email/SMS/push notification with reason
8. Refund processed within 24 hours

---

## Refund Policy

### REFUND-001: Refund Methods
1. **GCash Transfer:** Same GCash account used for payment (preferred, instant)
2. **Bank Transfer:** Customer provides bank details (1-3 business days)
3. **Cash:** Pick up at business office (same day)

### REFUND-002: Refund Processing Time
- **GCash:** Within 24 hours of approval
- **Bank Transfer:** 1-3 business days
- **Cash:** Available immediately upon admin approval

### REFUND-003: Refund Amounts
- **Full Refund (100%):** Immediate cancellation, admin-initiated cancellation
- **Partial Refund (50%):** Same-day cancellation with admin approval (case-by-case)
- **No Refund (0%):** Late cancellation (after technician dispatch)

### REFUND-004: Refund Status Tracking
**Statuses:**
- **Processing:** Awaiting admin review
- **Approved:** Refund approved, processing payment
- **Denied:** Not eligible for refund
- **Completed:** Refund sent to customer

**Visibility:**
- Customer can track refund status on booking status page
- Email notification on each status change

### REFUND-005: Refund Disputes
1. Customer contacts admin via chat or email
2. Admin reviews case with business owner
3. Final decision made within 3 business days
4. Customer notified of final decision
5. If refund approved after dispute, processed within 24 hours

---

## Rescheduling Policy

### RESCHED-001: Rescheduling Eligibility
**Allowed for status:**
- ✅ Confirmed (before appointment day)
- ⚠️ Confirmed (on appointment day, before technician dispatch)
- ❌ Ongoing (service already started)
- ❌ Completed

### RESCHED-002: Rescheduling Process
1. Customer clicks "Reschedule Appointment"
2. Customer selects new preferred date & time (calendar with available slots)
3. Customer provides reason for rescheduling (required)
4. Confirmation modal: "Rescheduling requires admin approval. Your request will be reviewed."
5. Customer submits request
6. Status → "Rescheduled" (temporary)
7. Notification to admin: "Reschedule request from [Customer Name]"
8. Admin reviews:
   - Checks technician availability on new date
   - Reviews reason
   - Considers customer history
9. Admin decision:
   - **Approve:** Assign technician to new date, status → "Confirmed", customer notified
   - **Deny:** Status back to "Confirmed" (original date), customer notified with reason

### RESCHED-003: Rescheduling Rules
- **Frequency:** Maximum 2 reschedules per booking
- **Advance Notice:** Preferred 24 hours before appointment
- **Same-Day Reschedule:** Allowed but lower approval priority
- **No Fee:** Free rescheduling (no additional charge)
- **Down Payment:** Remains valid for rescheduled date

### RESCHED-004: Admin-Initiated Rescheduling
- Technician unavailable, weather, business needs
- Customer notified immediately
- Customer must approve new date or cancel for full refund
- If customer rejects new date → full refund

---

## Service Level Agreement (SLA)

### SLA-001: Response Times
- **Payment Verification:** < 24 hours
- **Booking Confirmation:** < 24 hours after payment approval
- **Customer Inquiry Response:** < 4 business hours
- **Refund Processing:** < 24 hours after approval
- **Rescheduling Response:** < 12 hours

### SLA-002: Service Quality Standards
- Technicians arrive within 30-minute window of scheduled time
- Technicians wear company uniform and ID
- Technicians bring necessary tools and equipment
- Professional and courteous service
- Clean up after service completion
- Provide service report and recommendations

### SLA-003: Service Guarantee
- If technician does not arrive within 1 hour of scheduled time (without prior notice): 20% discount on service
- If service quality is unsatisfactory: Free re-service within 7 days
- All work covered by 30-day workmanship warranty

---

## Warranty & Guarantee

### WARRANTY-001: Workmanship Warranty
**Coverage:** 30 days from service completion

**Includes:**
- Labor and workmanship defects
- Re-service if problem returns
- No additional labor charges

**Excludes:**
- Parts not supplied by KJAC
- Customer misuse or negligence
- Acts of nature (lightning, flood)
- Unauthorized repairs by others

### WARRANTY-002: Parts Warranty
**Coverage:** As per manufacturer warranty (varies by brand and part)

**KJAC Responsibilities:**
- Facilitate warranty claims with manufacturer
- Provide documentation (receipt, warranty card)
- Coordinate replacement or repair

**Customer Responsibilities:**
- Keep warranty card and receipt
- Register product with manufacturer (if required)
- Report issues within warranty period

### WARRANTY-003: Warranty Claim Process
1. Customer contacts KJAC with issue description
2. KJAC reviews service history
3. If within warranty period:
   - Schedule technician visit (no charge)
   - Technician diagnoses issue
   - If warranty-covered: free repair
   - If not covered: provide quotation for paid repair
4. Customer approves or declines
5. Complete repair and document

---

## Privacy Policy

### PRIVACY-001: Data Collection
**Information Collected:**
- Personal: Name, email, phone, address
- Account: Username, password (hashed), profile picture
- Booking: Service details, payment info, booking history
- Technical: IP address, device info, browser type, location (technician only)
- Usage: App usage patterns, feature interactions

**Purpose:**
- Provide and improve services
- Process bookings and payments
- Communicate with customers
- Ensure security and prevent fraud
- Generate business analytics

### PRIVACY-002: Data Usage
- **Internal Only:** Customer data not shared with third parties (except as required by law)
- **Marketing:** Promotional emails only with customer consent (opt-in)
- **Analytics:** Anonymized data for business insights
- **Security:** Data encrypted in transit (HTTPS) and at rest

### PRIVACY-003: Data Retention
- **Active Accounts:** Data retained while account is active
- **Inactive Accounts:** Data retained for 2 years after last login, then anonymized
- **Bookings:** Retained for 7 years (tax and legal requirements)
- **Audit Logs:** Retained for 3 years

### PRIVACY-004: Customer Rights
- **Access:** Request copy of personal data
- **Correction:** Update or correct inaccurate data
- **Deletion:** Request account deletion (some data retained for legal compliance)
- **Portability:** Export data in machine-readable format (CSV)
- **Objection:** Opt-out of marketing communications

### PRIVACY-005: Data Security
- Passwords hashed with bcrypt (cost factor 12)
- Database RLS (Row Level Security) policies
- API rate limiting and authentication
- Regular security audits
- HTTPS/TLS encryption
- Secure file storage (Supabase Storage)

---

## Terms of Service

### TOS-001: User Responsibilities
**Customers:**
- Provide accurate information
- Ensure someone 18+ is present during service
- Provide safe access to aircon units
- Make timely payments
- Treat technicians with respect

**Technicians:**
- Arrive on time and in uniform
- Provide professional service
- Follow company protocols
- Respect customer property
- Report issues to admin immediately

### TOS-002: Prohibited Activities
- Providing false information
- Impersonating others
- Abusing or harassing staff
- Attempting to bypass security measures
- Scraping or automated access (except authorized APIs)
- Booking with no intent to pay or use service (spam)

### TOS-003: Account Termination
**Grounds for Termination:**
- Violation of terms of service
- Fraudulent activity
- Repeated no-shows or cancellations
- Abusive behavior
- Non-payment

**Process:**
- Warning issued (for minor violations)
- Account suspension (temporary, 30 days)
- Account termination (permanent, for serious violations)
- User notified via email
- Pending bookings cancelled with appropriate refunds

### TOS-004: Liability Limitations
**KJAC Not Liable For:**
- Pre-existing aircon issues not disclosed
- Damage caused by customer negligence
- Indirect or consequential damages
- Service delays due to force majeure (natural disasters, government actions)
- Third-party products or services

**Maximum Liability:** Limited to amount paid for the specific service

### TOS-005: Dispute Resolution
1. **Informal Resolution:** Contact KJAC customer service
2. **Mediation:** Good-faith negotiation between parties
3. **Arbitration:** Binding arbitration under Philippine law (if mediation fails)
4. **Jurisdiction:** Courts of Laguna, Philippines

---

## Operational Rules

### OPS-001: Business Hours
- **Office Hours:** Monday-Saturday, 8:00 AM - 5:00 PM (configurable by admin)
- **Service Hours:** Monday-Saturday, 8:00 AM - 5:00 PM (last appointment starts at 4:00 PM)
- **Sunday Operations:** Closed by default, can be enabled via admin settings
- **Closed:** Philippine national holidays (New Year's Day, Independence Day, Christmas, etc.)
- **Emergency Service:** Available for existing customers on Sundays/holidays (additional 50% surcharge applies, subject to technician availability)

### OPS-002: Service Areas
**Primary Coverage:** Sta. Cruz, Laguna and surrounding areas

**Extended Coverage:** Other Laguna municipalities (may incur travel surcharge)

**Outside Coverage:** Case-by-case basis, subject to admin approval

### OPS-003: Technician Assignment Rules
**Factors Considered:**
- Technician availability (schedule)
- Technician expertise (service type, brand specialization)
- Geographic proximity (reduce travel time)
- Workload balancing (distribute jobs evenly)
- Customer preference (if repeat customer)

**Assignment Process:**
- Admin reviews available technicians
- Admin assigns most suitable technician
- Technician receives notification
- Technician confirms availability (must respond within 2 hours)
- If no response or declined: admin assigns another technician

### OPS-004: Pricing Policy
**Pricing Structure:**
- Base service fee (per service type)
- Parts cost (if replacement needed)
- Travel fee (for areas outside primary coverage)
- Emergency service premium (after hours)

**Price Transparency:**
- All prices displayed on website
- Quotation provided before service (for part replacements)
- No hidden fees
- Customer approval required before additional work

### OPS-005: Quality Control
**Post-Service Review:**
- Admin reviews completed jobs
- Customer rating and review system
- Technician performance monitoring
- Regular technician training and evaluation

**Customer Feedback:**
- Encouraged after every service
- Responded to within 24 hours
- Used to improve service quality
- Serious complaints escalated to owner

### OPS-006: Inventory Management
**Stock Levels:**
- Minimum stock levels defined per part
- Low stock alerts to admin
- Regular inventory counts (monthly)
- QR/barcode tracking for accuracy

**Part Sourcing:**
- Genuine parts from authorized distributors (preferred)
- High-quality aftermarket parts (if customer approves)
- Never use counterfeit or substandard parts

### OPS-007: Payroll Rules
**Technician Compensation:**
- Base salary (monthly, for full-time)
- Commission per completed job (% of service fee)
- Overtime pay (if applicable)
- Bonuses (performance-based, quarterly)

**Payment Schedule:**
- Salary: 15th and 30th of month (bi-monthly)
- Commission: Paid with next salary after job completion
- Deductions: SSS, PhilHealth, Pag-IBIG, withholding tax

**Payroll Transparency:**
- Detailed payslips provided
- Technicians can view pending commission
- Questions addressed by admin/owner

---

## Modification of Policies

**Right to Modify:**
- KJAC reserves the right to modify these policies at any time
- Changes effective immediately upon posting (for new bookings)
- Existing bookings governed by policies at time of booking

**Notification:**
- Major changes: Email notification to all registered users
- Minor changes: Posted on website and in-app notification
- Continued use of service constitutes acceptance of changes

**Policy Versioning:**
- Each version dated and archived
- Previous versions available upon request
- Booking records include policy version applied

---

**Contact Information for Policy Questions:**
- **Email:** abadeciomar@yahoo.com
- **Phone:** 0926-633-3129
- **Office Address:** 060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna, Philippines
- **Business Hours:** Monday-Saturday, 8:00 AM - 5:00 PM

---

**Document Approval:**
- [x] Business Owner: Ciomar Abade
- [ ] Legal Counsel (if applicable)
- [ ] Operations Manager

**Last Reviewed:** September 10, 2026  
**Next Review Date:** March 10, 2027 (6 months)

---

*These policies are designed to be fair to both KJAC and its customers, ensuring quality service and clear expectations for all parties.*
