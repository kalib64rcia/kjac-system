# KJAC System - Agent Reference Guide

This document serves as a master navigation for all system agents, their roles, responsibilities, and associated documentation files.

backend/ - FastAPI & Supabase connections and core business logic
frontend/ - React + Typescript with Tailwind Web
mobile/ - Flutter

---

## System Overview

**Klein & Justin Airconditioning (KJAC)** is an integrated web and mobile-based air conditioning service management system with three main applications:

1. **Web Admin Panel** - Full business management dashboard
2. **Web Public Site** - Landing page and guest booking portal
3. **Mobile App (Flutter)** - Unified app for customers and technicians with role-based access

---

## Agent Roles & Access

### 1. **Admin** (Web Application)
**Access Level:** Full system control  
**Platform:** Web browser  
**Authentication:** Username/Email + Password + 2FA

**Primary Responsibilities:**
- Manage all bookings and appointments
- Assign and schedule technicians
- Verify payments and process refunds
- Manage customer and technician accounts
- Configure system settings and business rules
- Generate reports and analytics
- Handle inventory and stock management
- Process payroll for employees
- Monitor audit logs
- Communicate with customers and technicians

**Related Documentation:**
- [`docs/flows/FLOW_ADMIN.md`](docs/flows/FLOW_ADMIN.md) - Admin workflows
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md) - Admin UI/UX specifications (Web Admin section)
- [`docs/api/API.md`](docs/api/API.md) - Admin API endpoints
- [`docs/database/DATABASE_TABLES.md`](docs/database/DATABASE_TABLES.md) - Admin table access

**Key Features:**
- Dashboard with real-time analytics
- CRUD operations for all entities
- Dispatch and scheduling calendar
- Payment verification system
- Report generation (PDF, Excel)
- Audit log viewer (read-only)
- Chat system (admin-to-customer, admin-to-technician)
- Archive management (30-day auto-deletion)

---

### 2. **Customer** (Mobile Application)
**Access Level:** Limited to own data  
**Platform:** Flutter mobile app (iOS/Android)  
**Authentication:** Email + Password (with magic link verification)

**Primary Responsibilities:**
- Create and manage bookings
- Upload payment receipts
- Track booking status
- Rate and review technicians
- Manage personal profile
- View service history
- Receive push notifications

**Related Documentation:**
- [`docs/flows/FLOW_CUSTOMER.md`](docs/flows/FLOW_CUSTOMER.md) - Customer workflows
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md) - Customer mobile UI/UX (Mobile section)
- [`docs/api/API.md`](docs/api/API.md) - Customer API endpoints
- [`docs/database/DATABASE_TABLES.md`](docs/database/DATABASE_TABLES.md) - Customer table access

**Key Features:**
- Self-registration with email verification
- Profile management (address required before booking)
- Booking creation with calendar picker
- Payment upload (GCash receipt)
- Real-time booking status updates
- Technician rating system (1-5 stars + review)
- Service history viewer
- Push notifications
- View promotions and offers

**Account Requirements Before First Booking:**
- ✓ Verified email
- ✓ Complete profile (first name, last name, email, phone)
- ✓ Primary address with landmark

---

### 3. **Technician** (Mobile Application)
**Access Level:** Limited to assigned jobs  
**Platform:** Flutter mobile app (iOS/Android)  
**Authentication:** Technician ID/Email + Password

**Primary Responsibilities:**
- View assigned appointments
- Update job status (On the way, Arrived, Start service, Complete)
- View scheduled jobs calendar
- Communicate with admin
- View personal performance metrics
- Manage profile (pending admin approval)

**Related Documentation:**
- [`docs/flows/FLOW_TECHNICIAN.md`](docs/flows/FLOW_TECHNICIAN.md) - Technician workflows
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md) - Technician mobile UI/UX (Mobile section)
- [`docs/api/API.md`](docs/api/API.md) - Technician API endpoints
- [`docs/database/DATABASE_TABLES.md`](docs/database/DATABASE_TABLES.md) - Technician table access

**Key Features:**
- Self-registration (requires admin approval)
- Today's appointments dashboard
- Job status updates
- Performance metrics (total jobs, success rate, ratings)
- View customer location on map
- Request profile changes (admin approval required)
- Push notifications
- Help center and admin contact

**Account Creation:**
- Admin creates account with auto-generated password
- Credentials sent to technician's email
- Must change password on first login
- Profile edits require admin approval (except profile picture)

---

### 4. **Guest/Public User** (Web Application)
**Access Level:** Public pages only  
**Platform:** Web browser  
**Authentication:** None required

**Primary Responsibilities:**
- Browse business information
- View services and brands
- Create walk-in bookings
- Track booking status via reference ID
- Upload payment receipts

**Related Documentation:**
- [`docs/flows/FLOW_GUEST.md`](docs/flows/FLOW_GUEST.md) - Guest user workflows
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md) - Public web UI/UX (Web section)
- [`docs/api/API.md`](docs/api/API.md) - Public API endpoints

**Accessible Pages:**
- `/` - Home/landing page
- `/booking` - Appointment booking form
- `/booking/status` - Track booking with reference ID
- All informational sections (about, services, brands, FAQs, etc.)

---

## Agent Communication Matrix

| From ↓ To → | Admin | Customer | Technician | Guest |
|------------|-------|----------|------------|-------|
| **Admin** | N/A | ✅ Chat | ✅ Chat | ❌ |
| **Customer** | ✅ Chat | N/A | ❌ | N/A |
| **Technician** | ✅ Chat | ❌ | N/A | N/A |
| **Guest** | ❌ | N/A | N/A | N/A |

**Communication Types:**
- **Per-booking chat:** Threaded messages specific to a booking
- **General messages:** Direct communication between admin and users

---

## Cross-Reference Documentation Map

### **Core Business Logic**
- [`docs/PRD.md`](docs/PRD.md) - Product Requirements Document
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) - Business policies and rules

### **Design System**
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md) - Complete UI/UX design specifications

### **Database Architecture**
- [`docs/database/DATABASE.md`](docs/database/DATABASE.md) - Database overview
- [`docs/database/DATABASE_TABLES.md`](docs/database/DATABASE_TABLES.md) - Complete table schemas
- [`docs/database/DATABASE_RULES.md`](docs/database/DATABASE_RULES.md) - Column ordering and RLS policies

### **API Documentation**
- [`docs/api/API.md`](docs/api/API.md) - Complete FastAPI endpoint documentation

### **Workflow Documentation**
- [`docs/flows/FLOW_AUTH.md`](docs/flows/FLOW_AUTH.md) - Authentication flows
- [`docs/flows/FLOW_BOOKING.md`](docs/flows/FLOW_BOOKING.md) - Booking and payment flows
- [`docs/flows/FLOW_ADMIN.md`](docs/flows/FLOW_ADMIN.md) - Admin management workflows
- [`docs/flows/FLOW_CUSTOMER.md`](docs/flows/FLOW_CUSTOMER.md) - Customer workflows
- [`docs/flows/FLOW_TECHNICIAN.md`](docs/flows/FLOW_TECHNICIAN.md) - Technician workflows
- [`docs/flows/FLOW_GUEST.md`](docs/flows/FLOW_GUEST.md) - Guest user workflows
- [`docs/flows/FLOW_NOTIFICATION.md`](docs/flows/FLOW_NOTIFICATION.md) - Push notification flows
- [`docs/flows/FLOW_INVENTORY.md`](docs/flows/FLOW_INVENTORY.md) - Inventory management flows
- [`docs/flows/FLOW_PAYROLL.md`](docs/flows/FLOW_PAYROLL.md) - Payroll processing flows

---

## Security & Data Access Rules

### **Role-Based Access Control (RBAC)**

#### Admin Access:
- **Full CRUD** on all tables
- Can view audit logs (read-only)
- Can restore from archive (within 30 days)
- Can configure rate limits and system settings

#### Customer Access:
- **Read:** Own profile, own bookings, own service history
- **Create:** Bookings, ratings/reviews, messages
- **Update:** Own profile (doesn't affect pending bookings)
- **Delete:** Cannot delete own account (must contact admin)

#### Technician Access:
- **Read:** Own profile, assigned jobs, own performance metrics
- **Update:** Job status, own profile (requires admin approval)
- **Create:** Messages to admin
- **Delete:** Cannot delete anything

#### Guest Access:
- **Read:** Public pages, own booking status (via reference ID)
- **Create:** Walk-in bookings
- **Update:** Upload payment for own booking
- No access to other operations

### **Data Isolation Rules**
1. Customers can only access their own booking data
2. Technicians can only see assigned appointments
3. Changing profile info doesn't affect pending/ongoing bookings
4. Archived data is soft-deleted and auto-purged after 30 days
5. Audit logs are immutable and admin-viewable only

---

## Session Management

### **Web Admin**
- Session timeout: 30 minutes of inactivity (configurable)
- 2FA required on every login
- Remember device option (30 days)
- Force logout on password change

### **Mobile App (Customer & Technician)**
- Persistent login with refresh tokens
- Biometric authentication option (Face ID, Touch ID)
- Force re-authentication on sensitive actions
- Push notification token refresh on login

### **Guest (Web)**
- No session management
- Booking tracking via reference ID only

---

## Rate Limiting & Security

### **Login Attempts**
- **5 failed attempts per 15 minutes** → Account temporarily locked
- Cooldown period: 15 minutes
- Email notification on account lockout

### **Booking Creation**
- **3 bookings per 30 minutes per user/IP** (configurable by admin)
- Prevents spam and abuse
- Cloudflare Turnstile CAPTCHA on web bookings

### **API Rate Limits**
- **Public endpoints:** 100 requests/minute per IP
- **Authenticated endpoints:** 300 requests/minute per user
- **Admin endpoints:** 500 requests/minute per admin

---

## Notification Triggers by Agent

### **Admin Receives:**
- 🔔 New booking submitted
- 💰 Payment receipt uploaded
- 📍 Technician location updated
- 💬 New customer/technician message
- ⚠️ System alerts (low inventory, expiring bookings)

### **Customer Receives:**
- ✅ Booking confirmed
- 👤 Technician assigned
- 🚗 Technician on the way
- 🏁 Service completed
- ⭐ Rating request
- 💬 New admin message
- ⏰ Booking expiring soon (no payment)

### **Technician Receives:**
- 📋 New job assigned
- 📅 Schedule changed
- 💬 New admin message
- ⚠️ Upcoming appointment reminder

---

## File Structure Navigation

```
kjac-system/
├── backend/           → FastAPI application (all business logic)
├── frontend/          → React web application (admin + public)
├── mobile/            → Flutter application (customer + technician)
├── docs/
│   ├── PRD.md
│   ├── BUSINESS_RULES.md
│   ├── design/
│   │   └── DESIGN.md
│   ├── database/
│   │   ├── DATABASE.md
│   │   ├── DATABASE_TABLES.md
│   │   └── DATABASE_RULES.md
│   ├── api/
│   │   └── API.md
│   └── flows/
│       ├── FLOW_AUTH.md
│       ├── FLOW_BOOKING.md
│       ├── FLOW_ADMIN.md
│       ├── FLOW_CUSTOMER.md
│       ├── FLOW_TECHNICIAN.md
│       ├── FLOW_GUEST.md
│       ├── FLOW_NOTIFICATION.md
│       ├── FLOW_INVENTORY.md
│       └── FLOW_PAYROLL.md
└── AGENTS.md          → This file
```

---

## Quick Reference: Who Can Do What?

| Action | Admin | Customer | Technician | Guest |
|--------|-------|----------|------------|-------|
| Create booking | ✅ | ✅ | ❌ | ✅ |
| Upload payment | ✅ | ✅ | ❌ | ✅ |
| Assign technician | ✅ | ❌ | ❌ | ❌ |
| Update job status | ✅ | ❌ | ✅ | ❌ |
| Cancel booking | ✅ | ✅ | ❌ | ✅ |
| Request reschedule | ✅ | ✅ | ❌ | ✅ |
| Rate service | ❌ | ✅ | ❌ | ❌ |
| Manage inventory | ✅ | ❌ | ❌ | ❌ |
| Process payroll | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ❌ | ✅ (own) | ❌ |
| Archive data | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |

---

**Last Updated:** September 10, 2026  
**Document Version:** 1.0  
**Maintained By:** KJAC Development Team
