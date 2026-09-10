# KJAC Database Architecture

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Database System:** PostgreSQL 15 (Supabase)  
**ORM:** SQLAlchemy (FastAPI Backend)

---

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Table Groups](#table-groups)
5. [Key Relationships](#key-relationships)
6. [Data Flow](#data-flow)
7. [Backup & Recovery](#backup--recovery)

---

## Overview

The KJAC database is designed to support a comprehensive air conditioning service management system with the following objectives:

### Design Principles
- **Security First:** Row Level Security (RLS) on all tables
- **Data Integrity:** Foreign keys, constraints, and triggers
- **Audit Trail:** Complete audit logging for accountability
- **Soft Deletes:** Never permanently delete data (30-day grace period)
- **Performance:** Strategic indexing for common queries
- **Scalability:** Designed to handle 10,000+ bookings/year
- **Compliance:** Data retention for tax and legal requirements

### Database Statistics (Projected Year 1)
- **Users:** ~500 customers, ~10 technicians, ~3 admins
- **Bookings:** ~1,000-2,000 per year
- **Messages:** ~5,000-10,000 per year
- **Audit Logs:** ~50,000 entries per year
- **Total Storage:** <1 GB (excluding images)

---

## Database Architecture

### Technology Stack
- **Database:** PostgreSQL 15.x
- **Hosting:** Supabase (managed PostgreSQL + Auth + Storage)
- **Connection:** SSL/TLS encrypted
- **Backup:** Automated daily backups (Supabase)
- **Replication:** Multi-region (Supabase feature)
- **Timezone:** Asia/Manila (UTC+8)

### Extensions Used
```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- Full-text search (future use)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Cron jobs (scheduled tasks)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- PostGIS (if adding advanced location features)
-- CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## Entity Relationship Diagram

### Core Entities

```
┌─────────────┐
│    Users    │ (Admins, Customers, Technicians)
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│  Bookings   │  │  Messages   │
└──────┬──────┘  └─────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────┐ ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Payments   │ │ Ratings  │  │ Refunds  │  │Reschedule│
└─────────────┘ └──────────┘  └──────────┘  └──────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Services   │  │   Brands    │  │  Inventory  │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Audit Logs  │  │Notifications│  │   Payroll   │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Detailed ERD

```
users (1) ────< (many) bookings
users (1) ────< (many) messages (as sender)
users (1) ────< (many) messages (as recipient)
users (1) ────< (many) ratings (as customer)
users (1) ────< (many) ratings (as technician - rated)
users (1) ────< (many) notifications
users (1) ────< (many) audit_logs
users (1) ────< (many) payroll_records

bookings (1) ──< (many) payments
bookings (1) ──< (1) rating
bookings (1) ──< (many) refunds
bookings (1) ──< (many) reschedule_requests
bookings (1) ──< (many) messages (booking-specific)
bookings (1) ──< (many) booking_status_history

bookings (many) >── (1) services
bookings (many) >── (1) aircon_brands

services (1) ───< (many) service_images
brands (1) ──────< (many) brand_images

inventory_items (1) ─< (many) inventory_movements
inventory_items (1) ─< (many) booking_inventory_usage
```

---

## Table Groups

### 1. Core User Management
- **`users`** - All user accounts (admins, customers, technicians)
- **`user_sessions`** - Active login sessions (JWT refresh tokens)
- **`user_devices`** - Registered devices for push notifications

**Purpose:** Authentication, authorization, profile management

---

### 2. Booking Management
- **`bookings`** - Main booking/appointment records
- **`booking_status_history`** - Status change audit trail
- **`payments`** - Payment records (down payment, full payment)
- **`refunds`** - Refund requests and processing
- **`reschedule_requests`** - Rescheduling requests from customers

**Purpose:** Core business workflow - appointment lifecycle

---

### 3. Service Catalog
- **`services`** - Available service types (installation, repair, etc.)
- **`service_images`** - Before/after photos for services
- **`aircon_brands`** - Supported aircon brands (Daikin, Carrier, etc.)
- **`brand_images`** - Brand logos and product images

**Purpose:** Service offerings configuration

---

### 4. Feedback & Communication
- **`ratings`** - Customer ratings for technicians (1-5 stars + review)
- **`messages`** - Chat messages (admin-customer, admin-technician)
- **`message_threads`** - Chat conversation threads
- **`notifications`** - Push notifications and in-app alerts

**Purpose:** Customer satisfaction tracking and communication

---

### 5. Inventory Management
- **`inventory_items`** - Stock items (aircon units, parts)
- **`inventory_movements`** - Stock in/out transactions
- **`booking_inventory_usage`** - Parts used per booking

**Purpose:** Stock tracking and QR/barcode scanning

---

### 6. Payroll & HR
- **`payroll_records`** - Technician salary and commission
- **`payroll_deductions`** - Tax, SSS, PhilHealth, Pag-IBIG
- **`employee_info`** - Extended employee data (linked to users)

**Purpose:** Employee compensation management

---

### 7. System & Audit
- **`audit_logs`** - Complete change history (who, what, when)
- **`system_settings`** - Configuration (rate limits, timeouts, etc.)
- **`archived_records`** - Soft-deleted records (30-day retention)

**Purpose:** Compliance, security, and configurability

---

### 8. Address & Location (PSGC Integration)
- **`psgc_regions`** - Philippine regions (cached from PSGC API)
- **`psgc_provinces`** - Provinces
- **`psgc_cities_municipalities`** - Cities/municipalities
- **`psgc_barangays`** - Barangays

**Purpose:** Address validation and selection

---

## Key Relationships

### User → Bookings (One-to-Many)
```sql
-- One customer has many bookings
bookings.customer_id → users.id

-- One technician assigned to many bookings
bookings.technician_id → users.id
```

**Business Rule:** 
- Customer can create unlimited bookings
- Technician assigned to max 3 bookings per day

---

### Booking → Payments (One-to-Many)
```sql
payments.booking_id → bookings.id
```

**Business Rule:**
- Minimum 1 payment (down payment) required
- Maximum 2 payments (down payment + full payment)

---

### Booking → Rating (One-to-One)
```sql
ratings.booking_id → bookings.id (UNIQUE)
```

**Business Rule:**
- One rating per booking
- Only after booking status = "completed"
- Customer cannot edit rating after submission

---

### Booking → Service & Brand (Many-to-One)
```sql
bookings.service_id → services.id
bookings.brand_id → aircon_brands.id
```

**Business Rule:**
- Service and brand selected at booking creation
- Cannot be changed after booking confirmed

---

### User → Messages (One-to-Many, Bidirectional)
```sql
messages.sender_id → users.id
messages.recipient_id → users.id
```

**Business Rule:**
- Customers can only message admin
- Technicians can only message admin
- Admin can message anyone

---

## Data Flow

### Booking Creation Flow

```
1. Customer creates booking
   ↓
   INSERT INTO bookings (customer_id, service_id, brand_id, status='submitted', ...)
   ↓
2. Generate reference ID (trigger)
   ↓
   UPDATE bookings SET reference_id = 'KJAC-2026-ABC123'
   ↓
3. Insert status history
   ↓
   INSERT INTO booking_status_history (booking_id, status='submitted', ...)
   ↓
4. Create notification for admin
   ↓
   INSERT INTO notifications (user_id=admin, type='new_booking', ...)
```

### Payment Verification Flow

```
1. Customer uploads payment
   ↓
   INSERT INTO payments (booking_id, amount, gcash_ref, receipt_url, status='pending')
   ↓
   UPDATE bookings SET status='pending'
   ↓
2. Admin verifies payment
   ↓
   UPDATE payments SET status='verified', verified_by=admin_id, verified_at=NOW()
   ↓
   UPDATE bookings SET status='confirmed', confirmed_at=NOW()
   ↓
3. Assign technician
   ↓
   UPDATE bookings SET technician_id=X
   ↓
4. Notify customer and technician
   ↓
   INSERT INTO notifications (user_id=customer, type='booking_confirmed', ...)
   INSERT INTO notifications (user_id=technician, type='job_assigned', ...)
```

### Service Completion Flow

```
1. Technician clicks "Complete Service"
   ↓
   UPDATE bookings SET status='completed', completed_at=NOW()
   ↓
2. Update technician stats
   ↓
   UPDATE users SET total_jobs=total_jobs+1 WHERE id=technician_id
   ↓
3. Calculate commission
   ↓
   INSERT INTO payroll_records (technician_id, booking_id, commission=...)
   ↓
4. Request rating from customer
   ↓
   INSERT INTO notifications (user_id=customer, type='rate_service', ...)
```

---

## Backup & Recovery

### Automated Backups (Supabase)
- **Frequency:** Daily at 2:00 AM (Asia/Manila)
- **Retention:** 7 days (rolling window)
- **Storage:** Supabase managed backup storage
- **Encryption:** At rest and in transit

### Manual Backups
```bash
# Full database dump
pg_dump -h <supabase-host> -U postgres -d kjac_db > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump -h <supabase-host> -U postgres -d kjac_db --schema-only > schema.sql

# Data only
pg_dump -h <supabase-host> -U postgres -d kjac_db --data-only > data.sql

# Specific table
pg_dump -h <supabase-host> -U postgres -d kjac_db -t bookings > bookings_backup.sql
```

### Restore Procedures
```bash
# Restore full database
psql -h <supabase-host> -U postgres -d kjac_db < backup_20260910.sql

# Restore specific table
psql -h <supabase-host> -U postgres -d kjac_db < bookings_backup.sql
```

### Point-in-Time Recovery (PITR)
- Supabase Pro: PITR available (restore to any point in last 7 days)
- Enable via Supabase dashboard
- Recovery process: Create new database from backup point

---

## Database Monitoring

### Key Metrics to Monitor

1. **Connection Pool Usage**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'kjac_db';
   ```

2. **Slow Queries** (> 1 second)
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000  -- milliseconds
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Table Sizes**
   ```sql
   SELECT
       schemaname,
       tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

4. **Index Usage**
   ```sql
   SELECT
       schemaname, tablename, indexname,
       idx_scan AS index_scans,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
   ```

5. **Deadlocks**
   ```sql
   SELECT * FROM pg_stat_database WHERE datname = 'kjac_db';
   -- Check deadlocks column
   ```

### Alerts to Configure

- ❗ Database size > 80% of quota
- ❗ Connection pool > 90% utilized
- ❗ Query execution time > 5 seconds
- ❗ Replication lag > 1 minute
- ❗ Failed backup
- ❗ Disk space < 20% free

---

## Security Measures

### 1. Row Level Security (RLS)
- ✅ Enabled on ALL tables
- ✅ Policies enforce role-based access
- ✅ No data leakage between users

### 2. Connection Security
- ✅ SSL/TLS required for all connections
- ✅ IP whitelisting (optional, for admin access)
- ✅ Connection pooling with max limits

### 3. Password Security
- ✅ Bcrypt hashing (cost factor 12)
- ✅ Never stored in plain text
- ✅ Password reset via secure tokens

### 4. Audit Logging
- ✅ All changes logged with user context
- ✅ Immutable audit trail
- ✅ IP address and user agent captured

### 5. Data Encryption
- ✅ At rest: Supabase-managed encryption
- ✅ In transit: HTTPS/TLS 1.3
- ✅ Backup encryption: AES-256

---

## Performance Optimization

### Indexing Strategy
1. **Primary keys:** Automatic (clustered index)
2. **Foreign keys:** Manual indexes created
3. **Filter columns:** Indexed (status, role, date ranges)
4. **Sort columns:** Indexed (created_at DESC)
5. **Composite indexes:** For common multi-column queries

### Query Optimization
- Use `EXPLAIN ANALYZE` for slow queries
- Avoid `SELECT *` (fetch only needed columns)
- Use JOINs instead of N+1 queries
- Paginate large result sets
- Use connection pooling

### Maintenance Tasks
```sql
-- Vacuum tables (reclaim space)
VACUUM ANALYZE bookings;

-- Reindex (if index bloated)
REINDEX TABLE bookings;

-- Update statistics (for query planner)
ANALYZE bookings;
```

### Scheduled Maintenance (pg_cron)
```sql
-- Daily vacuum analyze (3:00 AM)
SELECT cron.schedule('vacuum-analyze', '0 3 * * *', 'VACUUM ANALYZE');

-- Weekly reindex (Sunday 4:00 AM)
SELECT cron.schedule('weekly-reindex', '0 4 * * 0', 'REINDEX DATABASE kjac_db');
```

---

## Data Retention Policy

### Active Data
- **Users:** Retained while account active
- **Bookings:** Retained indefinitely (business records)
- **Messages:** Retained for 2 years
- **Notifications:** Retained for 90 days

### Archived Data (Soft Deleted)
- **Retention Period:** 30 days
- **Auto-Purge:** Daily cron job at 2:00 AM
- **Warning:** Email notification 24 hours before purge
- **Recovery:** Admin can restore within 30 days

### Audit Logs
- **Retention Period:** 3 years
- **Purpose:** Compliance, legal, dispute resolution
- **Storage:** Archived to cold storage after 1 year (future)

### Compliance
- **Tax Records:** 7 years (bookings, payments, payroll)
- **Personal Data:** 2 years after account deletion (anonymized)
- **Legal Requirements:** Philippine Data Privacy Act compliance

---

## Migration Strategy

### Development Environment
1. **Local PostgreSQL:** Developers run migrations on local DB
2. **Testing:** Automated tests verify schema changes
3. **Code Review:** Migrations peer-reviewed before merge

### Staging Environment
1. **Apply Migration:** Test on staging database
2. **Smoke Test:** Verify application functionality
3. **Performance Test:** Check query performance with production-like data

### Production Environment
1. **Backup First:** Full database backup before migration
2. **Maintenance Window:** Apply during low-traffic hours (2-5 AM)
3. **Apply Migration:** Run migration script
4. **Verify:** Check schema, indexes, RLS policies
5. **Monitor:** Watch for errors, performance degradation
6. **Rollback Plan:** Ready to revert if issues arise

### Rollback Procedure
```sql
BEGIN;

-- Run rollback script
\i rollback_20260910.sql

-- Verify
SELECT * FROM schema_migrations;

COMMIT;
```

---

## Database Documentation Tools

### Schema Documentation
- **Tool:** SchemaSpy, pgAdmin, DBeaver
- **Output:** HTML documentation with ERD diagrams
- **Frequency:** Generated after each schema change

### Data Dictionary
- Use PostgreSQL `COMMENT` statements:
```sql
COMMENT ON TABLE bookings IS 'Customer appointment bookings';
COMMENT ON COLUMN bookings.reference_id IS 'Public-facing booking reference (e.g., KJAC-2026-ABC123)';
```

### ERD Generation
- **Tool:** dbdiagram.io, Lucidchart, draw.io
- **Source:** Generated from database schema
- **Location:** `/docs/database/ERD.png`

---

## Conclusion

The KJAC database is designed with:
- ✅ **Robust architecture** for long-term scalability
- ✅ **Security-first** approach with RLS and encryption
- ✅ **Audit trails** for accountability and compliance
- ✅ **Performance optimization** through strategic indexing
- ✅ **Data integrity** via constraints and triggers
- ✅ **Disaster recovery** with automated backups

**For detailed table schemas, see:** [`DATABASE_TABLES.md`](DATABASE_TABLES.md)  
**For RLS policies and rules, see:** [`DATABASE_RULES.md`](DATABASE_RULES.md)

---

**Maintained By:** KJAC Development Team  
**Database Admin:** [DBA Name/Email]  
**Emergency Contact:** 0926-633-3129

---

*This document should be updated whenever significant schema changes are made.*
