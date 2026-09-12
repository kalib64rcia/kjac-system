# KJAC SYSTEM

# FRONTEND-ARCHITECTURE.md

Version: 1.0

---

# Purpose

This document defines the official frontend architecture for the KJAC System.

It establishes:

* Folder structure
* Routing architecture
* State management
* API architecture
* Authentication
* Authorization
* Component architecture
* Data flow
* Form standards
* Table standards
* Chart standards
* Error handling
* Coding standards

This document is the technical blueprint that frontend developers must follow.

---

# Architecture Goals

The frontend must be:

```text id="lgf2k4"
Scalable
Maintainable
Reusable
Type Safe
Responsive
Secure
Performant
Modular
```

---

# Technology Stack

Core:

```text id="t7yr0r"
React
TypeScript
Vite
React Router
```

UI:

```text id="i8jqg6"
Shadcn UI
Tailwind CSS
Lucide React
```

Data:

```text id="9uc9ca"
Axios
TanStack Query
```

State:

```text id="fmb23h"
Zustand
```

Forms:

```text id="x1l2al"
React Hook Form
Zod
```

Tables:

```text id="l89qwj"
TanStack Table
```

Charts:

```text id="j9i2ns"
Recharts
```

Utilities:

```text id="7k7q78"
clsx
tailwind-merge
date-fns
```

---

# Frontend Directory Structure

```text id="zyu7gx"
src/

├── app/
│
├── routes/
│
├── providers/
│
├── layouts/
│
├── pages/
│
├── modules/
│
├── components/
│
├── api/
│
├── stores/
│
├── hooks/
│
├── types/
│
├── schemas/
│
├── constants/
│
├── utils/
│
├── lib/
│
├── assets/
│
└── styles/
```

---

# App Layer

Folder:

```text id="5p75xa"
src/app/
```

Contains:

```text id="3w7zdj"
App.tsx
Providers.tsx
Router.tsx
```

Purpose:

Application bootstrap.

---

# Routing Layer

Folder:

```text id="jjsj6t"
src/routes/
```

Files:

```text id="fg53b8"
index.tsx

public.routes.tsx

auth.routes.tsx

admin.routes.tsx
```

---

# Route Groups

Public

```text id="7d6x11"
/

/book

/track
```

Authentication

```text id="4kdlp8"
/login

/forgot-password

/reset-password
```

Admin

```text id="ggsl9u"
/admin/*
```

---

# Route Guards

## PublicRoute

Accessible by everyone.

---

## AuthRoute

Only unauthenticated users.

Example:

```text id="h72fr4"
/login
```

---

## ProtectedRoute

Requires authentication.

---

## RoleRoute

Requires specific role.

Example:

```text id="2j7d4h"
Admin
```

---

# Layout Architecture

Folder:

```text id="v7d25r"
layouts/
```

---

## PublicLayout

Used by:

```text id="ysypd5"
Home

Book Service

Booking Tracker
```

Contains:

```text id="x8q1ul"
Header

Footer

Scroll Progress

Scroll To Top
```

---

## AuthLayout

Used by:

```text id="z5ru49"
Login

Reset Password
```

---

## AdminLayout

Used by:

```text id="ew4alj"
All admin screens
```

Contains:

```text id="2tztw8"
Sidebar

Topbar

Breadcrumbs

Main Content

Footer
```

---

# Module Architecture

Feature-first.

Folder:

```text id="yn4ptn"
modules/
```

---

Example:

```text id="bhsv3o"
modules/bookings/
```

Structure:

```text id="3pn53l"
bookings/

├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── utils/
```

---

# Available Modules

```text id="pq5n89"
bookings

customers

technicians

inventory

payments

analytics

reports

notifications

settings
```

---

# API Architecture

Folder:

```text id="sy7jkn"
src/api/
```

---

# Axios

Create:

```text id="0w9uhh"
axios.ts
```

Responsibilities:

```text id="d6kq9o"
Base URL

Authentication Headers

Error Handling

Token Injection

Response Interceptors
```

---

# API Services

Example:

```text id="4o7z9h"
booking.api.ts
```

Responsibilities:

```text id="hcf3n7"
Fetch Bookings

Fetch Booking Details

Create Booking

Update Booking

Assign Technician
```

---

Rule:

API files NEVER contain UI logic.

---

# TanStack Query

Use for:

```text id="9r6vxt"
Server Data
```

Examples:

```text id="1g6n2n"
Bookings

Customers

Inventory

Reports
```

---

Rule:

Never store server data in Zustand.

---

# Zustand

Use for:

```text id="1n0m1s"
UI State
```

Examples:

```text id="spdd9s"
Sidebar State

Theme State

Modal State

Filters

Search
```

---

Never use Zustand for:

```text id="f8y8iu"
API Data
```

---

# Authentication Architecture

Auth Source:

```text id="8a9r3q"
Backend JWT
```

Storage:

```text id="1sq8wl"
HttpOnly Cookie Preferred

Fallback:
Secure Local Storage
```

---

# Auth Store

Store:

```text id="azhewn"
auth.store.ts
```

Contains:

```text id="7n4n5w"
User

Role

Permissions

isAuthenticated
```

---

# Role System

Roles:

```text id="6b2t3g"
Admin

Technician

Customer
```

---

# Permission Checks

Example:

```text id="wyiv1g"
Can View Inventory

Can Manage Inventory

Can Verify Payments
```

---

# Form Architecture

Folder:

```text id="dh9h4o"
components/forms/
```

---

# Standard Stack

```text id="nynfzg"
React Hook Form

Zod
```

---

Pattern:

```text id="h05v6u"
Schema

Form

Validation

Submission
```

---

Rule:

Every form must have:

```text id="9v8qg0"
Client Validation

Server Validation

Error State

Loading State
```

---

# Table Architecture

Folder:

```text id="7u6oww"
components/tables/
```

---

Core Table

```text id="djlwmc"
DataTable.tsx
```

---

Features

```text id="mlwwfx"
Search

Sort

Filter

Pagination

Column Visibility

Export
```

---

Used By

```text id="kgx30x"
Bookings

Customers

Technicians

Inventory

Payments

Reports

Audit Logs
```

---

# Chart Architecture

Folder:

```text id="6k4dbn"
components/charts/
```

---

Base Components

```text id="8gx6q8"
AreaChartCard

LineChartCard

BarChartCard

PieChartCard
```

---

Used By

```text id="9iw4to"
Dashboard

Analytics

Reports
```

---

# Component Architecture

Structure:

```text id="w6s3k8"
components/

ui/

shared/

forms/

tables/

charts/
```

---

# UI Components

Only:

```text id="zzrdyu"
Shadcn UI
```

No custom button systems.

No custom form systems.

---

# Shared Components

Examples:

```text id="uk58ek"
PageHeader

StatCard

EmptyState

LoadingCard

StatusBadge

SectionHeader
```

---

# State Management Flow

```text id="r7mjlwm"
Backend

↓

Axios

↓

TanStack Query

↓

Page

↓

Component
```

---

UI State

```text id="s7u5aq"
Zustand

↓

Component
```

---

# Error Handling

API Errors

Handled by:

```text id="f90x8j"
Axios Interceptor
```

---

UI Errors

Display:

```text id="2e8vhs"
Alert

Toast

Inline Error
```

---

Page Errors

Display:

```text id="w9m4rj"
Error State Card
```

---

# Loading Architecture

Use:

```text id="3cb0j2"
Skeleton
```

Never:

```text id="4m4v86"
Full Page Spinner
```

except initial app boot.

---

# Empty State Architecture

Reusable Component:

```text id="vjlwmr"
EmptyState.tsx
```

Props:

```text id="w6m4o9"
Icon

Title

Description

Action
```

---

# File Upload Architecture

Component:

```text id="d3rk8v"
FileUploader.tsx
```

Supports:

```text id="ngpcu2"
Images

Receipts

Attachments
```

---

# Address Architecture

Component:

```text id="j4wni4"
AddressSelector.tsx
```

Data Source:

```text id="lwjhqs"
PSGC API
```

Flow:

```text id="dvsr5i"
Region

Province

City

Barangay
```

---

# Notification Architecture

Types:

```text id="v1d4a4"
Success

Warning

Error

Info
```

Component:

```text id="gjpp7a"
Toast
```

---

# Coding Standards

Use:

```text id="n11n1v"
TypeScript Strict Mode
```

---

Components:

```text id="q26ch0"
PascalCase
```

---

Hooks:

```text id="st6e5n"
useSomething
```

---

Stores:

```text id="klk31k"
something.store.ts
```

---

Types:

```text id="7ctu4f"
something.types.ts
```

---

Schemas:

```text id="xxvxzy"
something.schema.ts
```

---

# Performance Rules

Use:

```text id="eyrx7f"
React.lazy

Code Splitting

Memoization
```

when necessary.

---

Avoid:

```text id="mby1nt"
Premature Optimization
```

---

# Accessibility Rules

Required:

```text id="nljlwm"
Keyboard Navigation

Visible Focus States

Proper Labels

ARIA Support
```

Follow standards already defined in DESIGN.md.

---

# Testing Strategy

Component Tests

```text id="afibpq"
Forms

Tables

Utilities
```

---

Integration Tests

```text id="9k4i95"
Booking Flow

Authentication

Payments
```

---

# Architecture Success Criteria

The architecture is considered complete when:

```text id="plaqs4"
✓ Every screen maps to a module

✓ No duplicated business logic

✓ No duplicated table systems

✓ No duplicated chart systems

✓ No duplicated form systems

✓ Authentication centralized

✓ Permissions centralized

✓ API layer centralized

✓ UI components reusable

✓ DESIGN.md tokens consistently applied
```

This architecture must be followed before implementing any frontend screen.
