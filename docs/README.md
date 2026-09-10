# KJAC System Documentation

**Business:** Klein & Justin Airconditioning  
**Project:** Integrated Web and Mobile Service Management System  
**Documentation Version:** 1.0  
**Last Updated:** September 10, 2026

---

## 📚 Documentation Structure

This directory contains comprehensive documentation for the KJAC system covering requirements, architecture, design, and workflows.

---

## ✅ Completed Documentation

### Core Documents

- ✅ **[AGENTS.md](../AGENTS.md)** - Master navigation guide for all system roles and documentation
- ✅ **[PRD.md](PRD.md)** - Product Requirements Document (functional & non-functional requirements)
- ✅ **[BUSINESS_RULES.md](BUSINESS_RULES.md)** - Business policies, cancellation/refund rules, operational guidelines

### Database Documentation

- ✅ **[database/DATABASE.md](database/DATABASE.md)** - Database architecture, ERD, relationships, maintenance
- ✅ **[database/DATABASE_TABLES.md](database/DATABASE_TABLES.md)** - Complete table schemas with RLS policies
- ✅ **[database/DATABASE_RULES.md](database/DATABASE_RULES.md)** - Column ordering standards, naming conventions, best practices

### Design System

- ✅ **[design/DESIGN.md](design/DESIGN.md)** - Complete UI/UX specifications (colors, typography, components, responsive design)

### API Documentation

- ✅ **[api/API.md](api/API.md)** - Complete FastAPI endpoint specifications with authentication, bookings, payments, services, PSGC addresses, notifications, and admin operations

### Workflow Documentation (100% Complete)

- ✅ **[flows/FLOW_AUTH.md](flows/FLOW_AUTH.md)** - Complete authentication flows (admin 2FA, customer registration, technician accounts, password reset, session management)
- ✅ **[flows/FLOW_BOOKING.md](flows/FLOW_BOOKING.md)** - Complete booking lifecycle (guest/customer booking, payment upload, expiration, status tracking, cancellation, refund, rescheduling, rating)
- ✅ **[flows/FLOW_ADMIN.md](flows/FLOW_ADMIN.md)** - Admin panel workflows (dashboard, CRUD operations, dispatch, payment verification, refund processing, reports, system settings, audit logs, archive, chat)
- ✅ **[flows/FLOW_CUSTOMER.md](flows/FLOW_CUSTOMER.md)** - Customer mobile app workflows (onboarding, profile management, booking creation, payment upload, status tracking, cancellation, reschedule, rating, service history, promotions, notifications, settings)
- ✅ **[flows/FLOW_TECHNICIAN.md](flows/FLOW_TECHNICIAN.md)** - Technician mobile app workflows (registration, first login, job dashboard, status updates, schedule calendar, customer navigation, profile management, performance metrics, admin communication)
- ✅ **[flows/FLOW_GUEST.md](flows/FLOW_GUEST.md)** - Public website workflows (landing page navigation, service/brand exploration, walk-in booking, payment upload, status tracking, gallery, testimonials, FAQs, contact)
- ✅ **[flows/FLOW_NOTIFICATION.md](flows/FLOW_NOTIFICATION.md)** - Notification system (push, email, in-app notifications with triggers for admin, customer, and technician, templates, delivery logic)
- ✅ **[flows/FLOW_INVENTORY.md](flows/FLOW_INVENTORY.md)** - Inventory management workflows (add items, stock updates, QR/barcode scanning, stock movements, low stock alerts, usage tracking, reports, stock audit)
- ✅ **[flows/FLOW_PAYROLL.md](flows/FLOW_PAYROLL.md)** - Payroll processing workflows (commission tracking, salary configuration, payroll generation, deductions, payslip generation, payment processing, reports, tax compliance)

---

---

## 📖 How to Use This Documentation

### For Project Managers

Start with: **PRD.md** → **BUSINESS_RULES.md** → **AGENTS.md**

### For Backend Developers

Start with: **database/** folder → **api/API.md** (when created) → **flows/** folder

### For Frontend Developers (Web)

Start with: **design/DESIGN.md** → **PRD.md** → **flows/FLOW_ADMIN.md** and **flows/FLOW_GUEST.md**

### For Mobile Developers

Start with: **design/DESIGN.md** → **PRD.md** → **flows/FLOW_CUSTOMER.md** and **flows/FLOW_TECHNICIAN.md**

### For QA/Testers

Start with: **PRD.md** → **BUSINESS_RULES.md** → **flows/** folder (all workflows)

### For Designers

Start with: **design/DESIGN.md** → **PRD.md** → **BUSINESS_RULES.md**

---

## 🔗 Quick Links

### Business Information

- **Name:** Klein & Justin Airconditioning (KJAC)
- **Address:** 060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna, Philippines
- **Phone:** 0926-633-3129
- **Email:** abadeciomar@yahoo.com
- **Business Hours:** Monday–Saturday, 8:00 AM – 5:00 PM
- **Timezone:** Asia/Manila (GMT+8)

### Technical Stack

- **Backend:** FastAPI (Python 3.11+) with SQLAlchemy
- **Database:** Supabase (PostgreSQL 15)
- **Web Frontend:** React 19+ TypeScript, Tailwind CSS, Lucide Icons
- **Mobile:** Flutter (iOS & Android)
- **Auth:** Supabase Auth + JWT
- **Storage:** Supabase Storage
- **Push Notifications:** Firebase Cloud Messaging
- **Maps:** Leaflet (web), Google Maps SDK (mobile)
- **Address API:** PSGC API (Philippine Standard Geographic Code)

### Key Features

1. **Multi-role system** (Admin, Customer, Technician, Guest)
2. **Booking & Scheduling** with calendar availability
3. **Payment verification** (GCash manual verification, future: Paymongo)
4. **Real-time notifications** (Push & Email)
5. **Inventory management** with QR/barcode scanning
6. **Payroll system** with commission calculation
7. **Rating & Review** system
8. **Chat/Messaging** (per-booking and general)
9. **Archive & Audit logs** (30-day retention, immutable logs)
10. **Responsive design** (Mobile-first web, iOS HIG mobile)

---

## 🎯 Development Phases

### Phase 1: MVP (3 months)

- ✅ Core authentication (all roles)
- ✅ Booking creation & management
- ✅ Payment upload & verification
- ✅ Technician assignment & job tracking
- ✅ Admin dashboard with analytics
- ✅ Mobile app (customer & technician)
- ✅ Push notifications
- ✅ Rating & review system
- ✅ Basic inventory management
- ✅ Archive & audit logs

### Phase 2: Enhancements (2 months)

- ⏳ Payroll system
- ⏳ Advanced analytics & reports
- ⏳ Chat/messaging system
- ⏳ QR/barcode inventory scanning
- ⏳ Export to Excel/PDF
- ⏳ Email notification templates
- ⏳ Enhanced dispatch dashboard

### Phase 3: Future

- 🔮 Paymongo payment gateway integration
- 🔮 Customer loyalty program
- 🔮 Multi-branch management
- 🔮 AI-powered technician routing
- 🔮 CRM integrations
- 🔮 Multi-language support

---

## 📝 Documentation Standards

### Markdown Conventions

- Use ATX-style headers (`#`, `##`, `###`)
- Include table of contents for long documents
- Use code fences with language identifiers
- Include examples for clarity
- Keep line length < 120 characters (when possible)

### Code Examples

- Provide complete, working examples
- Include necessary imports/dependencies
- Add inline comments for complex logic
- Show both correct (✅) and incorrect (❌) patterns

### Diagrams

- Use Mermaid for flowcharts and diagrams
- ASCII art for simple visualizations
- External tools (draw.io, Figma) for complex designs
- Always provide text alternative descriptions

---

## 🔄 Document Update Process

1. **Review** existing documentation before making changes
2. **Update** the relevant section(s)
3. **Increment** version number in document header
4. **Update** "Last Updated" date
5. **Test** code examples if applicable
6. **Commit** with descriptive message
7. **Notify** team of significant changes

---

## 📞 Documentation Contacts

**Questions about documentation?**

- **Project Manager:** [Name/Email]
- **Lead Developer:** [Name/Email]
- **Technical Writer:** [Name/Email]

**Report documentation issues:**

- Create an issue in the project repository
- Tag with `documentation` label
- Include document name and section

---

## 📊 Documentation Metrics

### Completeness

- **Core Documents:** 7/7 (100%) ✅
- **Database Docs:** 3/3 (100%) ✅
- **Design Docs:** 1/1 (100%) ✅
- **API Docs:** 1/1 (100%) ✅
- **Flow Docs:** 9/9 (100%) ✅

**Overall Progress:** 21/21 (100%) ✅

### Last Review Dates

- Core Documents: September 10, 2026
- Database Docs: September 10, 2026
- Design Docs: September 10, 2026
- API Docs: September 10, 2026
- Flow Docs: September 10, 2026

---

## 🚀 Next Steps

1. ✅ Complete core documentation (PRD, Business Rules, Database, Design)
2. ✅ Create API documentation with endpoint specifications
3. ✅ Create workflow flowcharts for all user roles
4. ⏳ Add sequence diagrams for complex interactions (optional enhancement)
5. ⏳ Create developer onboarding guide (optional)
6. ⏳ Add troubleshooting guide (post-development)
7. ⏳ Create deployment guide (pre-production)
8. ⏳ Add testing strategy document (QA phase)

---

## 📚 Additional Resources

### External Documentation

- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Flutter Docs](https://docs.flutter.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)

### Design Resources

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://m3.material.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Philippine Standards

- [PSGC API](https://psgc.cloud/)
- [Data Privacy Act](https://www.privacy.gov.ph/)
- [Philippine Business Regulations](https://www.dti.gov.ph/)

---

**Document Maintained By:** KJAC Development Team  
**For Updates:** Check repository for latest version  
**License:** Proprietary - Klein & Justin Airconditioning

---

_This documentation is a living resource. Keep it updated as the project evolves._
