# KJAC System - Quick Start Guide

**Last Updated:** September 10, 2026  
**For:** Developers joining the KJAC project

---

## 🚀 Getting Started in 5 Minutes

### 1. Read These First (15 minutes)
1. **[AGENTS.md](AGENTS.md)** - Understand system roles (5 min)
2. **[docs/README.md](docs/README.md)** - Documentation overview (5 min)
3. **[docs/PRD.md](docs/PRD.md)** - Scan functional requirements (5 min)

### 2. Find Your Role's Documentation

#### Backend Developer?
→ Start here:
- `docs/database/DATABASE_TABLES.md` - Database schemas
- `docs/api/API.md` - API endpoints
- `docs/BUSINESS_RULES.md` - Business logic

#### Frontend Developer (Web)?
→ Start here:
- `docs/design/DESIGN.md` - Design system
- `docs/flows/FLOW_ADMIN.md` - Admin panel workflows
- `docs/flows/FLOW_GUEST.md` - Public website

#### Mobile Developer?
→ Start here:
- `docs/design/DESIGN.md` - Design system (Mobile section)
- `docs/flows/FLOW_CUSTOMER.md` - Customer app
- `docs/flows/FLOW_TECHNICIAN.md` - Technician app

---

## 📚 Documentation Map

```
kjac-system/
├── AGENTS.md              ← START HERE (master navigation)
├── QUICK_START.md         ← This file
│
└── docs/
    ├── README.md          ← Documentation index
    ├── PRD.md             ← Product requirements
    ├── BUSINESS_RULES.md  ← Business policies
    │
    ├── database/
    │   ├── DATABASE.md              ← Architecture overview
    │   ├── DATABASE_TABLES.md       ← Table schemas (30+ tables)
    │   └── DATABASE_RULES.md        ← Standards
    │
    ├── design/
    │   └── DESIGN.md                ← Complete UI/UX system
    │
    ├── api/
    │   └── API.md                   ← API endpoints (50+)
    │
    └── flows/
        ├── FLOW_AUTH.md             ← Authentication
        ├── FLOW_BOOKING.md          ← Booking lifecycle
        ├── FLOW_ADMIN.md            ← Admin panel
        ├── FLOW_CUSTOMER.md         ← Customer app
        ├── FLOW_TECHNICIAN.md       ← Technician app
        ├── FLOW_GUEST.md            ← Public website
        ├── FLOW_NOTIFICATION.md     ← Notifications
        ├── FLOW_INVENTORY.md        ← Inventory
        └── FLOW_PAYROLL.md          ← Payroll
```

---

## 🎯 Key Concepts (Must Know)

### Business Rules
- **Booking expires:** 3 hours after creation (no payment)
- **Cancellation policy:** 3 tiers (immediate/same-day/late)
- **Rate limiting:** 5 login attempts, 3 bookings per 30 mins
- **Sunday bookings:** Disabled by default (admin can enable)
- **Payment:** GCash manual verification (Phase 1)

### User Roles
1. **Admin** - Full system control (web)
2. **Customer** - Book & track services (mobile)
3. **Technician** - Manage jobs (mobile)
4. **Guest** - Public booking (web)

### Tech Stack
- **Backend:** FastAPI + SQLAlchemy
- **Database:** Supabase (PostgreSQL 15)
- **Web:** React 18 + TypeScript + Tailwind CSS
- **Mobile:** Flutter (iOS & Android)
- **Auth:** Supabase Auth + JWT
- **Notifications:** Firebase Cloud Messaging

---

## 🔑 Critical Configuration

### GCash Payment (Admin Configurable)
- **Account Number:** 0912-345-6789 (default)
- **Account Name:** Juan Dela Cruz (default)
- **Location in DB:** `system_settings` table

### Business Hours
- **Days:** Monday-Saturday (Sunday configurable)
- **Hours:** 8:00 AM - 5:00 PM
- **Timezone:** Asia/Manila (GMT+8)

### Contact Information
- **Phone:** 0926-633-3129
- **Email:** abadeciomar@yahoo.com
- **Address:** 060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna

---

## 🛠️ Development Workflow

### Setting Up Database
```sql
-- Follow this order:
1. Read: docs/database/DATABASE_TABLES.md
2. Create tables in order specified
3. Run default data inserts
4. Enable RLS policies
5. Test with sample data
```

### Building APIs
```
1. Read: docs/api/API.md
2. Find your endpoint
3. Check request/response format
4. Implement validation rules
5. Test with examples provided
```

### Implementing UI
```
1. Read: docs/design/DESIGN.md
2. Check your platform (Web/Mobile)
3. Use design tokens (colors, fonts, spacing)
4. Follow workflow in docs/flows/
5. Handle all states (loading, error, success)
```

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't Do This:
- Trust client-side validation only → ✅ Always validate server-side
- Hard-code GCash details → ✅ Use system_settings table
- Allow Sunday bookings without checking setting → ✅ Check `allow_sunday_bookings`
- Auto-approve payments → ✅ Always require admin verification
- Expose API keys → ✅ Use environment variables
- Skip rate limiting → ✅ Enforce on all endpoints
- Ignore RLS policies → ✅ Enable on all tables

### ✅ Do This Instead:
- Read the relevant FLOW document before coding
- Check BUSINESS_RULES.md for business logic
- Use DATABASE_RULES.md for column ordering
- Follow DESIGN.md for consistent UI
- Test against API.md examples

---

## 🐛 Debugging Tips

### Can't find something?
→ Search in `AGENTS.md` (master navigation)

### Business logic unclear?
→ Read `docs/BUSINESS_RULES.md`

### API contract confusion?
→ Check `docs/api/API.md` with examples

### UI/UX questions?
→ See `docs/design/DESIGN.md`

### Workflow unclear?
→ Read relevant `docs/flows/FLOW_*.md` file

---

## 📞 Need Help?

### Documentation Issues
1. Check `docs/README.md` for overview
2. Search in relevant documentation file
3. Cross-reference in `AGENTS.md`

### Technical Questions
- **Database:** See `docs/database/` folder
- **API:** See `docs/api/API.md`
- **Design:** See `docs/design/DESIGN.md`
- **Workflows:** See `docs/flows/` folder

---

## ✅ Your First Task Checklist

### Backend Developer
- [ ] Read `DATABASE_TABLES.md`
- [ ] Set up local Supabase instance
- [ ] Create `users` and `services` tables
- [ ] Implement `/auth/login` endpoint
- [ ] Test authentication flow

### Frontend Developer (Web)
- [ ] Read `DESIGN.md` (Web section)
- [ ] Set up React project with Tailwind
- [ ] Create design tokens (colors, fonts)
- [ ] Build login page
- [ ] Connect to auth API

### Mobile Developer
- [ ] Read `DESIGN.md` (Mobile section)
- [ ] Set up Flutter project
- [ ] Implement design system
- [ ] Build onboarding screens
- [ ] Create login screen

---

## 🎯 Success Metrics

You'll know you're on track when:
- ✅ You can navigate documentation easily
- ✅ Your code matches the specs
- ✅ Business rules are correctly implemented
- ✅ UI follows design system
- ✅ APIs match contract in API.md
- ✅ All edge cases handled per FLOW docs

---

## 🚦 Status Check

Before committing code, ask:
1. Did I read the relevant documentation?
2. Does my code follow BUSINESS_RULES.md?
3. Does my API match API.md contract?
4. Does my UI follow DESIGN.md?
5. Did I handle all states (loading, error, empty)?
6. Did I validate on server-side?
7. Did I test edge cases from FLOW docs?

---

**Welcome to the KJAC project! 🎉**

**Next Step:** Open [AGENTS.md](AGENTS.md) to start your documentation journey.

**Remember:** When in doubt, check the docs. Everything you need is documented!

---

**Quick Links:**
- 📖 [Master Navigation](AGENTS.md)
- 📚 [Documentation Index](docs/README.md)
- 🎨 [Design System](docs/design/DESIGN.md)
- 🔌 [API Reference](docs/api/API.md)
- 💾 [Database Schemas](docs/database/DATABASE_TABLES.md)
- 📋 [Business Rules](docs/BUSINESS_RULES.md)
