# FLOW_PAYROLL.md

**Klein & Justin Airconditioning - Payroll Processing Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Payroll Dashboard](#payroll-dashboard)
3. [Technician Commission Tracking](#technician-commission-tracking)
4. [Salary Configuration](#salary-configuration)
5. [Generate Payroll](#generate-payroll)
6. [Deductions Management](#deductions-management)
7. [Payslip Generation](#payslip-generation)
8. [Payment Processing](#payment-processing)
9. [Payroll Reports](#payroll-reports)
10. [Tax Compliance](#tax-compliance)

---

## Overview

### Purpose
This document defines the payroll processing workflows for the KJAC system, covering technician compensation, commission calculation, deductions, payslip generation, and payment processing.

### Key Features
- **Commission-based pay** - Automatic calculation from completed jobs
- **Base salary + commission** - Flexible compensation structure
- **Automated deductions** - Tax, SSS, PhilHealth, Pag-IBIG
- **Payslip generation** - Professional, detailed payslips
- **Payment tracking** - Record all payments with audit trail
- **Reports** - Payroll summaries, tax reports, year-end statements

### Access Control
- **Admin only** - Full payroll management access
- **Technicians** - View own payslips only

### Payroll Cycle
- **Frequency:** Semi-monthly (2x per month)
- **Cutoff dates:** 
  - Period 1: 1st - 15th of month
  - Period 2: 16th - Last day of month
- **Payment dates:**
  - Period 1: 20th of month
  - Period 2: 5th of next month

---

## Payroll Dashboard

### Main Payroll Page

**Route:** `/admin/payroll`

**Page Layout:**

**Header Actions:**
- Date range filter (payroll period selector)
- Technician filter (All / Individual)
- Generate Payroll button (primary blue)
- Export Reports dropdown (PDF, Excel)
- Settings (gear icon) → Payroll configuration

**Summary Cards (Current Period):**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ₱125,000     │  │ 12           │  │ 150          │  │ ₱18,500      │
│ Total Payroll│  │ Technicians  │  │ Jobs Done    │  │ Avg per Tech │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Current Period Status:**

```
┌─────────────────────────────────────┐
│ Current Payroll Period               │
│ ─────────────────────────────────── │
│ Period: Sept 1-15, 2026              │
│ Status: In Progress                  │
│ Days remaining: 5                    │
│ Payment date: Sept 20, 2026          │
│ ─────────────────────────────────── │
│ [Generate Payroll] button            │
└─────────────────────────────────────┘
```

**Technician Payroll Table:**

Columns:
1. Technician name & photo
2. Employee ID
3. Jobs completed (period)
4. Base salary
5. Commission earned
6. Gross pay
7. Total deductions
8. Net pay
9. Status (Pending / Processed / Paid)
10. Actions (View, Generate Payslip, Pay)

**Table Features:**
- Sort by: Name, Jobs, Gross pay, Net pay
- Filter by status
- Color-coded status badges
- Expandable rows (show job details)

**Payroll History (Below):**

Tab navigation:
- Current Period (default)
- Previous Periods
- All Time

Shows past payroll records with same columns

---

## Technician Commission Tracking

### Commission Calculation Logic

**Commission Structure:**

```
Commission = Service Fee × Commission Rate

Example:
Service fee: ₱1,500
Commission rate: 10%
Commission: ₱1,500 × 0.10 = ₱150

Additional charges commission:
Additional charges: ₱200
Commission on additional: ₱200 × 0.10 = ₱20

Total commission per job: ₱150 + ₱20 = ₱170
```

**Commission Eligibility:**

Job must be:
- Status: "Completed"
- Customer paid: Balance settled
- Commission not already paid out

**Commission Tracking:**

```
For each technician:

Period: Sept 1-15, 2026

┌─────────────────────────────────────┐
│ Pedro Santos                         │
│ Employee ID: TEC-20260101-0001       │
│ ─────────────────────────────────── │
│                                      │
│ Completed Jobs: 15                   │
│ Total service fees: ₱22,500          │
│ Additional charges: ₱3,000           │
│ Grand total: ₱25,500                 │
│                                      │
│ Commission rate: 10%                 │
│ Total commission: ₱2,550             │
│                                      │
│ ─────────────────────────────────── │
│ Job Breakdown:                       │
│ ─────────────────────────────────── │
│                                      │
│ #KJ-2026-001234 - Sept 10            │
│ Service: Aircon Repair (₱1,500)     │
│ Additional: ₱200                     │
│ Commission: ₱170                     │
│                                      │
│ #KJ-2026-001240 - Sept 12            │
│ Service: Installation (₱2,500)      │
│ Commission: ₱250                     │
│                                      │
│ ... (13 more jobs)                   │
│                                      │
│ [Download Details] [Generate Payslip]│
└─────────────────────────────────────┘
```

---

## Salary Configuration

### Configure Technician Compensation

**Route:** `/admin/payroll/settings`

**Settings Page:**

**1. Global Settings:**

```
┌─────────────────────────────────────┐
│ Payroll Configuration                │
│ ─────────────────────────────────── │
│                                      │
│ Payroll Frequency:                   │
│ ○ Weekly                             │
│ ○ Bi-weekly                          │
│ ● Semi-monthly (15th & end)         │
│ ○ Monthly                            │
│                                      │
│ Default Commission Rate: [10]%       │
│                                      │
│ Currency: PHP (₱)                    │
│                                      │
│ Tax Method:                          │
│ ● Annualized                         │
│ ○ Non-annualized                     │
│                                      │
│ [Save Settings]                      │
└─────────────────────────────────────┘
```

**2. Deduction Rates:**

```
┌─────────────────────────────────────┐
│ Standard Deductions                  │
│ ─────────────────────────────────── │
│                                      │
│ SSS (Social Security):               │
│ Employee share: [4.5]%              │
│ Employer share: [9.5]%              │
│ Monthly salary cap: ₱20,000          │
│                                      │
│ PhilHealth (Health Insurance):       │
│ Premium rate: [3]%                   │
│ Employee share: 50%                  │
│ Employer share: 50%                  │
│ Monthly salary cap: ₱60,000          │
│                                      │
│ Pag-IBIG (HDMF):                     │
│ Employee share: [2]%                 │
│ Employer share: [2]%                 │
│ Max contribution: ₱100/month         │
│                                      │
│ Withholding Tax:                     │
│ ● Use BIR tax tables (2026)         │
│ ○ Custom rates                       │
│                                      │
│ [Update Rates]                       │
└─────────────────────────────────────┘
```

**3. Individual Technician Configuration:**

```
Technician: Pedro Santos
Employee ID: TEC-20260101-0001

┌─────────────────────────────────────┐
│ Compensation Structure               │
│ ─────────────────────────────────── │
│                                      │
│ Base Salary (Monthly): ₱15,000      │
│ Commission Rate: [10]%              │
│                                      │
│ Salary Type:                         │
│ ● Base + Commission                  │
│ ○ Commission only                    │
│ ○ Fixed salary only                  │
│                                      │
│ ─────────────────────────────────── │
│ Benefits & Allowances                │
│ ─────────────────────────────────── │
│                                      │
│ Transportation: ₱1,000/month        │
│ Communication: ₱500/month           │
│ Rice subsidy: ₱1,500/month          │
│                                      │
│ [+ Add Allowance]                    │
│                                      │
│ ─────────────────────────────────── │
│ Deductions                           │
│ ─────────────────────────────────── │
│                                      │
│ ☑ SSS (mandatory)                    │
│ ☑ PhilHealth (mandatory)             │
│ ☑ Pag-IBIG (mandatory)               │
│ ☑ Withholding tax                    │
│                                      │
│ Custom Deductions:                   │
│ • Loan repayment: ₱500/cutoff       │
│   [Edit] [Remove]                    │
│                                      │
│ [+ Add Deduction]                    │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ [Save Configuration]                 │
└─────────────────────────────────────┘
```

---

## Generate Payroll

### Process Payroll for Period

**Trigger:** Click "Generate Payroll" button

**Prerequisites:**
- Payroll period must be complete or near completion
- All jobs in period must be marked complete
- Customer payments received

**Flow:**

```
1. Admin clicks "Generate Payroll"
   ↓
2. Payroll generation wizard opens
   ↓
   **Step 1: Select Period**
   
   - Payroll period * (dropdown)
     - Sept 1-15, 2026 (Current)
     - Aug 16-31, 2026
     - Aug 1-15, 2026
     - ...
   
   - Or custom date range
     - Start date *
     - End date *
   
   - [Next: Review Data]
   ↓
3. Admin selects period & clicks Next
   ↓
   **Step 2: Review Data**
   
   System fetches and displays:
   
   ┌─────────────────────────────────────┐
   │ Payroll Data Summary                 │
   │ Period: Sept 1-15, 2026              │
   │ ─────────────────────────────────── │
   │                                      │
   │ Technicians included: 12             │
   │ Total jobs completed: 150            │
   │ Jobs verified: 150                   │
   │ Jobs pending payment: 0              │
   │                                      │
   │ ─────────────────────────────────── │
   │ Financial Summary:                   │
   │ ─────────────────────────────────── │
   │                                      │
   │ Total base salaries: ₱90,000         │
   │ (12 techs × ₱7,500/cutoff)          │
   │                                      │
   │ Total commissions: ₱35,000           │
   │ (From 150 completed jobs)            │
   │                                      │
   │ Total allowances: ₱18,000            │
   │                                      │
   │ Gross payroll: ₱143,000              │
   │                                      │
   │ Total deductions: ₱18,000            │
   │ - SSS: ₱5,400                       │
   │ - PhilHealth: ₱4,290                │
   │ - Pag-IBIG: ₱1,200                  │
   │ - Tax: ₱6,610                       │
   │ - Other: ₱500                       │
   │                                      │
   │ Net payroll: ₱125,000                │
   │                                      │
   │ ─────────────────────────────────── │
   │ [Download Detailed Breakdown]        │
   │                                      │
   └─────────────────────────────────────┘
   
   **Issues/Warnings:**
   - ⚠️ 2 technicians have pending loan deductions
   - ℹ️ 1 technician on leave (prorated)
   
   **Technician-by-Technician Review:**
   
   Expandable list showing each technician:
   
   ✓ Pedro Santos - ₱12,450 net
   ✓ Maria Cruz - ₱10,800 net
   ⚠️ Juan Reyes - ₱9,500 net (loan deduction)
   ...
   
   [Back] [Next: Calculate]
   ↓
4. Admin reviews & clicks Next
   ↓
   **Step 3: Calculate Payroll**
   
   System calculates:
   - Base salary (prorated if partial period)
   - Commission per job
   - Allowances
   - Gross pay
   - Mandatory deductions (SSS, PhilHealth, Pag-IBIG)
   - Tax (using BIR tables)
   - Custom deductions
   - Net pay
   
   Shows loading progress:
   "Calculating payroll... 8/12 technicians"
   ↓
5. Calculation complete
   ↓
   **Step 4: Review & Approve**
   
   ┌─────────────────────────────────────┐
   │ Payroll Calculation Complete ✓       │
   │ ─────────────────────────────────── │
   │                                      │
   │ Period: Sept 1-15, 2026              │
   │ Technicians: 12                      │
   │ Net payroll: ₱125,000                │
   │                                      │
   │ ─────────────────────────────────── │
   │ Payroll Summary by Technician:       │
   │ ─────────────────────────────────── │
   │                                      │
   │ [Expandable Table]                   │
   │                                      │
   │ Pedro Santos                         │
   │ Base: ₱7,500                         │
   │ Commission: ₱2,550 (15 jobs)        │
   │ Allowances: ₱1,500                   │
   │ Gross: ₱11,550                       │
   │ Deductions: -₱1,100                  │
   │ Net: ₱10,450                         │
   │ [View Details] [Edit]                │
   │                                      │
   │ ... (11 more)                        │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Actions:                             │
   │ ☐ Lock payroll (prevent changes)    │
   │ ☑ Generate payslips automatically    │
   │ ☑ Send notification to technicians   │
   │                                      │
   │ Approval:                            │
   │ ☐ I confirm the payroll is accurate │
   │                                      │
   │ Admin password * (for approval)      │
   │ [__________]                         │
   │                                      │
   │ [Back] [Approve & Generate]          │
   └─────────────────────────────────────┘
   ↓
6. Admin reviews all calculations
   - Can edit individual entries if needed
   - Can add manual adjustments
   ↓
7. Admin checks confirmation boxes
   ↓
8. Admin enters password & clicks "Approve & Generate"
   ↓
9. Confirmation modal:
   "Approve payroll for Sept 1-15, 2026?"
   
   - This will:
     • Lock the payroll (no further edits)
     • Generate 12 payslips
     • Create payment records
     • Send notifications to technicians
     • Update commission status (mark as paid)
   
   - "This action cannot be undone"
   
   - Cancel / Yes, Approve buttons
   ↓
10. Admin confirms
    ↓
11. System processes:
    - Create payroll batch record
    - Generate individual payroll records per technician
    - Calculate all amounts
    - Apply deductions
    - Mark commissions as "Paid"
    - Generate payslip PDFs
    - Send email notifications with payslips
    - Send push notifications
    - Create audit log entry:
      "Payroll generated for period Sept 1-15, 2026
       Approved by: Admin Maria Santos
       Total: ₱125,000 (12 technicians)"
    ↓
12. Success screen:
    
    ┌─────────────────────────────────────┐
    │ ✓ Payroll Generated Successfully!    │
    │                                      │
    │ Period: Sept 1-15, 2026              │
    │ Payroll ID: PAYROLL-2026-09-02       │
    │                                      │
    │ Summary:                             │
    │ • 12 payslips generated              │
    │ • ₱125,000 total net pay            │
    │ • Notifications sent                 │
    │                                      │
    │ Next Steps:                          │
    │ 1. Download payroll report           │
    │ 2. Process payments                  │
    │ 3. File with accounting              │
    │                                      │
    │ [Download Report] [View Payroll]     │
    │ [Process Payments →]                 │
    └─────────────────────────────────────┘
    ↓
13. Payroll status changes to "Approved"
    ↓
14. Admin can now process payments
    → END
```

**Edit Individual Payroll (Before Approval):**

```
1. In Step 4, admin clicks "Edit" on technician row
   ↓
2. Edit modal opens:
   
   Technician: Pedro Santos
   Period: Sept 1-15, 2026
   
   Earnings:
   - Base salary: ₱7,500 [editable]
   - Commission: ₱2,550 (auto-calculated)
   - Allowances: ₱1,500 [editable]
   - Bonus: ₱0 [editable, optional]
   
   Deductions:
   - SSS: ₱338 (auto-calculated)
   - PhilHealth: ₱346 (auto-calculated)
   - Pag-IBIG: ₱100 (auto-calculated)
   - Tax: ₱316 (auto-calculated)
   - Loan: ₱0 [editable, optional]
   
   Adjustment reason (if editing): [textarea]
   
   Calculated Net: ₱10,450
   
   [Cancel] [Save Changes]
   ↓
3. Admin makes changes & saves
   ↓
4. Recalculate totals
   ↓
5. Return to approval screen
   → END
```

---

## Deductions Management

### Mandatory Deductions (Auto-calculated)

**SSS (Social Security System):**

```
2026 SSS Contribution Table (Philippines)

Monthly Salary Range → Employee Share (4.5%)

Example for ₱15,000 monthly salary:
Monthly: ₱15,000
Per cutoff (semi-monthly): ₱7,500

SSS Contribution:
Employee: ₱7,500 × 0.045 = ₱338
Employer: ₱7,500 × 0.095 = ₱713
Total: ₱1,051

Deducted from technician: ₱338
```

**PhilHealth (Health Insurance):**

```
2026 PhilHealth Premium Rate: 3%
Shared equally (1.5% employee, 1.5% employer)

Example for ₱15,000 monthly salary:
Per cutoff: ₱7,500

PhilHealth Contribution:
Total premium: ₱7,500 × 0.03 = ₱225
Employee share: ₱225 × 0.50 = ₱113 (rounded: ₱346/month ÷ 2 = ₱173/cutoff)
Employer share: ₱225 × 0.50 = ₱113

Deducted from technician: ₱173/cutoff
```

**Pag-IBIG (Home Development Mutual Fund):**

```
Employee: 2% of monthly salary (Max ₱100/month)
Employer: 2% of monthly salary (Max ₱100/month)

Example for ₱15,000 monthly salary:
Employee: ₱15,000 × 0.02 = ₱300 (capped at ₱100)
Per cutoff: ₱100 ÷ 2 = ₱50

Deducted from technician: ₱50/cutoff
```

**Withholding Tax (BIR 2026 Tax Table):**

```
Annualized approach:
1. Calculate annual gross: (Base + Commission + Allowances) × 24
2. Apply tax brackets
3. Divide by 24 for per-cutoff tax

Example:
Semi-monthly gross: ₱11,550
Annual: ₱11,550 × 24 = ₱277,200

Tax brackets (2026):
₱0 - ₱250,000: 0%
₱250,000 - ₱400,000: 15% of excess
₱400,000 - ₱800,000: 20% of excess
...

Tax calculation:
On ₱250,000: ₱0
On ₱27,200: ₱27,200 × 0.15 = ₱4,080

Annual tax: ₱4,080
Per cutoff: ₱4,080 ÷ 24 = ₱170

Deducted from technician: ₱170/cutoff
```

### Custom Deductions

**Add Custom Deduction:**

```
1. Admin navigates to Technician settings
   ↓
2. Clicks "+ Add Deduction"
   ↓
3. Deduction form:
   
   Deduction Type * (dropdown):
   - Loan repayment
   - Cash advance
   - Uniform cost
   - Equipment damage
   - Tardiness/Absence
   - Other (specify)
   
   Deduction Name *:
   [e.g., "Personal Loan Sept 2026"]
   
   Amount * (currency):
   [₱500]
   
   Frequency * (dropdown):
   - Per cutoff (semi-monthly)
   - Per month
   - One-time only
   
   Start Date *: [Sept 20, 2026]
   End Date (optional): [Dec 5, 2026]
   
   Total Amount (if installment): [₱3,000]
   Remaining: [₱3,000] (updates as paid)
   
   Notes (optional):
   ["Approved personal loan, 6 payments"]
   
   [Cancel] [Add Deduction]
   ↓
4. Admin saves
   ↓
5. Deduction added to technician profile
   ↓
6. Will be applied in next payroll calculation
   → END
```

---

## Payslip Generation

### Auto-Generate Payslips

**Trigger:** Payroll approved & generated

**Payslip PDF Structure:**

```
┌─────────────────────────────────────────────────┐
│                                                  │
│           KLEIN & JUSTIN AIRCONDITIONING         │
│        060 Sitio Narra, Brgy. Labuin            │
│           Sta. Cruz, Laguna                      │
│                                                  │
│                  PAYSLIP                         │
│                                                  │
│  Pay Period: September 1-15, 2026                │
│  Payment Date: September 20, 2026                │
│  Payslip No: PAYSLIP-2026-09-002-001            │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  EMPLOYEE INFORMATION                            │
│                                                  │
│  Name: Pedro Santos                              │
│  Employee ID: TEC-20260101-0001                  │
│  Position: HVAC Technician                       │
│  Department: Field Operations                    │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  EARNINGS                           AMOUNT       │
│  ─────────────────────────────────────────────  │
│                                                  │
│  Base Salary (15 days)             ₱7,500.00    │
│  Commission (15 jobs)              ₱2,550.00    │
│  Transportation Allowance          ₱500.00      │
│  Communication Allowance           ₱250.00      │
│  Rice Subsidy                      ₱750.00      │
│                                                  │
│  GROSS PAY                         ₱11,550.00   │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  DEDUCTIONS                         AMOUNT       │
│  ─────────────────────────────────────────────  │
│                                                  │
│  SSS Contribution                  ₱338.00      │
│  PhilHealth Premium                ₱173.00      │
│  Pag-IBIG Contribution             ₱50.00       │
│  Withholding Tax                   ₱170.00      │
│  Personal Loan (5/6)               ₱500.00      │
│                                                  │
│  TOTAL DEDUCTIONS                  ₱1,231.00    │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  NET PAY                           ₱10,319.00   │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  COMMISSION BREAKDOWN                            │
│  ─────────────────────────────────────────────  │
│                                                  │
│  #KJ-2026-001234 - Sept 10         ₱170.00     │
│  #KJ-2026-001240 - Sept 12         ₱250.00     │
│  #KJ-2026-001248 - Sept 14         ₱180.00     │
│  ... (12 more jobs)                             │
│                                                  │
│  Total Commission                  ₱2,550.00    │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  YEAR-TO-DATE SUMMARY                            │
│  ─────────────────────────────────────────────  │
│                                                  │
│  Gross Pay YTD                     ₱208,350.00  │
│  Total Deductions YTD              ₱22,155.00   │
│  Net Pay YTD                       ₱186,195.00  │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  This is a system-generated payslip.             │
│  No signature required.                          │
│                                                  │
│  Generated on: September 20, 2026 at 10:30 AM    │
│  Generated by: Admin Maria Santos                │
│                                                  │
│  For inquiries, contact HR or Admin.             │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Payslip Distribution:**

```
When payroll is generated:

1. System generates PDF payslips for all technicians
   ↓
2. Store PDFs in secure storage
   ↓
3. Send email to each technician:
   
   Subject: "[KJAC] Your Payslip - Sept 1-15, 2026"
   
   Body:
   "Hi Pedro,
   
   Your payslip for the period Sept 1-15, 2026 is ready.
   
   Net Pay: ₱10,319.00
   Payment Date: September 20, 2026
   
   Download your payslip: [Download PDF]
   
   Or view it in the app: [Open App]
   
   If you have questions, contact admin.
   
   Best regards,
   KJAC Admin Team"
   
   Attachment: payslip_pedro_santos_202609.pdf
   ↓
4. Send push notification:
   "Your payslip is ready! Net pay: ₱10,319.00"
   ↓
5. Technician receives & downloads
   → END
```

**Technician View (Mobile App):**

```
Route: /profile/payslips

Page displays:
- List of all payslips (newest first)
- Filter by: Year, Month
- Search by period

Each payslip card:
┌─────────────────────────────────────┐
│ Sept 1-15, 2026                      │
│ Net Pay: ₱10,319.00                 │
│ Paid on: Sept 20, 2026               │
│ ─────────────────────────────────── │
│ [Download PDF] [View Details]        │
└─────────────────────────────────────┘

Tap "View Details":
- Shows same info as PDF
- Mobile-friendly layout
- Can download PDF
- Can share (if needed for loan applications, etc.)
```

---

## Payment Processing

### Record Payments

**Trigger:** After payroll approved, admin processes actual payments

**Flow:**

```
1. Admin navigates to Payroll → Current Period
   ↓
2. Payroll status: "Approved, Awaiting Payment"
   ↓
3. Admin clicks "Process Payments"
   ↓
4. Payment processing page:
   
   ┌─────────────────────────────────────┐
   │ Process Payments                     │
   │ Period: Sept 1-15, 2026              │
   │ ─────────────────────────────────── │
   │                                      │
   │ Total to disburse: ₱125,000          │
   │ Technicians: 12                      │
   │                                      │
   │ Payment method * (dropdown):         │
   │ ○ Bank transfer                      │
   │ ● Cash                               │
   │ ○ GCash                              │
   │ ○ Mixed (individual selection)       │
   │                                      │
   │ Payment date * (date picker):        │
   │ [Sept 20, 2026] (defaults to due)   │
   │                                      │
   │ ─────────────────────────────────── │
   │ Technician Payment Status:           │
   │ ─────────────────────────────────── │
   │                                      │
   │ ☐ Pedro Santos - ₱10,319 (Cash)     │
   │ ☐ Maria Cruz - ₱10,150 (Cash)       │
   │ ☐ Juan Reyes - ₱9,800 (Bank)        │
   │ ... (9 more)                         │
   │                                      │
   │ [Select All] [Mark as Paid]          │
   │                                      │
   │ ─────────────────────────────────── │
   │                                      │
   │ Upload proof (optional):             │
   │ [Upload bank transfer receipts]      │
   │                                      │
   │ Notes (optional):                    │
   │ [textarea]                           │
   │                                      │
   │ [Cancel] [Record Payments]           │
   └─────────────────────────────────────┘
   ↓
5. Admin marks technicians as paid
   - Can do individually or bulk
   - Can upload payment proofs
   ↓
6. Admin clicks "Record Payments"
   ↓
7. Confirmation modal:
   "Record payments for 12 technicians?"
   
   - Total amount: ₱125,000
   - Payment date: Sept 20, 2026
   - This will mark payroll as complete
   
   - Cancel / Confirm buttons
   ↓
8. Admin confirms
   ↓
9. System processes:
   - Update payment status for each technician
   - Record payment date & method
   - Upload proof files to storage
   - Update payroll batch status to "Paid"
   - Send confirmation notifications to technicians:
     Push: "Payment received! ₱10,319 paid on Sept 20"
   - Create audit log entry
   ↓
10. Success screen:
    "Payments recorded successfully! ✓"
    - 12 technicians marked as paid
    - Payroll period closed
    ↓
11. Payroll status: "Completed & Paid"
    → END
```

**Individual Payment Recording:**

If admin wants to record payments one by one:

```
1. From payroll table, click "Pay" on technician row
   ↓
2. Payment modal for individual:
   
   Technician: Pedro Santos
   Net pay: ₱10,319.00
   
   Payment method * (dropdown):
   - Cash
   - Bank transfer
   - GCash
   
   Payment date * (date picker)
   
   Reference number (optional):
   [For bank transfers]
   
   Upload proof (optional):
   [Upload receipt/screenshot]
   
   Notes (optional):
   
   [Cancel] [Record Payment]
   ↓
3. Admin fills & submits
   ↓
4. Update technician payment status
   ↓
5. Send notification to technician
   → END
```

---

## Payroll Reports

### Generate Payroll Reports

**Report Types:**

**1. Payroll Summary Report**

```
Period: Sept 1-15, 2026

Summary:
- Total technicians: 12
- Total jobs completed: 150
- Gross payroll: ₱143,000
- Total deductions: ₱18,000
- Net payroll: ₱125,000

Breakdown by Technician:
[Table with all technicians and their pay]

Deductions Summary:
- SSS: ₱5,400
- PhilHealth: ₱4,290
- Pag-IBIG: ₱1,200
- Tax: ₱6,610
- Other: ₱500

Export: PDF, Excel
```

**2. Payroll Register**

```
Detailed list of all payments
Columns:
- Employee ID
- Name
- Gross pay
- All deduction itemized
- Net pay
- Payment method
- Payment date
- Status

Export: PDF, Excel (for accounting)
```

**3. Tax Report (BIR)**

```
Withholding tax summary
Required for BIR filing

Per technician:
- Name, TIN
- Gross compensation
- Taxable income
- Tax withheld

Monthly summary
Quarterly summary
Annual summary (for BIR Form 1604-C)

Export: PDF, Excel
```

**4. SSS/PhilHealth/Pag-IBIG Reports**

```
Contribution reports per agency

Format required by each agency
Employee + Employer contributions
Monthly summary

Export: PDF, Excel, CSV
```

**5. YTD (Year-to-Date) Report**

```
Per technician, shows:
- Total gross pay (YTD)
- Total deductions (YTD)
- Total net pay (YTD)
- Average per period

Useful for:
- Performance reviews
- Loan applications
- Tax compliance

Export: PDF, Excel
```

**Report Generation Flow:**

```
1. Admin navigates to Payroll → Reports
   ↓
2. Select report type
   ↓
3. Configure filters:
   - Date range
   - Technician (individual or all)
   - Include/exclude specific data
   ↓
4. Click "Generate Report"
   ↓
5. Loading (may take time for large ranges)
   ↓
6. Report preview displays
   ↓
7. Admin reviews
   ↓
8. Admin exports (PDF/Excel/CSV)
   ↓
9. Download file
   → END
```

---

## Tax Compliance

### Philippine Tax Compliance (BIR)

**Withholding Tax Requirements:**

```
Form 1601-C (Monthly Remittance)
- Filed monthly (by 10th of next month)
- Reports all tax withheld from employees
- System generates report with all data

Form 2316 (Annual Certificate)
- Issued to each employee yearly
- Shows total income & tax withheld
- Required for employee's annual tax return (BIR Form 1700)

Form 1604-C (Annual Information Return)
- Filed annually (by Jan 31 of next year)
- Consolidated report of all employees
```

**System Support:**

```
Auto-calculate tax per BIR tables
Generate monthly reports
Generate annual certificates
Export in BIR-compliant formats

Admin can:
- Download all forms
- Print certificates
- Email to technicians
```

**SSS/PhilHealth/Pag-IBIG Compliance:**

```
Monthly contributions must be remitted
Each agency has specific deadlines
System generates contribution reports
Admin responsible for actual remittance

System provides:
- Contribution tables
- Monthly summaries
- Export formats
- Payment reminders
```

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_ADMIN.md` - Admin payroll management workflows
- `FLOW_TECHNICIAN.md` - Technician payslip viewing
- `FLOW_BOOKING.md` - Commission source (completed jobs)
- `API.md` - Payroll API endpoints
- `DATABASE_TABLES.md` - Payroll tables schema