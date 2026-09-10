# Database Rules & Standards

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Database:** PostgreSQL 15 (Supabase)

---

## Table of Contents
1. [Column Ordering Standard](#column-ordering-standard)
2. [Naming Conventions](#naming-conventions)
3. [Data Types](#data-types)
4. [Constraints](#constraints)
5. [Indexes](#indexes)
6. [Row Level Security (RLS)](#row-level-security-rls)
7. [Triggers & Functions](#triggers--functions)
8. [Migration Rules](#migration-rules)

---

## Column Ordering Standard

### Standard Column Order (MUST Follow)

All tables MUST follow this exact column order:

```
1. Primary Key                    — id (serial/bigserial) or UUID
2. Business/Natural Keys          — uuid, reference, code, sku, slug (unique identifiers)
3. Foreign Keys                   — user_id, customer_id, booking_id, technician_id, etc.
4. Core Identity/Contact          — first_name, middle_name, last_name, email, phone
5. Email/Phone Verification       — email_verified_at, phone_verified_at
6. Core Business Attributes       — titles, descriptions, amounts, dates, status flags
7. Secondary/Optional Attributes  — notes, metadata, images, sort_order, coordinates
8. Auth/Security (users only)     — password_hash, two_factor_secret, remember_token
9. Timestamps                     — created_at, updated_at
10. Soft Delete                   — deleted_at (ALWAYS LAST)
```

### Rationale
- **Consistency:** Easy to scan and understand any table structure
- **Predictability:** Developers know where to find specific columns
- **Maintainability:** New columns added in correct position, not randomly
- **Performance:** Related columns grouped together (better cache locality)

### Example: Users Table

```sql
CREATE TABLE users (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Business Keys
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    
    -- 3. Foreign Keys
    -- (none for users table)
    
    -- 4. Core Identity
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- 5. Verification Timestamps
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    
    -- 6. Core Business Attributes
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'customer', 'technician')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- 7. Secondary Attributes
    profile_picture_url TEXT,
    address TEXT,
    landmark VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- 8. Auth/Security
    password_hash VARCHAR(255) NOT NULL,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    remember_token VARCHAR(255),
    
    -- 9. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 10. Soft Delete (ALWAYS LAST)
    deleted_at TIMESTAMPTZ
);
```

---

## PostgreSQL Column Addition Behavior

### ⚠️ CRITICAL RULE: PostgreSQL Always Appends New Columns

**PostgreSQL does NOT allow inserting columns in the middle of existing columns.**

When you add a new column to an existing table:
```sql
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
```

**Result:** `nickname` is added **at the end** (before `deleted_at` if you're lucky, but often after).

### Implication for Column Ordering

1. **Initial table creation:** Follow the standard order strictly
2. **Adding columns later:** 
   - PostgreSQL appends them to the end
   - **Accept this limitation** — do NOT try to reorder
   - Document the deviation in migration comments
3. **If strict order is critical:**
   - Create a new table with correct order
   - Migrate data
   - Drop old table
   - Rename new table
   - (This is expensive and risky — avoid if possible)

### Best Practice

**Get the column order right the first time during table creation.**

If you must add columns later, add a comment explaining why it's out of order:

```sql
ALTER TABLE users ADD COLUMN nickname VARCHAR(50); -- Added 2026-09-15, out of standard order due to PostgreSQL limitation
COMMENT ON COLUMN users.nickname IS 'User nickname (optional). Added post-launch, appears after deleted_at.';
```

---

## Naming Conventions

### Tables
- **Format:** `snake_case`, plural
- **Examples:** `users`, `bookings`, `services`, `aircon_brands`
- **Avoid:** `tbl_`, `t_` prefixes (redundant)

### Columns
- **Format:** `snake_case`, singular (unless naturally plural)
- **Examples:** `user_id`, `first_name`, `created_at`, `is_active`
- **Boolean columns:** Prefix with `is_`, `has_`, `can_`, `should_`
  - `is_active`, `has_paid`, `can_refund`, `should_notify`
- **Timestamps:** Suffix with `_at`
  - `created_at`, `updated_at`, `deleted_at`, `verified_at`, `confirmed_at`
- **Dates (no time):** Suffix with `_date` or `_on`
  - `birth_date`, `hired_on`, `appointment_date`

### Foreign Keys
- **Format:** `{referenced_table_singular}_id`
- **Examples:** `user_id`, `booking_id`, `technician_id`, `service_id`
- **Avoid:** Just `id` for foreign keys (ambiguous)

### Indexes
- **Format:** `idx_{table}_{columns}`
- **Examples:** 
  - `idx_users_email` (single column)
  - `idx_bookings_customer_id_status` (composite)
  - `idx_bookings_created_at_desc` (with order)
- **Unique indexes:** `uniq_{table}_{columns}`
  - `uniq_users_email`, `uniq_bookings_reference`

### Constraints
- **Primary Key:** `{table}_pkey` (PostgreSQL default, don't change)
- **Foreign Key:** `fk_{table}_{referenced_table}`
  - `fk_bookings_users`, `fk_bookings_services`
- **Check:** `chk_{table}_{column}_{condition}`
  - `chk_users_role_valid`, `chk_bookings_amount_positive`
- **Unique:** `uniq_{table}_{columns}` (same as unique index)

### Enums (Use CHECK constraints instead)
- PostgreSQL enums are hard to modify
- Use VARCHAR with CHECK constraint:

```sql
status VARCHAR(20) NOT NULL DEFAULT 'submitted' 
    CHECK (status IN ('submitted', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'expired', 'rescheduled'))
```

**Advantage:** Easy to add new values with `ALTER TABLE`

---

## Data Types

### Strings
- **Short text (< 255 chars):** `VARCHAR(n)`
  - Names: `VARCHAR(100)`
  - Email: `VARCHAR(255)`
  - Phone: `VARCHAR(20)`
  - Status/Role: `VARCHAR(20)`
- **Long text (no limit):** `TEXT`
  - Descriptions, notes, addresses, JSON (if not using JSONB)
- **Fixed length (rare):** `CHAR(n)` — only if truly fixed (e.g., country code)

### Numbers
- **Integer (4 bytes, -2B to +2B):** `INTEGER`
- **Big Integer (8 bytes):** `BIGINT`
  - Use for `id` columns (primary keys) — `BIGSERIAL`
- **Serial (auto-increment):** `SERIAL` (int), `BIGSERIAL` (bigint)
- **Decimal (exact):** `NUMERIC(p, s)` or `DECIMAL(p, s)`
  - Money: `NUMERIC(10, 2)` (up to 99,999,999.99)
  - Latitude: `NUMERIC(10, 8)` (e.g., 14.25715420)
  - Longitude: `NUMERIC(11, 8)` (e.g., 121.39579190)
- **Float (approximate, avoid for money):** `REAL`, `DOUBLE PRECISION`

### Boolean
- **Type:** `BOOLEAN`
- **Values:** `TRUE`, `FALSE`, `NULL` (if nullable)
- **Default:** Usually `FALSE` or `TRUE`, rarely NULL
- **Examples:** `is_active BOOLEAN DEFAULT TRUE`, `email_verified BOOLEAN DEFAULT FALSE`

### Dates & Times
- **Date only:** `DATE` (e.g., `2026-09-10`)
- **Time only:** `TIME` (e.g., `14:30:00`)
- **Date + Time (no timezone):** `TIMESTAMP` (avoid, prefer TIMESTAMPTZ)
- **Date + Time (with timezone):** `TIMESTAMPTZ` ← **PREFERRED**
  - Stores in UTC, converts on read based on session timezone
  - **Default:** `DEFAULT NOW()` or `DEFAULT CURRENT_TIMESTAMP`
- **Server Timezone:** `Asia/Manila` (set in PostgreSQL config)

### JSON
- **Type:** `JSONB` (binary, indexable, faster)
- **Avoid:** `JSON` (text-based, slower)
- **Use Cases:** 
  - Flexible metadata: `metadata JSONB`
  - API responses stored: `gcash_response JSONB`
  - Notifications data: `notification_data JSONB`

### UUID
- **Type:** `UUID`
- **Generation:** `gen_random_uuid()` (PostgreSQL built-in)
- **Use Cases:**
  - Public identifiers (booking reference)
  - External API keys
  - Session tokens
- **Indexing:** Always index UUIDs used for lookups

### Arrays (Use Sparingly)
- **Type:** `TEXT[]`, `INTEGER[]`, etc.
- **Example:** `tags TEXT[]`, `image_urls TEXT[]`
- **Caution:** Harder to query, consider separate junction table for many-to-many

---

## Constraints

### Primary Keys
```sql
id BIGSERIAL PRIMARY KEY
-- OR
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Rules:**
- Every table MUST have a primary key
- Use `BIGSERIAL` for internal IDs
- Use `UUID` for public-facing IDs (bookings, etc.)

### Foreign Keys
```sql
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
-- OR
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL  -- if orphans allowed
-- OR
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT  -- prevent delete if referenced
```

**ON DELETE Actions:**
- **CASCADE:** Delete child records when parent deleted
  - Use for: booking → booking_items (items should be deleted with booking)
- **SET NULL:** Set foreign key to NULL when parent deleted
  - Use for: bookings → technicians (keep booking if technician deleted, just unassign)
  - Column must be `NULL`-able
- **RESTRICT:** Prevent parent deletion if children exist (default)
  - Use for: important relationships where orphans indicate data integrity issue
- **NO ACTION:** Similar to RESTRICT (check at end of transaction)

### Unique Constraints
```sql
email VARCHAR(255) UNIQUE NOT NULL
-- OR (composite unique)
CONSTRAINT uniq_user_service UNIQUE (user_id, service_id)
```

### Check Constraints
```sql
-- Status enum
status VARCHAR(20) CHECK (status IN ('submitted', 'pending', 'confirmed'))

-- Positive amounts
amount NUMERIC(10, 2) CHECK (amount > 0)

-- Date range
CHECK (start_date < end_date)

-- Conditional requirement (at least one must be provided)
CHECK (email IS NOT NULL OR phone IS NOT NULL)
```

### NOT NULL Constraints
**Guidelines:**
- Use `NOT NULL` for columns that are always required
- Avoid `NOT NULL` if column is optional or added later
- Consider default values for `NOT NULL` columns

```sql
first_name VARCHAR(100) NOT NULL
middle_name VARCHAR(100)  -- optional, so no NOT NULL
role VARCHAR(20) NOT NULL DEFAULT 'customer'
```

---

## Indexes

### When to Create Indexes

**Always Index:**
1. Primary keys (automatic)
2. Foreign keys (manually)
3. Columns used in WHERE clauses frequently
4. Columns used in JOIN conditions
5. Columns used in ORDER BY
6. Unique constraints (automatic)

**Example:**
```sql
-- Foreign key index
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Status filter (used often)
CREATE INDEX idx_bookings_status ON bookings(status);

-- Date range queries
CREATE INDEX idx_bookings_appointment_date ON bookings(appointment_date);

-- Composite index for common query
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);

-- Descending order (for "latest first" queries)
CREATE INDEX idx_bookings_created_at_desc ON bookings(created_at DESC);

-- Partial index (only active records)
CREATE INDEX idx_users_active_email ON users(email) WHERE deleted_at IS NULL;
```

### Index Types

**B-Tree (default, most common):**
```sql
CREATE INDEX idx_users_email ON users(email);
```

**Partial Index (with WHERE clause):**
```sql
-- Only index non-deleted records
CREATE INDEX idx_bookings_active ON bookings(status) WHERE deleted_at IS NULL;
```

**Covering Index (INCLUDE clause, PostgreSQL 11+):**
```sql
-- Index on user_id, but also store status for index-only scans
CREATE INDEX idx_bookings_user_id_covering ON bookings(user_id) INCLUDE (status);
```

**GIN Index (for JSONB, arrays, full-text search):**
```sql
CREATE INDEX idx_bookings_metadata ON bookings USING GIN (metadata);
```

**GiST Index (for geometric data, ranges):**
```sql
-- For location-based queries (if using PostGIS)
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
```

### Index Maintenance

```sql
-- Rebuild index (if bloated or corrupted)
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on a table
REINDEX TABLE users;

-- Check index usage (query statistics)
SELECT 
    schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;  -- Low idx_scan = unused index
```

---

## Row Level Security (RLS)

### Enable RLS on All Tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**Important:** After enabling RLS, NO rows are accessible until policies are defined.

### Policy Naming Convention

**Format:** `{table}_{action}_{role}_policy`

**Examples:**
- `users_select_own_policy`
- `bookings_insert_customer_policy`
- `bookings_update_admin_policy`

### Common RLS Patterns

#### 1. Users Can Only See Their Own Data

```sql
-- Customers can only SELECT their own user record
CREATE POLICY users_select_own_policy ON users
    FOR SELECT
    USING (auth.uid() = uuid);

-- Customers can UPDATE their own record
CREATE POLICY users_update_own_policy ON users
    FOR UPDATE
    USING (auth.uid() = uuid);
```

#### 2. Customers Can Only See Their Own Bookings

```sql
CREATE POLICY bookings_select_customer_policy ON bookings
    FOR SELECT
    USING (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );
```

#### 3. Technicians Can Only See Assigned Bookings

```sql
CREATE POLICY bookings_select_technician_policy ON bookings
    FOR SELECT
    USING (
        technician_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );
```

#### 4. Admins Can See All Records

```sql
CREATE POLICY bookings_select_admin_policy ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uuid = auth.uid()
            AND role = 'admin'
        )
    );
```

#### 5. Admin Full Access (All Operations)

```sql
CREATE POLICY bookings_admin_all_policy ON bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE uuid = auth.uid()
            AND role = 'admin'
        )
    );
```

#### 6. Combining Multiple Conditions (OR)

```sql
-- Customers see own bookings, technicians see assigned, admins see all
CREATE POLICY bookings_select_policy ON bookings
    FOR SELECT
    USING (
        -- Customer sees own
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR
        -- Technician sees assigned
        technician_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR
        -- Admin sees all
        EXISTS (
            SELECT 1 FROM users 
            WHERE uuid = auth.uid() 
            AND role = 'admin'
        )
    );
```

#### 7. Restrict INSERT Based on Role

```sql
-- Only customers and admins can create bookings
CREATE POLICY bookings_insert_policy ON bookings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE uuid = auth.uid()
            AND role IN ('customer', 'admin')
        )
    );
```

#### 8. Soft Delete Visibility (Don't Show Deleted Records)

```sql
CREATE POLICY bookings_select_active_policy ON bookings
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
            OR
            EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
        )
    );
```

### Helper Function for Role Check

```sql
-- Create helper function to get current user's role
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
    SELECT role FROM users WHERE uuid = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Use in policies
CREATE POLICY bookings_admin_policy ON bookings
    FOR ALL
    USING (auth.user_role() = 'admin');
```

### Testing RLS Policies

```sql
-- Temporarily become a specific user (for testing)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Run your query
SELECT * FROM bookings;

-- Reset
RESET ROLE;
```

---

## Triggers & Functions

### Auto-Update `updated_at` Timestamp

```sql
-- Create reusable function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for all tables with updated_at
```

### Audit Log Trigger (Track Changes)

```sql
-- Create audit_logs table first
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id BIGINT NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id BIGINT REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id BIGINT;
BEGIN
    -- Get current user ID from Supabase auth
    SELECT id INTO current_user_id FROM users WHERE uuid = auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, current_user_id);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to tables you want to audit
CREATE TRIGGER audit_bookings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Soft Delete Trigger (Prevent Hard Delete)

```sql
CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard deletes are not allowed. Use soft delete (set deleted_at) instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booking_hard_delete
    BEFORE DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
```

### Auto-Delete Expired Bookings (Scheduled Job)

```sql
-- Create function
CREATE OR REPLACE FUNCTION delete_old_archived_records()
RETURNS void AS $$
BEGIN
    -- Delete bookings archived > 30 days ago
    DELETE FROM bookings 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    -- Repeat for other tables
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    -- Log the cleanup
    RAISE NOTICE 'Expired records deleted at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (Supabase extension)
-- Runs daily at 2:00 AM
SELECT cron.schedule('delete-old-archives', '0 2 * * *', 'SELECT delete_old_archived_records()');
```

---

## Migration Rules

### Migration File Naming

**Format:** `{timestamp}_{description}.sql`

**Example:** `20260910_create_users_table.sql`

### Migration Structure

```sql
-- Migration: Create users table
-- Created: 2026-09-10
-- Author: Development Team

BEGIN;

-- Create table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_uuid ON users(uuid);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY users_select_own_policy ON users
    FOR SELECT
    USING (auth.uid() = uuid);

-- Create triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE users IS 'User accounts for customers, technicians, and admins';
COMMENT ON COLUMN users.uuid IS 'Public-facing UUID for API usage';
COMMENT ON COLUMN users.role IS 'User role: admin, customer, or technician';

COMMIT;
```

### Rollback Migration

```sql
-- Rollback: Drop users table
-- Created: 2026-09-10

BEGIN;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP POLICY IF EXISTS users_select_own_policy ON users;
DROP TABLE IF EXISTS users CASCADE;

COMMIT;
```

### Migration Best Practices

1. **Always use transactions** (`BEGIN`/`COMMIT`)
2. **Test migrations** on development database first
3. **Backup production** before running migrations
4. **Document breaking changes** in migration comments
5. **Use IF EXISTS** in rollback scripts
6. **Version control** all migrations (Git)
7. **Never edit applied migrations** — create new migration to fix issues
8. **Check for locks** before altering large tables (use `pg_locks` view)

---

## Performance Tips

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE to understand query performance
EXPLAIN ANALYZE
SELECT * FROM bookings WHERE customer_id = 123 AND status = 'confirmed';

-- Look for:
-- - Seq Scan (bad) → add index
-- - Index Scan (good)
-- - Nested Loop (can be slow with large datasets)
-- - Hash Join (usually fast)
```

### Avoid N+1 Queries

❌ **Bad** (N+1 queries in application code):
```python
bookings = db.query(Booking).all()
for booking in bookings:
    customer = db.query(User).filter_by(id=booking.customer_id).first()
```

✅ **Good** (single query with JOIN):
```python
bookings = db.query(Booking).join(User).all()
```

### Use Connection Pooling

FastAPI + SQLAlchemy example:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Max connections
    max_overflow=10,     # Extra connections if needed
    pool_pre_ping=True   # Check connection health
)
```

### Bulk Inserts

❌ **Bad** (one query per row):
```python
for row in data:
    db.execute("INSERT INTO bookings (...) VALUES (...)")
```

✅ **Good** (bulk insert):
```python
db.bulk_insert_mappings(Booking, data)
```

---

## Conclusion

Following these database rules ensures:
- ✅ **Consistency** across all tables
- ✅ **Performance** through proper indexing
- ✅ **Security** via RLS policies
- ✅ **Maintainability** with clear conventions
- ✅ **Data Integrity** through constraints and triggers

**When in doubt, refer to this document. If a rule doesn't fit your use case, document the deviation and explain why.**

---

**Document Maintenance:**
- Review quarterly
- Update when new patterns emerge
- Add examples from real issues encountered

**Questions? Contact:** Development Team Lead

---

*These rules are mandatory for all KJAC system database work.*
