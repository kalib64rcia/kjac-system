# KJAC SYSTEM

# UI-DESIGN.md

## Complete Frontend UI/UX Blueprint

Version: 1.0

---

# Purpose

This document defines:

* Complete application sitemap
* Screen architecture
* Page layouts
* Responsive behavior
* Dashboard composition
* Form standards
* Table standards
* Shadcn component usage
* Empty states
* Loading states
* Error states
* Navigation structure
* User experience standards

This document is the primary UI/UX reference for frontend implementation.

Design tokens, colors, typography, spacing, radii, shadows, accessibility requirements, and responsive tokens must come from:

```text
DESIGN.md
```

UI-DESIGN.md defines structure.

DESIGN.md defines appearance.

---

# Technology Stack

Frontend:

```text
React
TypeScript
Tailwind CSS
Shadcn UI
TanStack Table
React Hook Form
Zod
Recharts
Axios
React Router
```

---

# Typography Rules

Primary Font:

```text
Manrope
```

Used For:

```text
Navigation
Headers
Buttons
Forms
Tables
Body Content
Cards
Dialogs
```

Technical Font:

```text
JetBrains Mono
```

Used Only For:

```text
Booking References
Invoice Numbers
Inventory SKUs
Revenue Figures
Statistics
Audit IDs
Technical Data
```

Never use JetBrains Mono for navigation.

---

# Application Sitemap

```text
Public
│
├── Home
├── Book Service
├── Booking Tracker
├── Login
├── Forgot Password
└── Reset Password

Admin
│
├── Dashboard
│
├── Bookings
│   ├── Booking List
│   ├── Booking Details
│   ├── Calendar View
│   └── Assignment View
│
├── Customers
│   ├── Customer List
│   ├── Customer Profile
│   └── Booking History
│
├── Technicians
│   ├── Technician List
│   ├── Technician Profile
│   ├── Assignments
│   └── Performance
│
├── Inventory
│   ├── Inventory List
│   ├── Inventory Details
│   ├── Stock In
│   ├── Stock Out
│   └── Stock Movement
│
├── Payments
│   ├── Verification Queue
│   ├── Payment Details
│   ├── Receipts
│   └── Refund Requests
│
├── Analytics
│
├── Reports
│
├── Notifications
│
├── Audit Logs
│
└── Settings
```

---

# ADMIN LAYOUT

## Desktop Layout

```text
┌──────────────┬────────────────────────────────────────────┐
│     LOGO     │ < Breadcrumbs     [Notification] [Profile] │
├──────────────|────────────────────────────────────────────┤
│              │                                            │
│              │                                            │
│   SIDEBAR    │                                            │
│              │              MAIN CONTENT                  │
│              │                                            │
│              │                                            │
│              │                                            │
│    Footer    │                                            │
└──────────────┴────────────────────────────────────────────┘
```

Sidebar width:

```text
280px
```

---

## Tablet Layout

```text
240px Sidebar
```

---

## Mobile Layout

```text
Sidebar Drawer
```

---

# SIDEBAR STRUCTURE

```text
Dashboard

OPERATIONS
├─ Bookings
├─ Customers
├─ Technicians
├─ Payments

INVENTORY
├─ Inventory

BUSINESS
├─ Analytics
├─ Reports

SYSTEM
├─ Notifications
├─ Audit Logs
├─ Settings
```

---

# TOP BAR

Minimal.

Contains:

```text
Breadcrumbs
Search
Notifications
Profile Menu
```

No primary navigation.

Sidebar is the primary navigation.

---

# DASHBOARD

## Layout

```text
┌──────────┬──────────┬──────────┬──────────┐
│ Revenue  │ Bookings │ Clients  │ Payments │
└──────────┴──────────┴──────────┴──────────┘

┌────────────────────┬────────────────────┐
│ Revenue Trend      │ Booking Trend      │
└────────────────────┴────────────────────┘

┌────────────────────┬────────────────────┐
│ Service Mix        │ Status Breakdown   │
└────────────────────┴────────────────────┘

┌─────────────────────────────────────────┐
│ Recent Bookings                         │
└─────────────────────────────────────────┘

┌────────────────────┬────────────────────┐
│ Technician Activity│ Inventory Alerts   │
└────────────────────┴────────────────────┘
```

---

# DASHBOARD COMPONENTS

KPI Cards

```text
Revenue
Bookings
Customers
Pending Payments
```

Charts

```text
Area Chart
Line Chart
Bar Chart
Pie Chart
```

Tables

```text
Recent Bookings
Recent Payments
```

---

# BOOKINGS PAGE

## Layout

```text
┌─────────────────────────────────────────┐
│ Booking Management                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Search │ Status │ Date │ Technician     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Booking Table                           │
└─────────────────────────────────────────┘
```

---

# BOOKING DETAILS

## Layout

```text
┌─────────────────────────────────────────┐
│ Booking Header                          │
└─────────────────────────────────────────┘

┌───────────────────┬─────────────────────┐
│ Customer          │ Actions             │
│ Service           │                     │
│ Payment           │                     │
│ Timeline          │                     │
└───────────────────┴─────────────────────┘
```

Sections:

```text
Booking Information
Customer Information
Service Information
Technician Assignment
Payment Verification
Booking Timeline
Audit Activity
```

---

# BOOKING CALENDAR

```text
┌─────────────────────────────────────────┐
│ Month Calendar                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Daily Booking Schedule                  │
└─────────────────────────────────────────┘
```

---

# CUSTOMER LIST

```text
┌─────────────────────────────────────────┐
│ Search │ Filters                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Customer Table                          │
└─────────────────────────────────────────┘
```

---

# CUSTOMER PROFILE

```text
┌─────────────────────────────────────────┐
│ Customer Header                         │
└─────────────────────────────────────────┘

┌───────────────────┬─────────────────────┐
│ Profile Details   │ Statistics          │
└───────────────────┴─────────────────────┘

┌─────────────────────────────────────────┐
│ Booking History                         │
└─────────────────────────────────────────┘
```

Statistics

```text
Total Bookings
Total Spend
Completed Services
Cancelled Services
```

---

# TECHNICIAN LIST

```text
┌─────────────────────────────────────────┐
│ Technician Table                        │
└─────────────────────────────────────────┘
```

---

# TECHNICIAN PROFILE

```text
┌─────────────────────────────────────────┐
│ Technician Header                       │
└─────────────────────────────────────────┘

┌───────────────────┬─────────────────────┐
│ Personal Info     │ Performance         │
└───────────────────┴─────────────────────┘

┌─────────────────────────────────────────┐
│ Assignment History                      │
└─────────────────────────────────────────┘
```

Metrics

```text
Completed Jobs
Success Rate
Average Rating
Current Assignments
```

---

# INVENTORY LIST

```text
┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Low      │ Stock In │ StockOut │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────┐
│ Inventory Table                         │
└─────────────────────────────────────────┘
```

---

# INVENTORY DETAILS

```text
┌─────────────────────────────────────────┐
│ Item Header                             │
└─────────────────────────────────────────┘

┌───────────────────┬─────────────────────┐
│ Item Details      │ Statistics          │
└───────────────────┴─────────────────────┘

┌─────────────────────────────────────────┐
│ Movement History                        │
└─────────────────────────────────────────┘
```

---

# STOCK IN

```text
Item
Quantity
Supplier
Date
Notes
```

---

# STOCK OUT

```text
Item
Quantity
Technician
Booking Reference
Reason
```

---

# PAYMENTS DASHBOARD

```text
┌──────────┬──────────┬──────────┬──────────┐
│ Revenue  │ Pending  │ Verified │ Refunds  │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────┐
│ Verification Queue                      │
└─────────────────────────────────────────┘
```

---

# PAYMENT DETAILS

```text
┌─────────────────────────────────────────┐
│ Payment Header                          │
└─────────────────────────────────────────┘

┌───────────────────┬─────────────────────┐
│ Payment Details   │ Actions             │
└───────────────────┴─────────────────────┘
```

Includes:

```text
Receipt Preview
Booking Information
Verification Notes
History
```

---

# ANALYTICS PAGE

```text
┌─────────────────────────────────────────┐
│ Analytics Dashboard                     │
└─────────────────────────────────────────┘

┌────────────────────┬────────────────────┐
│ Revenue Analytics  │ Booking Analytics  │
└────────────────────┴────────────────────┘

┌────────────────────┬────────────────────┐
│ Service Analytics  │ Customer Growth    │
└────────────────────┴────────────────────┘

┌────────────────────┬────────────────────┐
│ Inventory Usage    │ Technician Metrics │
└────────────────────┴────────────────────┘
```

---

# REPORTS PAGE

```text
┌─────────────────────────────────────────┐
│ Report Builder                          │
└─────────────────────────────────────────┘
```

Builder

```text
Report Type
Date Range
Filters
Export Format
Generate
```

Report Types

```text
Revenue
Bookings
Customers
Inventory
Technicians
Payments
```

Exports

```text
PDF
Excel
CSV
```

---

# NOTIFICATIONS

```text
System Notifications
Booking Notifications
Payment Notifications
Inventory Alerts
```

---

# AUDIT LOGS

Table

```text
Date
User
Action
Module
Affected Record
```

Filters

```text
Date
User
Module
Action
```

---

# SETTINGS

Sections

```text
Business Profile
System Settings
Notification Settings
Roles & Permissions
Users
Backup Settings
```

---

# PUBLIC WEBSITE

# HOME PAGE

## Structure

```text
Header

Hero

Trust Indicators

Services

Brands

Why Choose Us

Mission

Vision

Testimonials

FAQ

Contact

Footer
```

---

# HERO SECTION

```text
┌─────────────────────────────────────────┐
│ Professional Air Conditioning Solutions │
│ Trusted Brands                          │
│ Quality Installation                    │
│ Reliable After Sales                    │
│                                         │
│ [Book Service] [Track Booking]          │
└─────────────────────────────────────────┘
```

Background:

```text
Professional Aircon Installation Photo
```

---

# SERVICES SECTION

Grid

```text
Installation
Cleaning
Maintenance
Repair
Troubleshooting
Relocation
```

---

# BRANDS SECTION

Carousel

```text
Daikin
Carrier
Samsung
LG
Panasonic
Condura
```

---

# FAQ

Shadcn Accordion

---

# CONTACT

Layout

```text
┌────────────────────┬────────────────────┐
│ Contact Form       │ Business Info      │
└────────────────────┴────────────────────┘
```

---

# BOOK SERVICE PAGE

Sections

```text
Customer Information
Address
Service Information
Booking Schedule
Attachments
Review
Submit
```

---

# BOOKING TRACKER

```text
Reference Number Search
```

Result

```text
Booking Status
Timeline
Technician Assignment
Payment Status
```

Timeline

```text
Submitted
Pending
Confirmed
Assigned
Ongoing
Completed
```

---

# RESPONSIVE RULES

## Mobile

Cards stack vertically.

Tables become:

```text
Card View
```

Sidebar becomes:

```text
Drawer
```

Charts:

```text
Scrollable
```

---

## Tablet

2-column layouts.

Reduced sidebar.

---

## Desktop

Full layout.

---

# EMPTY STATES

Bookings

```text
No bookings found.
Create your first booking.
```

Customers

```text
No customers available.
```

Inventory

```text
No inventory items found.
```

Reports

```text
No reports generated yet.
```

---

# LOADING STATES

Use Shadcn Skeletons.

Never use spinners for full-page loading.

Skeletons required for:

```text
Tables
Cards
Charts
Profiles
Forms
```

---

# ERROR STATES

Card Layout

```text
Icon
Title
Description
Retry Button
```

Examples

```text
Failed to load bookings.
Failed to load analytics.
Failed to load inventory.
```

---

# SHADCN COMPONENT MAPPING

Layout

```text
Sidebar
Sheet
Separator
ScrollArea
```

Forms

```text
Form
Input
Textarea
Select
Combobox
Calendar
Checkbox
RadioGroup
Switch
```

Tables

```text
Table
TanStack Table
DropdownMenu
Pagination
```

Feedback

```text
Alert
Toast
Dialog
Sheet
Drawer
```

Data Display

```text
Card
Badge
Tabs
Accordion
Avatar
Tooltip
```

Navigation

```text
Breadcrumb
DropdownMenu
Command
NavigationMenu
```

Charts

```text
Recharts
```

---

# FINAL UX GOAL

The KJAC System should feel like a modern business operations platform used by a real air-conditioning company.

The public website should communicate trust, professionalism, and service quality.

The admin panel should prioritize efficiency, information density, speed of navigation, and operational visibility while remaining clean, modern, and fully aligned with the design tokens defined in DESIGN.md.
