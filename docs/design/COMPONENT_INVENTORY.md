# KJAC SYSTEM

# COMPONENT-INVENTORY.md

Version: 1.0

---

# Purpose

This document defines every reusable frontend component in the KJAC System.

Goals:

```text id="a1j7vf"
Consistency
Reusability
Maintainability
Scalability
Reduced Duplication
```

All frontend development must use components from this inventory before creating new ones.

---

# COMPONENT HIERARCHY

```text id="x6r4uq"
Shadcn UI

↓

KJAC Base Components

↓

Shared Components

↓

Module Components

↓

Pages
```

Rule:

```text id="7mtj04"
Pages should compose components.

Pages should not contain large amounts of UI logic.
```

---

# DIRECTORY STRUCTURE

```text id="39vybd"
src/components

├── ui/
├── layout/
├── shared/
├── forms/
├── tables/
├── charts/
├── feedback/
├── states/
├── navigation/
└── dashboard/
```

---

# LAYOUT COMPONENTS

Folder:

```text id="lx8nuh"
components/layout/
```

---

# AppShell

Purpose:

```text id="ulxf44"
Application root container.
```

Usage:

```tsx
<AppShell>{children}</AppShell>
```

---

# AdminSidebar

Purpose:

```text id="rj2n3y"
Primary admin navigation.
```

Features:

```text id="7tr4l8"
Collapsible
Desktop
Tablet
Mobile Drawer
Role Aware
```

---

# AdminTopbar

Contains:

```text id="6sx1un"
Breadcrumbs
Search
Notifications
Profile Menu
```

---

# PageContainer

Purpose:

```text id="bd1ap2"
Consistent page width and spacing.
```

---

# PageHeader

Props:

```ts
title;
description;
actions;
breadcrumbs;
```

---

# SectionHeader

Props:

```ts
title;
description;
action;
```

---

# ContentGrid

Variants:

```text id="n6fdri"
2 Columns

3 Columns

4 Columns
```

---

# SHARED COMPONENTS

Folder:

```text id="y4zjlwm"
components/shared/
```

---

# StatCard

Purpose:

Dashboard metrics.

Replaces:

```text id="z5b4ny"
RevenueCard

CustomerCard

BookingCard

PaymentCard

InventoryCard
```

Props:

```ts
title;
value;
icon;
trend;
change;
```

---

# StatusBadge

Purpose:

Unified status display.

Variants:

```text id="s6y0e0"
Pending

Confirmed

Assigned

Ongoing

Completed

Cancelled

Paid

Unpaid

Low Stock

Active

Inactive
```

---

# InfoCard

Purpose:

Generic information display.

Used By:

```text id="x55b7d"
Bookings

Customers

Technicians

Inventory
```

---

# DetailSection

Purpose:

Reusable details block.

Example:

```text id="49udlq"
Customer Information

Booking Information

Inventory Information
```

---

# MetadataRow

Displays:

```text id="ny0ov0"
Label
Value
```

Example:

```text id="0ozjcr"
Booking Reference
Customer Name
Status
```

---

# AvatarCard

Purpose:

Profile displays.

Used By:

```text id="6r1gzh"
Customers

Technicians

Users
```

---

# FORMS

Folder:

```text id="zj76b7"
components/forms/
```

---

# FormSection

Purpose:

Groups related form fields.

Example:

```text id="s6lxrj"
Customer Information
```

---

# FormField

Wrapper around:

```text id="bte7yu"
Label
Input
Description
Error
```

---

# SearchInput

Features:

```text id="2b3h7g"
Debounced Search
Clear Button
```

---

# DatePicker

Based On:

```text id="4a8eiu"
Shadcn Calendar
```

---

# AddressSelector

Purpose:

PSGC Integration.

Flow:

```text id="20qg41"
Region
Province
Municipality
Barangay
```

---

# FileUploader

Supports:

```text id="hnopvs"
Receipts

Booking Images

Documents
```

---

# PhoneInput

Purpose:

Philippine phone numbers.

---

# CurrencyInput

Purpose:

Payment values.

---

# TABLE SYSTEM

Folder:

```text id="bivq8s"
components/tables/
```

---

# DataTable

Core table.

Used Everywhere.

Supports:

```text id="k9grxv"
Sorting
Filtering
Pagination
Column Toggle
Search
Export
```

---

# TableToolbar

Contains:

```text id="uv3gfw"
Search
Filters
Actions
```

---

# TablePagination

Reusable pagination.

---

# TableFilters

Reusable filter panel.

---

# TableEmptyState

Shown when:

```text id="3y2bcm"
No data available.
```

---

# TABLE COLUMN SETS

Bookings

```text id="a4jfc5"
Reference
Customer
Service
Status
Date
Actions
```

Customers

```text id="a7bqzh"
Name
Phone
Bookings
Status
```

Technicians

```text id="e7vsvu"
Name
Assigned Jobs
Completed Jobs
Status
```

Inventory

```text id="9w92vx"
SKU
Item
Stock
Status
```

Payments

```text id="uyv0li"
Reference
Customer
Amount
Status
Date
```

---

# CHART SYSTEM

Folder:

```text id="x9rk79"
components/charts/
```

---

# ChartCard

Shared chart wrapper.

Props:

```ts
title;
description;
actions;
children;
```

---

# AreaChartCard

Used For:

```text id="p5r5oq"
Revenue Trends
```

---

# LineChartCard

Used For:

```text id="j4myl8"
Booking Trends
```

---

# BarChartCard

Used For:

```text id="vr1q5e"
Technician Performance
Service Distribution
```

---

# PieChartCard

Used For:

```text id="nlwqwl"
Status Breakdown
Inventory Usage
```

---

# DASHBOARD COMPONENTS

Folder:

```text id="a73h3v"
components/dashboard/
```

---

# KPISection

Contains:

```text id="3yt92l"
4 StatCards
```

---

# RevenueWidget

Contains:

```text id="9d2wz8"
Revenue Chart
```

---

# RecentBookingsWidget

Contains:

```text id="tlc3ml"
Latest bookings
```

---

# InventoryAlertWidget

Contains:

```text id="4eph6h"
Low stock items
```

---

# TechnicianActivityWidget

Contains:

```text id="9m8zk8"
Recent technician activity
```

---

# NAVIGATION COMPONENTS

Folder:

```text id="aqg8f6"
components/navigation/
```

---

# SidebarNav

Sidebar links.

---

# SidebarSection

Sidebar group.

Example:

```text id="3cd3n9"
Operations

Inventory

Business

System
```

---

# Breadcrumbs

Reusable breadcrumb.

---

# SearchCommand

Global search.

Future enhancement.

---

# ProfileMenu

Contains:

```text id="g39ng8"
Profile

Settings

Logout
```

---

# FEEDBACK COMPONENTS

Folder:

```text id="xoww6r"
components/feedback/
```

---

# ConfirmDialog

Used For:

```text id="btt8wg"
Delete
Cancel
Archive
```

---

# SuccessAlert

Reusable success state.

---

# ErrorAlert

Reusable error state.

---

# WarningAlert

Reusable warning state.

---

# STATES

Folder:

```text id="yrhl4w"
components/states/
```

---

# EmptyState

Props:

```ts
icon;
title;
description;
action;
```

Used Everywhere.

---

# CardSkeleton

Loading card.

---

# TableSkeleton

Loading table.

---

# ChartSkeleton

Loading chart.

---

# ProfileSkeleton

Loading profile.

---

# MODULE COMPONENTS

# Bookings Module

```text id="e99fr5"
BookingTimeline

BookingStatusCard

BookingDetailsCard

AssignTechnicianDialog

BookingCalendar
```

---

# Customers Module

```text id="v03lax"
CustomerProfileCard

CustomerStats

CustomerHistory
```

---

# Technicians Module

```text id="e3vtv0"
TechnicianProfileCard

TechnicianStats

AssignmentHistory
```

---

# Inventory Module

```text id="a54zci"
InventoryStats

MovementHistory

LowStockAlert
```

---

# Payments Module

```text id="14ghm7"
VerificationQueue

ReceiptViewer

PaymentHistory
```

---

# Reports Module

```text id="6c0afz"
ReportBuilder

ReportFilters

ExportPanel
```

---

# ICON STANDARDS

Library:

```text id="qjlwmx"
Lucide React
```

Examples:

```text id="q4m2xy"
LayoutDashboard
Calendar
Users
Wrench
Package
CreditCard
ChartBar
FileText
Bell
Settings
```

---

# TYPOGRAPHY COMPONENT RULES

Manrope:

```text id="f8b6a8"
Navigation
Headings
Body
Buttons
Forms
Tables
```

JetBrains Mono:

```text id="0y14j5"
Booking References

Invoice Numbers

Revenue Metrics

Statistics

Inventory SKU

Audit IDs
```

Never use JetBrains Mono in:

```text id="o2skht"
Sidebar

Menus

Forms

Buttons
```

---

# COMPONENT CREATION RULES

Before creating a component:

Check:

```text id="vpl3an"
Can an existing component be reused?
```

If yes:

```text id="s8j1ut"
Reuse.
```

If no:

```text id="7sdjlwm"
Create a new component.
```

Requirements:

```text id="c7m9kk"
Typed Props

Loading State

Error State

Responsive

Accessible
```

---

# COMPONENT INVENTORY SUCCESS CRITERIA

The component system is complete when:

```text id="b11h8z"
✓ Every page is built from reusable components

✓ No duplicate table implementations

✓ No duplicate chart implementations

✓ No duplicate status badges

✓ No duplicate KPI cards

✓ Consistent UX across modules

✓ All components follow DESIGN.md

✓ All screens defined in UI-DESIGN.md can be built using this inventory
```

This document is the authoritative component catalog for all KJAC frontend development.
