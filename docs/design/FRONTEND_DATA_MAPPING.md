# KJAC SYSTEM

# FRONTEND-DATA-MAPPING.md

Version: 1.0

---

# Purpose

This document establishes the definitive mapping between:

```text id="m0j25n"
Database

↓

Backend Schemas

↓

API Endpoints

↓

Frontend Types

↓

React Query Hooks

↓

Components

↓

Pages
```

This document prevents:

```text id="2yo0qh"
Backend/Frontend Drift

Duplicate Types

Inconsistent Data Structures

Broken UI Contracts
```

This is the final architecture document before implementation.

---

# DATA FLOW STANDARD

Every feature follows:

```text id="m7ux3k"
Database

↓

Repository

↓

Service

↓

Schema

↓

API Endpoint

↓

Axios Service

↓

React Query Hook

↓

Component

↓

Page
```

Frontend must NEVER bypass this flow.

---

# AUTHENTICATION DOMAIN

## Backend Schemas

```text id="q5kpru"
LoginRequest

LoginResponse

UserResponse

ChangePasswordRequest

ForgotPasswordRequest

ResetPasswordRequest
```

---

## Frontend Types

```ts id="r8c0ml"
AuthUser

LoginPayload

LoginResponse

ResetPasswordPayload
```

---

## API Layer

```ts id="wcl8f6"
auth.api.ts
```

Functions:

```ts id="5hjhmh"
login()

logout()

me()

forgotPassword()

resetPassword()
```

---

## React Query

```ts id="0hvzmt"
useLogin()

useCurrentUser()

useLogout()
```

---

## Components

```text id="flhm6l"
LoginForm

ForgotPasswordForm

ResetPasswordForm
```

---

## Pages

```text id="twgf3l"
/login

/forgot-password

/reset-password
```

---

# BOOKINGS DOMAIN

Core business module.

---

## Database Tables

```text id="9djlwm"
bookings

booking_status_history

booking_attachments

technician_assignments

customers
```

---

## Backend Schemas

Based on booking.py

```text id="7ywvhv"
BookingCreate

BookingUpdate

BookingResponse

BookingListResponse

TrackResponse

CancelRequest

RescheduleRequest

AssignTechnicianRequest

TechStatusUpdate
```

---

## Frontend Types

```ts id="fjlwmk"
Booking

BookingListItem

BookingDetails

BookingStatus

BookingTimelineItem

BookingAssignment

BookingAttachment

TrackBookingResponse
```

---

## API Layer

```ts id="pobvzn"
booking.api.ts
```

Methods:

```ts id="0rxtta"
getBookings()

getBooking()

createBooking()

updateBooking()

cancelBooking()

rescheduleBooking()

assignTechnician()

trackBooking()
```

---

## React Query

```ts id="vb14c6"
useBookings()

useBooking()

useCreateBooking()

useUpdateBooking()

useCancelBooking()

useTrackBooking()
```

---

## Components

```text id="oyebih"
BookingTable

BookingFilters

BookingStatusBadge

BookingTimeline

BookingDetailsCard

AssignTechnicianDialog

BookingCalendar
```

---

## Pages

```text id="uhys91"
BookingsPage

BookingDetailsPage

BookingCalendarPage

PublicBookingPage

BookingTrackerPage
```

---

# CUSTOMERS DOMAIN

---

## Database Tables

```text id="hh2nqo"
customers

customer_addresses

customer_notes
```

---

## Backend Schemas

profile.py

```text id="sdtz3f"
CustomerResponse

CustomerProfileResponse
```

---

## Frontend Types

```ts id="khysj1"
Customer

CustomerProfile

CustomerStats

CustomerHistory
```

---

## API Layer

```ts id="jlwmkz"
customer.api.ts
```

Methods:

```ts id="2n2v2h"
getCustomers()

getCustomer()

updateCustomer()
```

---

## React Query

```ts id="j4w3xv"
useCustomers()

useCustomer()
```

---

## Components

```text id="qpnzbi"
CustomerTable

CustomerProfileCard

CustomerStats

CustomerBookingHistory
```

---

## Pages

```text id="qq93iu"
CustomersPage

CustomerProfilePage
```

---

# TECHNICIANS DOMAIN

---

## Database Tables

```text id="0yx5iw"
technicians

technician_assignments

attendance
```

---

## Backend Schemas

profile.py

booking.py

```text id="g2ow1n"
TechnicianResponse

AssignmentResponse
```

---

## Frontend Types

```ts id="1yj2a9"
Technician

TechnicianProfile

TechnicianPerformance

Assignment
```

---

## API Layer

```ts id="v3in0g"
technician.api.ts
```

Methods:

```ts id="8rqufy"
getTechnicians()

getTechnician()

assignBooking()
```

---

## React Query

```ts id="ojj03e"
useTechnicians()

useTechnician()
```

---

## Components

```text id="x0o78d"
TechnicianTable

TechnicianProfileCard

TechnicianStats

AssignmentHistory
```

---

## Pages

```text id="rwp8vn"
TechniciansPage

TechnicianProfilePage
```

---

# INVENTORY DOMAIN

---

## Database Tables

```text id="s1zj0l"
inventory_items

inventory_movements

suppliers
```

---

## Backend Schemas

inventory.py

```text id="pm0nb7"
InventoryItemResponse

InventoryMovementResponse

StockInRequest

StockOutRequest
```

---

## Frontend Types

```ts id="exiij4"
InventoryItem

InventoryMovement

LowStockItem

StockAdjustment
```

---

## API Layer

```ts id="lxg1yk"
inventory.api.ts
```

Methods:

```ts id="nytz0u"
getInventory()

getInventoryItem()

stockIn()

stockOut()
```

---

## React Query

```ts id="c1cvx2"
useInventory()

useInventoryItem()

useStockIn()

useStockOut()
```

---

## Components

```text id="aqbjlwm"
InventoryTable

InventoryStats

MovementHistory

LowStockAlert
```

---

## Pages

```text id="t50p4g"
InventoryPage

InventoryDetailsPage

StockInPage

StockOutPage
```

---

# PAYMENTS DOMAIN

---

## Database Tables

```text id="gvw6mw"
payments

receipts

refund_requests
```

---

## Backend Schemas

payment.py

```text id="ucmm2q"
PaymentResponse

PaymentVerificationRequest

ReceiptResponse
```

---

## Frontend Types

```ts id="2v9cxt"
Payment

Receipt

PaymentVerification

RefundRequest
```

---

## API Layer

```ts id="bcyihx"
payment.api.ts
```

Methods:

```ts id="vjlwmn"
getPayments()

getPayment()

verifyPayment()

rejectPayment()
```

---

## React Query

```ts id="1g8gdl"
usePayments()

usePayment()

useVerifyPayment()
```

---

## Components

```text id="1rn8e2"
VerificationQueue

ReceiptViewer

PaymentHistory

RefundRequests
```

---

## Pages

```text id="xxy8k9"
PaymentsPage

PaymentDetailsPage
```

---

# ANALYTICS DOMAIN

---

## Database Sources

Aggregated from:

```text id="vpc0vn"
bookings

customers

payments

inventory

technicians
```

---

## Backend Schemas

analytics.py

```text id="t16e3l"
DashboardSummaryResponse

RevenueAnalyticsResponse

BookingAnalyticsResponse

TechnicianAnalyticsResponse
```

---

## Frontend Types

```ts id="0mtjlwm"
DashboardSummary

RevenueMetrics

BookingMetrics

TechnicianMetrics

InventoryMetrics
```

---

## API Layer

```ts id="mejzws"
analytics.api.ts
```

Methods:

```ts id="53t7dy"
getDashboardSummary()

getRevenueAnalytics()

getBookingAnalytics()

getTechnicianAnalytics()
```

---

## React Query

```ts id="cr1yku"
useDashboardSummary()

useRevenueAnalytics()

useBookingAnalytics()
```

---

## Components

```text id="wt6qsp"
StatCard

RevenueChart

BookingChart

StatusBreakdownChart

InventoryAlertWidget
```

---

## Pages

```text id="4a7gqo"
DashboardPage

AnalyticsPage
```

---

# NOTIFICATIONS DOMAIN

---

## Backend Schemas

notification.py

```text id="q63rso"
NotificationResponse
```

---

## Frontend Types

```ts id="6l07vf"
Notification
```

---

## API Layer

```ts id="6yzylo"
notification.api.ts
```

Methods:

```ts id="zwkq9f"
getNotifications()

markAsRead()
```

---

## Components

```text id="h11pfq"
NotificationList

NotificationItem
```

---

## Pages

```text id="4w9shd"
NotificationsPage
```

---

# SETTINGS DOMAIN

---

## Backend Schemas

settings.py

```text id="l6mlrc"
BusinessSettingsResponse

SystemSettingsResponse
```

---

## Frontend Types

```ts id="4dtjlwm"
BusinessSettings

SystemSettings
```

---

## API Layer

```ts id="zhqftg"
settings.api.ts
```

Methods:

```ts id="8ay0i7"
getSettings()

updateSettings()
```

---

## Components

```text id="ucjlwm"
BusinessProfileForm

SystemSettingsForm

NotificationSettingsForm
```

---

## Pages

```text id="7rb6xh"
SettingsPage
```

---

# REPORTS DOMAIN

---

## Data Sources

```text id="n86zk7"
Bookings

Payments

Customers

Inventory

Technicians
```

---

## Frontend Types

```ts id="4mw7u4"
Report

ReportFilter

GeneratedReport
```

---

## API Layer

```ts id="7xv0ef"
report.api.ts
```

Methods:

```ts id="jpbjlwm"
generateReport()

downloadReport()
```

---

## Components

```text id="jnbf5g"
ReportBuilder

ReportFilters

ExportPanel
```

---

## Pages

```text id="z1uz5q"
ReportsPage
```

---

# GLOBAL TYPE ORGANIZATION

Folder:

```text id="l3iqhq"
src/types/
```

Structure:

```text id="rjlwmu"
auth.types.ts

booking.types.ts

customer.types.ts

technician.types.ts

inventory.types.ts

payment.types.ts

analytics.types.ts

notification.types.ts

settings.types.ts

report.types.ts
```

---

# QUERY KEY STANDARD

Folder:

```text id="3clmyj"
src/constants/queryKeys.ts
```

Example:

```ts id="3c7xfq"
bookings.all

bookings.detail(id)

customers.all

inventory.all

payments.all
```

---

# FINAL IMPLEMENTATION RULE

Every new feature must define:

```text id="wk5h1v"
Database Source

Backend Schema

Frontend Type

API Service

React Query Hook

Component

Page
```

before implementation begins.

---

# PROJECT STATUS

After this document, frontend planning is considered complete.

Remaining work:

```text id="s0l3ko"
Build Foundation

Build Shared Components

Build Public Website

Build Admin Layout

Build Business Modules

Integrate APIs

Testing

Deployment
```

This document is the final contract connecting the KJAC backend implementation to the React frontend implementation.
