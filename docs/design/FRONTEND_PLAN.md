# KJAC SYSTEM FRONTEND IMPLEMENTATION HANDOFF

## Project Context

This is the KJAC (Klein & Justin Airconditioning) capstone project.

Business:

```text
Klein & Justin Airconditioning

Tagline:
Provide Air Solutions | Trusted Brands | Quality Installation | Reliable After Sales!

Address:
060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna

Phone:
0926-633-3129

Partner Brand:
Daikin
```

Research Title:

```text
Development of an Integrated Web and Mobile-Based Air Conditioning Service Management, Appointment Scheduling, and Inventory Management System for Klein & Justin Airconditioning
```

---

# Current Architecture

## Backend

Already implemented.

Stack:

```text
FastAPI
PostgreSQL
SQLAlchemy
Pydantic Schemas
JWT Authentication
```

Existing backend folders:

```text
backend/

schemas/
auth.py
booking.py
inventory.py
payment.py
analytics.py
notification.py
profile.py
settings.py
rating.py
payroll.py
```

Backend is NOT the current priority.

---

## Mobile

Exists.

Not the current priority.

---

## Frontend

Current status:

```text
Frontend is mostly a foundation.

Needs full implementation.
```

Current frontend stack:

```text
React
TypeScript
Vite
```

Target stack:

```text
React
TypeScript
Vite

React Router
TanStack Query
Axios
Zustand

React Hook Form
Zod

TanStack Table

Recharts

Shadcn UI

Tailwind CSS

Lucide React
```

---

# IMPORTANT DESIGN DECISIONS

## UI Library

Chosen:

```text
Shadcn UI
```

Not:

```text
TailAdmin

Filament
```

Reason:

```text
Modern
Clean
Professional
Premium
Flexible
```

---

## Design Style

Goal:

```text
Premium Air Conditioning Company
```

Not:

```text
Generic SaaS

Generic Admin Template

Generic CRM
```

Feel:

```text
Modern
Professional
Clean
Corporate
Premium
Trustworthy
```

---

## Typography

Navigation:

```text
Manrope
```

Headings:

```text
Manrope
```

Body:

```text
Manrope
```

Forms:

```text
Manrope
```

Buttons:

```text
Manrope
```

Statistics:

```text
JetBrains Mono
```

Examples:

```text
Booking References

Revenue

Invoice Numbers

Inventory SKU

System IDs
```

Never use JetBrains Mono in:

```text
Sidebar
Navigation
Forms
Buttons
```

---

## Color System

IMPORTANT:

Use exact values from:

```text
DESIGN.md
```

Do NOT invent colors.

Do NOT replace tokens.

Use only approved design tokens.

---

# Documentation Already Completed

Completed:

```text
DESIGN.md

UI-DESIGN.md

FRONTEND-ARCHITECTURE.md

FRONTEND-IMPLEMENTATION.md

COMPONENT-INVENTORY.md

FRONTEND-DATA-MAPPING.md
```

No more planning documents should be created.

Documentation phase is finished.

---

# Architecture Decisions

## State Management

Server Data:

```text
TanStack Query
```

UI State:

```text
Zustand
```

Never:

```text
Store API data inside Zustand
```

---

## Forms

Use:

```text
React Hook Form

Zod
```

For:

```text
Validation

Type Safety

Reusable Forms
```

---

## Tables

Use:

```text
TanStack Table
```

Single reusable:

```text
DataTable
```

Used everywhere.

---

## Charts

Use:

```text
Recharts
```

Single reusable wrappers:

```text
AreaChartCard

LineChartCard

BarChartCard

PieChartCard
```

---

# Admin Layout Requirements

Sidebar must be dominant.

Not topbar dominant.

Layout:

```text
┌──────────┬──────────────────────────┐
│ Sidebar  │ Topbar                   │
│          ├──────────────────────────┤
│          │ Page Content             │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

Sidebar contains:

```text
Dashboard

Bookings

Customers

Technicians

Inventory

Payments

Analytics

Reports

Notifications

Settings
```

---

# Public Website Requirements

Single-page landing page.

Sections:

```text
Hero

About

Services

Brands

Why Choose Us

Mission

Vision

Testimonials

FAQ

Contact
```

Requirements:

```text
Premium Hero

Real Hero Banner

Brand Carousel

Scroll Progress

Scroll To Top

Smooth Navigation
```

No placeholder-looking design.

No generic template appearance.

---

# Core Business Modules

Priority order:

## 1

Bookings

Most important module.

Everything revolves around bookings.

---

## 2

Customers

---

## 3

Technicians

---

## 4

Inventory

---

## 5

Payments

---

## 6

Analytics

---

## 7

Reports

---

## 8

Settings

---

# Backend → Frontend Mapping

Already established.

Use:

```text
Backend Schemas

↓

Frontend Types

↓

API Services

↓

React Query Hooks

↓

Components

↓

Pages
```

Do not create duplicate types.

Frontend types should mirror backend schemas.

---

# Component Rules

Must use reusable components.

Examples:

```text
StatCard

StatusBadge

PageHeader

DataTable

ChartCard

EmptyState
```

Avoid:

```text
BookingCard
CustomerCard
InventoryCard
```

when a shared component can be reused.

---

# Immediate Next Task

DO NOT create more markdown documents.

Start implementation.

---

# Sprint 1 (Current Objective)

Build frontend foundation only.

Create:

```text
src/

app/
routes/
providers/
layouts/

api/
hooks/
stores/
types/

components/
modules/
```

Implement:

```text
React Router

TanStack Query

Axios

Zustand

Theme Provider

Auth Provider
```

Build layouts:

```text
PublicLayout

AuthLayout

AdminLayout
```

Create:

```text
Home Page Placeholder

Login Page

Dashboard Placeholder
```

Ensure navigation works.

Do NOT build business modules yet.

---

# Sprint 2

Build reusable design system.

Components:

```text
PageHeader

StatCard

StatusBadge

EmptyState

DataTable

ChartCard

Skeleton Components
```

---

# Sprint 3

Build public website.

Pages:

```text
Home

Book Service

Booking Tracker
```

---

# Sprint 4

Build authentication.

Pages:

```text
Login

Forgot Password

Reset Password
```

Protected routes.

---

# Sprint 5

Build admin shell.

Components:

```text
Sidebar

Topbar

Breadcrumbs
```

---

# Sprint 6

Build dashboard.

Use analytics endpoints.

Implement:

```text
KPIs

Revenue Chart

Booking Chart

Recent Bookings

Inventory Alerts
```

---

# Sprint 7

Build bookings module.

This is the first complete business module.

Implement:

```text
Booking List

Booking Details

Booking Timeline

Booking Assignment

Booking Calendar
```

---

# Final Instruction

The project has reached the point where implementation provides more value than additional planning.

The next session should:

```text
1. Audit frontend folder

2. Install missing dependencies

3. Create architecture folders

4. Configure routing

5. Configure providers

6. Build layouts

7. Start Sprint 1 implementation
```

Do not spend time generating additional design, architecture, planning, or documentation files unless a major requirement changes.
