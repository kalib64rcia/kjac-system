# KJAC Database Tables

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Database:** PostgreSQL 15 (Supabase)

---

## Table of Contents
1. [Core User Management](#core-user-management)
2. [Booking Management](#booking-management)
3. [Service Catalog](#service-catalog)
4. [Feedback & Communication](#feedback--communication)
5. [Inventory Management](#inventory-management)
6. [Payroll & HR](#payroll--hr)
7. [System & Audit](#system--audit)
8. [Address Management (PSGC)](#address-management-psgc)

---

## Core User Management

### Table: `users`
**Purpose:** All user accounts (admins, customers, technicians)

```sql
CREATE TABLE users (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Business Keys
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    
    -- 3. Core Identity
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- 4. Verification Timestamps
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    
    -- 5. Core Attributes
    role VARCHAR(20) NOT NULL DEFAULT 'customer' 
        CHECK (role IN ('admin', 'customer', 'technician')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),
    
    -- 6. Profile
    profile_picture_url TEXT,
    date_of_birth DATE,
    
    -- 7. Address
    region_code VARCHAR(20),
    province_code VARCHAR(20),
    city_municipality_code VARCHAR(20),
    barangay_code VARCHAR(20),
    street_address TEXT,
    landmark VARCHAR(255),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- 8. Technician-Specific Stats
    total_jobs_completed INTEGER DEFAULT 0,
    average_rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
    
    -- 9. Auth/Security
    password_hash VARCHAR(255) NOT NULL,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    remember_token VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    
    -- 10. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 11. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_uuid ON users(uuid) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY users_select_own_policy ON users
    FOR SELECT
    USING (uuid = auth.uid());

-- Admins can view all users
CREATE POLICY users_select_admin_policy ON users
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

-- Users can update their own profile
CREATE POLICY users_update_own_policy ON users
    FOR UPDATE
    USING (uuid = auth.uid());

-- Only admins can insert/delete users
CREATE POLICY users_admin_modify_policy ON users
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

-- Trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'All user accounts: admins, customers, and technicians';
COMMENT ON COLUMN users.uuid IS 'Public-facing UUID for API usage (never expose id)';
```

---

### Table: `user_sessions`
**Purpose:** Active user sessions (JWT refresh tokens)

```sql
CREATE TABLE user_sessions (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 3. Session Data
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('web', 'ios', 'android')),
    
    -- 4. Context
    ip_address INET,
    user_agent TEXT,
    
    -- 5. Push Notification
    fcm_token TEXT,  -- Firebase Cloud Messaging token
    
    -- 6. Expiry
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);

-- RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_own_policy ON user_sessions
    FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE uuid = auth.uid()));

CREATE POLICY sessions_delete_own_policy ON user_sessions
    FOR DELETE
    USING (user_id = (SELECT id FROM users WHERE uuid = auth.uid()));

COMMENT ON TABLE user_sessions IS 'Active user sessions with refresh tokens and device info';
```

---

## Booking Management

### Table: `bookings`
**Purpose:** Main appointment/booking records

```sql
CREATE TABLE bookings (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Business Keys
    reference_id VARCHAR(50) UNIQUE NOT NULL CHECK (reference_id ~ '^KJAC-\d{4}-[A-Z0-9]{6}$'),
    
    -- 3. Foreign Keys
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    technician_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    brand_id BIGINT NOT NULL REFERENCES aircon_brands(id) ON DELETE RESTRICT,
    
    -- 4. Customer Contact (snapshot at booking time)
    customer_first_name VARCHAR(100) NOT NULL,
    customer_last_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(25) NOT NULL,
    
    -- 5. Address (snapshot at booking time)
    region_code VARCHAR(20),
    province_code VARCHAR(20),
    city_municipality_code VARCHAR(20),
    barangay_code VARCHAR(20),
    street_address TEXT NOT NULL,
    landmark VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- 6. Booking Details
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    problem_description TEXT,
    aircon_photos TEXT[],  -- Array of image URLs
    
    -- 7. Pricing
    down_payment_amount NUMERIC(10, 2) NOT NULL CHECK (down_payment_amount >= 0),
    total_service_cost NUMERIC(10, 2) CHECK (total_service_cost >= 0),
    
    -- 8. Status & Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' 
        CHECK (status IN ('submitted', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'expired', 'rescheduled')),
    
    -- 9. Status Timestamps
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pending_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    ongoing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- 10. Cancellation
    cancellation_reason TEXT,
    cancelled_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 11. Admin Notes
    admin_notes TEXT,
    
    -- 12. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 13. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bookings_reference_id ON bookings(reference_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_technician_id ON bookings(technician_id) WHERE technician_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_bookings_status ON bookings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_preferred_date ON bookings(preferred_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_brand_id ON bookings(brand_id);

-- Composite indexes for common queries
CREATE INDEX idx_bookings_customer_status ON bookings(customer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_technician_date ON bookings(technician_id, preferred_date) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Customers see own bookings
CREATE POLICY bookings_select_customer_policy ON bookings
    FOR SELECT
    USING (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

-- Technicians see assigned bookings
CREATE POLICY bookings_select_technician_policy ON bookings
    FOR SELECT
    USING (
        technician_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

-- Customers and admins can insert
CREATE POLICY bookings_insert_policy ON bookings
    FOR INSERT
    WITH CHECK (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

-- Only admins and assigned technicians can update
CREATE POLICY bookings_update_policy ON bookings
    FOR UPDATE
    USING (
        technician_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

-- Trigger to set expires_at on insert
CREATE OR REPLACE FUNCTION set_booking_expiry()
RETURNS TRIGGER AS $$
DECLARE
    expiry_hours INTEGER;
BEGIN
    -- Get expiry hours from system settings
    SELECT setting_value::INTEGER INTO expiry_hours
    FROM system_settings
    WHERE setting_key = 'booking_expiration_hours';
    
    -- Set expires_at if status is 'submitted'
    IF NEW.status = 'submitted' THEN
        NEW.expires_at := NEW.created_at + (expiry_hours || ' hours')::INTERVAL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_expiry_trigger
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_booking_expiry();

-- Trigger to update timestamp fields on status change
CREATE OR REPLACE FUNCTION update_booking_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        CASE NEW.status
            WHEN 'pending' THEN NEW.pending_at := NOW();
            WHEN 'confirmed' THEN NEW.confirmed_at := NOW();
            WHEN 'ongoing' THEN NEW.ongoing_at := NOW();
            WHEN 'completed' THEN NEW.completed_at := NOW();
            WHEN 'cancelled' THEN NEW.cancelled_at := NOW();
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_status_timestamps_trigger
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_booking_status_timestamps();

COMMENT ON TABLE bookings IS 'Customer appointment bookings for aircon services';
COMMENT ON COLUMN bookings.reference_id IS 'Public booking reference (e.g., KJAC-2026-ABC123)';
```

---

### Table: `booking_status_history`
**Purpose:** Audit trail of booking status changes

```sql
CREATE TABLE booking_status_history (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Status Change
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    
    -- 4. Notes
    notes TEXT,
    
    -- 5. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_booking_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_booking_history_created_at ON booking_status_history(created_at DESC);

-- RLS
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_history_select_policy ON booking_status_history
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
            OR technician_id = (SELECT id FROM users WHERE uuid = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

-- Trigger to auto-insert on booking status change
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id BIGINT;
BEGIN
    IF NEW.status != OLD.status THEN
        SELECT id INTO current_user_id FROM users WHERE uuid = auth.uid();
        
        INSERT INTO booking_status_history (booking_id, changed_by_user_id, old_status, new_status)
        VALUES (NEW.id, current_user_id, OLD.status, NEW.status);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_booking_status_change_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_booking_status_change();

COMMENT ON TABLE booking_status_history IS 'Audit trail of booking status transitions';
```

---

### Table: `reschedule_requests`
**Purpose:** Customer rescheduling requests

```sql
CREATE TABLE reschedule_requests (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    requested_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Old Schedule
    old_preferred_date DATE NOT NULL,
    old_preferred_time TIME NOT NULL,
    
    -- 4. New Schedule
    new_preferred_date DATE NOT NULL,
    new_preferred_time TIME NOT NULL,
    
    -- 5. Request Details
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'denied')),
    
    -- 6. Admin Response
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reschedule_booking_id ON reschedule_requests(booking_id);
CREATE INDEX idx_reschedule_status ON reschedule_requests(status);
CREATE INDEX idx_reschedule_requested_by ON reschedule_requests(requested_by_user_id);

-- RLS
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reschedule_select_policy ON reschedule_requests
    FOR SELECT
    USING (
        requested_by_user_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY reschedule_insert_policy ON reschedule_requests
    FOR INSERT
    WITH CHECK (
        requested_by_user_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );

CREATE POLICY reschedule_update_admin_policy ON reschedule_requests
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE reschedule_requests IS 'Customer requests to reschedule appointments';
```

---

## Service Catalog

### Table: `services`
**Purpose:** Available service types

```sql
CREATE TABLE services (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Service Details
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    detailed_description TEXT,
    
    -- 3. Pricing
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    down_payment_amount NUMERIC(10, 2) NOT NULL CHECK (down_payment_amount >= 0),
    down_payment_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (down_payment_type IN ('fixed', 'percentage')),
    
    -- 4. Duration
    estimated_duration_minutes INTEGER,
    
    -- 5. Step-by-Step Process
    process_steps JSONB,  -- Array of steps with descriptions
    
    -- 6. Display
    icon_name VARCHAR(50),  -- Lucide icon name
    badge_text VARCHAR(50),  -- e.g., "Popular", "New", "Premium"
    badge_color VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    
    -- 7. Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- 8. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 9. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_services_slug ON services(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_is_active ON services(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_display_order ON services(display_order, is_active) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_select_active_policy ON services
    FOR SELECT
    USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY services_admin_all_policy ON services
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE services IS 'Available service types (installation, repair, maintenance, etc.)';
```

---

### Table: `service_images`
**Purpose:** Service photos (before/after examples)

```sql
CREATE TABLE service_images (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- 3. Image Data
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) CHECK (image_type IN ('before', 'after', 'process', 'hero')),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_images_service_id ON service_images(service_id, display_order);

-- RLS
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_images_select_all_policy ON service_images
    FOR SELECT
    USING (TRUE);

CREATE POLICY service_images_admin_all_policy ON service_images
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE service_images IS 'Photos showcasing services (before/after, process steps)';
```

---

### Table: `aircon_brands`
**Purpose:** Supported aircon brands

```sql
CREATE TABLE aircon_brands (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Brand Details
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- 3. Partnership
    is_partner BOOLEAN DEFAULT FALSE,  -- TRUE for Daikin (official partner)
    
    -- 4. Display
    badge_text VARCHAR(50),  -- e.g., "Official Partner", "New Brand", "Authorized"
    badge_color VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    
    -- 5. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 6. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 7. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_brands_slug ON aircon_brands(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_brands_is_active ON aircon_brands(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_brands_is_partner ON aircon_brands(is_partner) WHERE deleted_at IS NULL;
CREATE INDEX idx_brands_display_order ON aircon_brands(display_order, is_active) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE aircon_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_select_active_policy ON aircon_brands
    FOR SELECT
    USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY brands_admin_all_policy ON aircon_brands
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

-- Insert default brands
INSERT INTO aircon_brands (name, slug, is_partner, badge_text, badge_color, display_order) VALUES
('Daikin', 'daikin', TRUE, 'Official Partner', '#0066CC', 1),
('Carrier', 'carrier', FALSE, NULL, NULL, 2),
('Panasonic', 'panasonic', FALSE, NULL, NULL, 3),
('LG', 'lg', FALSE, NULL, NULL, 4),
('Samsung', 'samsung', FALSE, NULL, NULL, 5),
('Hitachi', 'hitachi', FALSE, NULL, NULL, 6),
('Midea', 'midea', FALSE, NULL, NULL, 7),
('TCL', 'tcl', FALSE, NULL, NULL, 8),
('Sharp', 'sharp', FALSE, NULL, NULL, 9),
('Toshiba', 'toshiba', FALSE, NULL, NULL, 10);

COMMENT ON TABLE aircon_brands IS 'Aircon brands serviced by KJAC (Daikin is official partner)';
```

---

### Table: `brand_images`
**Purpose:** Brand logos and product images

```sql
CREATE TABLE brand_images (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    brand_id BIGINT NOT NULL REFERENCES aircon_brands(id) ON DELETE CASCADE,
    
    -- 3. Image Data
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) CHECK (image_type IN ('logo', 'product', 'banner')),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_images_brand_id ON brand_images(brand_id, display_order);

-- RLS
ALTER TABLE brand_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_images_select_all_policy ON brand_images
    FOR SELECT
    USING (TRUE);

CREATE POLICY brand_images_admin_all_policy ON brand_images
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE brand_images IS 'Brand logos and product photos';
```

---

## Feedback & Communication

### Table: `payments`
**Purpose:** Payment records (down payment, full payment)

```sql
CREATE TABLE payments (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Payment Details
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('down_payment', 'full_payment', 'additional')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) CHECK (payment_method IN ('gcash', 'cash', 'bank_transfer', 'online')),
    
    -- 4. GCash Verification
    gcash_reference_number VARCHAR(100),
    gcash_receipt_url TEXT,
    
    -- 5. Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'verified', 'rejected')),
    
    -- 6. Verification
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_policy ON payments
    FOR SELECT
    USING (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY payments_insert_policy ON payments
    FOR INSERT
    WITH CHECK (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY payments_update_admin_policy ON payments
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE payments IS 'Payment records with GCash receipt verification';
```

---

### Table: `refunds`
**Purpose:** Refund requests and processing

```sql
CREATE TABLE refunds (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    requested_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    processed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Refund Details
    refund_amount NUMERIC(10, 2) NOT NULL CHECK (refund_amount >= 0),
    refund_type VARCHAR(20) CHECK (refund_type IN ('full', 'partial', 'none')),
    
    -- 4. Reason & Status
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing' 
        CHECK (status IN ('processing', 'approved', 'denied', 'completed')),
    
    -- 5. Admin Decision
    admin_notes TEXT,
    denial_reason TEXT,
    
    -- 6. Processing
    refund_method VARCHAR(20) CHECK (refund_method IN ('gcash', 'bank_transfer', 'cash')),
    processed_at TIMESTAMPTZ,
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_requested_by ON refunds(requested_by_user_id);

-- RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY refunds_select_policy ON refunds
    FOR SELECT
    USING (
        requested_by_user_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY refunds_insert_policy ON refunds
    FOR INSERT
    WITH CHECK (
        requested_by_user_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );

CREATE POLICY refunds_update_admin_policy ON refunds
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE refunds IS 'Refund requests and processing records';
```

---

### Table: `ratings`
**Purpose:** Customer ratings for technicians

```sql
CREATE TABLE ratings (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technician_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 3. Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 5. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ratings_booking_id ON ratings(booking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ratings_customer_id ON ratings(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ratings_technician_id ON ratings(technician_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ratings_rating ON ratings(rating) WHERE deleted_at IS NULL;
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);

-- RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ratings_select_policy ON ratings
    FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY ratings_insert_customer_policy ON ratings
    FOR INSERT
    WITH CHECK (
        customer_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );

CREATE POLICY ratings_delete_admin_policy ON ratings
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

-- Trigger to update technician average rating
CREATE OR REPLACE FUNCTION update_technician_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0.00)
            FROM ratings
            WHERE technician_id = NEW.technician_id
            AND deleted_at IS NULL
        )
    WHERE id = NEW.technician_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_technician_rating_trigger
    AFTER INSERT ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_technician_rating();

COMMENT ON TABLE ratings IS 'Customer ratings and reviews for technicians (1-5 stars)';
```

---

### Table: `message_threads`
**Purpose:** Chat conversation threads

```sql
CREATE TABLE message_threads (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    participant_user_ids BIGINT[] NOT NULL,  -- Array of user IDs in thread
    
    -- 3. Thread Type
    thread_type VARCHAR(20) NOT NULL CHECK (thread_type IN ('booking_chat', 'general_message')),
    
    -- 4. Last Message
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    
    -- 5. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 6. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_booking_id ON message_threads(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_threads_participants ON message_threads USING GIN(participant_user_ids);
CREATE INDEX idx_threads_last_message ON message_threads(last_message_at DESC);

-- RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY threads_select_policy ON message_threads
    FOR SELECT
    USING (
        (SELECT id FROM users WHERE uuid = auth.uid()) = ANY(participant_user_ids)
    );

COMMENT ON TABLE message_threads IS 'Chat conversation threads (booking-specific or general)';
```

---

### Table: `messages`
**Purpose:** Chat messages

```sql
CREATE TABLE messages (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    thread_id BIGINT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 3. Message Content
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
    
    -- 4. Read Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 5. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_thread_id ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_policy ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM message_threads
            WHERE id = messages.thread_id
            AND (SELECT id FROM users WHERE uuid = auth.uid()) = ANY(participant_user_ids)
        )
    );

CREATE POLICY messages_insert_policy ON messages
    FOR INSERT
    WITH CHECK (
        sender_id = (SELECT id FROM users WHERE uuid = auth.uid())
    );

-- Trigger to update thread last_message
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE message_threads
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.message_text, 100),
        updated_at = NOW()
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();

COMMENT ON TABLE messages IS 'Chat messages within conversation threads';
```

---

### Table: `notifications`
**Purpose:** Push notifications and in-app alerts

```sql
CREATE TABLE notifications (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- 3. Notification Content
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'booking_submitted', 'payment_uploaded', 'payment_verified', 'payment_rejected',
        'booking_confirmed', 'technician_assigned', 'technician_on_way', 'technician_arrived',
        'service_started', 'service_completed', 'booking_cancelled', 'booking_expiring',
        'refund_approved', 'refund_denied', 'refund_completed',
        'reschedule_approved', 'reschedule_denied',
        'low_stock_alert', 'technician_pending_approval', 'password_reset', 'account_locked'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- 4. Additional Data
    data JSONB,  -- Extra data for deep linking
    
    -- 5. Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 6. Delivery
    sent_via_push BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_booking_id ON notifications(booking_id) WHERE booking_id IS NOT NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own_policy ON notifications
    FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE uuid = auth.uid()));

CREATE POLICY notifications_update_own_policy ON notifications
    FOR UPDATE
    USING (user_id = (SELECT id FROM users WHERE uuid = auth.uid()));

-- Auto-delete old read notifications (90 days)
-- This would be handled by a scheduled cron job

COMMENT ON TABLE notifications IS 'Push notifications and in-app alerts for users';
```

---

## Inventory Management

### Table: `inventory_items`
**Purpose:** Stock items (aircon units, replacement parts)

```sql
CREATE TABLE inventory_items (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Business Keys
    sku VARCHAR(50) UNIQUE NOT NULL,
    qr_code VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    
    -- 3. Item Details
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('aircon_unit', 'replacement_part', 'tool', 'consumable')),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 4. For Aircon Units
    brand_id BIGINT REFERENCES aircon_brands(id) ON DELETE SET NULL,
    model_number VARCHAR(100),
    
    -- 5. For Parts
    part_number VARCHAR(100),
    compatible_brands TEXT[],  -- Array of brand names
    
    -- 6. Stock Management
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    minimum_stock_level INTEGER DEFAULT 10,
    unit_of_measure VARCHAR(20) DEFAULT 'piece',  -- piece, box, set, etc.
    
    -- 7. Pricing
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    selling_price NUMERIC(10, 2) CHECK (selling_price >= 0),
    
    -- 8. Location
    storage_location VARCHAR(100),
    
    -- 9. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 10. Images
    image_url TEXT,
    
    -- 11. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 12. Soft Delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_inventory_sku ON inventory_items(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_qr_code ON inventory_items(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX idx_inventory_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_type ON inventory_items(item_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_brand_id ON inventory_items(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX idx_inventory_low_stock ON inventory_items(quantity) WHERE quantity <= minimum_stock_level AND is_active = TRUE;

-- RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_select_all_policy ON inventory_items
    FOR SELECT
    USING (TRUE);  -- All authenticated users can view inventory

CREATE POLICY inventory_admin_all_policy ON inventory_items
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE inventory_items IS 'Stock inventory: aircon units, parts, tools, consumables';
COMMENT ON COLUMN inventory_items.qr_code IS 'QR code for scanning (generated by system)';
```

---

### Table: `inventory_movements`
**Purpose:** Track all stock in/out transactions

```sql
CREATE TABLE inventory_movements (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- 3. Movement Details
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'damaged', 'returned')),
    quantity INTEGER NOT NULL,  -- Positive for in, negative for out
    
    -- 4. Previous and New Stock
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    
    -- 5. Reason/Notes
    reason TEXT,
    reference_number VARCHAR(100),  -- PO number, invoice number, etc.
    
    -- 6. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX idx_movements_user_id ON inventory_movements(user_id);
CREATE INDEX idx_movements_booking_id ON inventory_movements(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at DESC);

-- RLS
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY movements_select_policy ON inventory_movements
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role IN ('admin', 'technician'))
    );

CREATE POLICY movements_insert_policy ON inventory_movements
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role IN ('admin', 'technician'))
    );

-- Trigger to update inventory quantity
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_items
    SET 
        quantity = NEW.new_quantity,
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
    
    -- Check if low stock alert needed
    IF NEW.new_quantity <= (SELECT minimum_stock_level FROM inventory_items WHERE id = NEW.inventory_item_id) THEN
        -- Create notification for admin
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            u.id,
            'low_stock_alert',
            'Low Stock Alert',
            'Item ' || ii.name || ' is running low (Quantity: ' || NEW.new_quantity || ')',
            jsonb_build_object('inventory_item_id', NEW.inventory_item_id, 'quantity', NEW.new_quantity)
        FROM users u
        CROSS JOIN inventory_items ii
        WHERE u.role = 'admin' AND ii.id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_quantity_trigger
    AFTER INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION update_inventory_quantity();

COMMENT ON TABLE inventory_movements IS 'Audit trail of all stock movements (in, out, adjustments)';
```

---

### Table: `booking_inventory_usage`
**Purpose:** Track parts/items used in bookings

```sql
CREATE TABLE booking_inventory_usage (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    -- 3. Usage Details
    quantity_used INTEGER NOT NULL CHECK (quantity_used > 0),
    unit_cost NUMERIC(10, 2) NOT NULL,  -- Snapshot at time of use
    total_cost NUMERIC(10, 2) NOT NULL,
    
    -- 4. Notes
    notes TEXT,
    
    -- 5. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_booking_inventory_booking_id ON booking_inventory_usage(booking_id);
CREATE INDEX idx_booking_inventory_item_id ON booking_inventory_usage(inventory_item_id);

-- RLS
ALTER TABLE booking_inventory_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_inventory_select_policy ON booking_inventory_usage
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role IN ('admin', 'technician'))
    );

COMMENT ON TABLE booking_inventory_usage IS 'Parts and items used in specific bookings';
```

---

## Payroll & HR

### Table: `employee_info`
**Purpose:** Extended employee data (linked to users)

```sql
CREATE TABLE employee_info (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 3. Government IDs
    tin VARCHAR(50),  -- Tax Identification Number
    sss_number VARCHAR(50),
    philhealth_number VARCHAR(50),
    pagibig_number VARCHAR(50),
    
    -- 4. Bank Details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(200),
    
    -- 5. Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(20),
    
    -- 6. Employment Details
    employment_start_date DATE,
    employment_end_date DATE,
    employment_status VARCHAR(20) CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'resigned')),
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employee_info_user_id ON employee_info(user_id);
CREATE INDEX idx_employee_info_employment_status ON employee_info(employment_status);

-- RLS
ALTER TABLE employee_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_info_select_own_policy ON employee_info
    FOR SELECT
    USING (
        user_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR
        EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY employee_info_admin_all_policy ON employee_info
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE employee_info IS 'Extended employee information (government IDs, bank details, emergency contact)';
```

---

### Table: `payroll_records`
**Purpose:** Payroll calculation records

```sql
CREATE TABLE payroll_records (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    employee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    processed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Payroll Period
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    
    -- 4. Earnings
    base_salary NUMERIC(10, 2) DEFAULT 0.00,
    commission NUMERIC(10, 2) DEFAULT 0.00,
    overtime_pay NUMERIC(10, 2) DEFAULT 0.00,
    bonuses NUMERIC(10, 2) DEFAULT 0.00,
    other_earnings NUMERIC(10, 2) DEFAULT 0.00,
    total_earnings NUMERIC(10, 2) NOT NULL,
    
    -- 5. Deductions
    tax_withheld NUMERIC(10, 2) DEFAULT 0.00,
    sss_contribution NUMERIC(10, 2) DEFAULT 0.00,
    philhealth_contribution NUMERIC(10, 2) DEFAULT 0.00,
    pagibig_contribution NUMERIC(10, 2) DEFAULT 0.00,
    other_deductions NUMERIC(10, 2) DEFAULT 0.00,
    total_deductions NUMERIC(10, 2) NOT NULL,
    
    -- 6. Net Pay
    net_pay NUMERIC(10, 2) NOT NULL,
    
    -- 7. Payment Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    -- 8. Payment Method
    payment_method VARCHAR(20) CHECK (payment_method IN ('bank_transfer', 'cash', 'gcash')),
    
    -- 9. Notes
    notes TEXT,
    payslip_url TEXT,
    
    -- 10. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payroll_employee_id ON payroll_records(employee_user_id);
CREATE INDEX idx_payroll_period ON payroll_records(period_start_date, period_end_date);
CREATE INDEX idx_payroll_payment_date ON payroll_records(payment_date);
CREATE INDEX idx_payroll_status ON payroll_records(status);

-- RLS
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_select_own_policy ON payroll_records
    FOR SELECT
    USING (
        employee_user_id = (SELECT id FROM users WHERE uuid = auth.uid())
        OR
        EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin')
    );

CREATE POLICY payroll_admin_all_policy ON payroll_records
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE payroll_records IS 'Payroll calculation and payment records for employees';
```

---

### Table: `commission_rules`
**Purpose:** Commission calculation rules per service

```sql
CREATE TABLE commission_rules (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    service_id BIGINT REFERENCES services(id) ON DELETE CASCADE,
    
    -- 3. Commission Details
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed_amount')),
    commission_value NUMERIC(10, 2) NOT NULL,  -- Percentage (e.g., 15.00) or fixed amount
    
    -- 4. Applicability
    applies_to_all_services BOOLEAN DEFAULT FALSE,
    
    -- 5. Effective Dates
    effective_from DATE NOT NULL,
    effective_until DATE,
    
    -- 6. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 7. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_commission_service_id ON commission_rules(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_commission_effective ON commission_rules(effective_from, effective_until) WHERE is_active = TRUE;

-- RLS
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_admin_all_policy ON commission_rules
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

COMMENT ON TABLE commission_rules IS 'Commission calculation rules for technicians per service';
```

---

## System & Audit

### Table: `audit_logs`
**Purpose:** Complete audit trail of all changes

```sql
CREATE TABLE audit_logs (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Foreign Keys
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- 3. Action Details
    table_name VARCHAR(50) NOT NULL,
    record_id BIGINT NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
    
    -- 4. Data Changes
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],  -- Array of changed field names
    
    -- 5. Context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),  -- For tracing related operations
    
    -- 6. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_admin_policy ON audit_logs
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'));

-- No INSERT/UPDATE/DELETE policies - only triggers can modify audit_logs

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all data changes (who, what, when)';
```

---

### Table: `system_settings`
**Purpose:** Application configuration

```sql
CREATE TABLE system_settings (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. Setting Key
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    
    -- 3. Setting Value
    setting_value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'integer', 'boolean', 'json')),
    
    -- 4. Metadata
    category VARCHAR(50),  -- e.g., 'rate_limiting', 'booking', 'email', 'payment'
    description TEXT,
    
    -- 5. Validation
    is_editable BOOLEAN DEFAULT TRUE,
    validation_rule TEXT,  -- JSON schema or regex
    
    -- 6. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_settings_key ON system_settings(setting_key);
CREATE INDEX idx_settings_category ON system_settings(category);

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select_all_policy ON system_settings
    FOR SELECT
    USING (TRUE);  -- All authenticated users can view settings

CREATE POLICY settings_admin_modify_policy ON system_settings
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE uuid = auth.uid() AND role = 'admin'))
    WITH CHECK (is_editable = TRUE);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, data_type, category, description) VALUES
('booking_expiration_hours', '3', 'integer', 'booking', 'Hours until booking expires without payment'),
('login_max_attempts', '5', 'integer', 'rate_limiting', 'Maximum failed login attempts before lockout'),
('login_lockout_minutes', '15', 'integer', 'rate_limiting', 'Minutes account is locked after max failed attempts'),
('booking_rate_limit_count', '3', 'integer', 'rate_limiting', 'Maximum bookings per time window'),
('booking_rate_limit_minutes', '30', 'integer', 'rate_limiting', 'Time window for booking rate limit (minutes)'),
('archive_auto_delete_days', '30', 'integer', 'system', 'Days before archived records are permanently deleted'),
('business_email', 'abadeciomar@yahoo.com', 'string', 'business', 'Business contact email'),
('business_phone', '0926-633-3129', 'string', 'business', 'Business contact phone'),
('session_timeout_minutes', '30', 'integer', 'auth', 'Web admin session timeout (minutes)'),
('api_rate_limit_public', '100', 'integer', 'rate_limiting', 'Public API requests per minute'),
('api_rate_limit_authenticated', '300', 'integer', 'rate_limiting', 'Authenticated API requests per minute'),
('api_rate_limit_admin', '500', 'integer', 'rate_limiting', 'Admin API requests per minute'),
('gcash_account_number', '0912-345-6789', 'string', 'payment', 'Business GCash account number for down payments'),
('gcash_account_name', 'Juan Dela Cruz', 'string', 'payment', 'Business GCash account name (must match GCash profile)'),
('allow_sunday_bookings', 'false', 'boolean', 'booking', 'Allow customers to book appointments on Sunday');

COMMENT ON TABLE system_settings IS 'Application configuration settings (rate limits, timeouts, business rules)';
```

---

## Address Management (PSGC)

### Table: `psgc_regions`
**Purpose:** Philippine regions (cached from PSGC API)

```sql
CREATE TABLE psgc_regions (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. PSGC Data
    region_code VARCHAR(20) UNIQUE NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    
    -- 3. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_regions_code ON psgc_regions(region_code);
CREATE INDEX idx_regions_is_active ON psgc_regions(is_active);

-- RLS
ALTER TABLE psgc_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY regions_select_all_policy ON psgc_regions
    FOR SELECT
    USING (is_active = TRUE);

COMMENT ON TABLE psgc_regions IS 'Philippine regions (from PSGC API)';
```

---

### Table: `psgc_provinces`
**Purpose:** Philippine provinces

```sql
CREATE TABLE psgc_provinces (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. PSGC Data
    province_code VARCHAR(20) UNIQUE NOT NULL,
    province_name VARCHAR(100) NOT NULL,
    region_code VARCHAR(20) NOT NULL REFERENCES psgc_regions(region_code) ON DELETE CASCADE,
    
    -- 3. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provinces_code ON psgc_provinces(province_code);
CREATE INDEX idx_provinces_region ON psgc_provinces(region_code);
CREATE INDEX idx_provinces_is_active ON psgc_provinces(is_active);

-- RLS
ALTER TABLE psgc_provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY provinces_select_all_policy ON psgc_provinces
    FOR SELECT
    USING (is_active = TRUE);

COMMENT ON TABLE psgc_provinces IS 'Philippine provinces (from PSGC API)';
```

---

### Table: `psgc_cities_municipalities`
**Purpose:** Philippine cities and municipalities

```sql
CREATE TABLE psgc_cities_municipalities (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. PSGC Data
    city_municipality_code VARCHAR(20) UNIQUE NOT NULL,
    city_municipality_name VARCHAR(100) NOT NULL,
    province_code VARCHAR(20) NOT NULL REFERENCES psgc_provinces(province_code) ON DELETE CASCADE,
    is_city BOOLEAN DEFAULT FALSE,
    
    -- 3. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cities_code ON psgc_cities_municipalities(city_municipality_code);
CREATE INDEX idx_cities_province ON psgc_cities_municipalities(province_code);
CREATE INDEX idx_cities_is_active ON psgc_cities_municipalities(is_active);

-- RLS
ALTER TABLE psgc_cities_municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY cities_select_all_policy ON psgc_cities_municipalities
    FOR SELECT
    USING (is_active = TRUE);

COMMENT ON TABLE psgc_cities_municipalities IS 'Philippine cities and municipalities (from PSGC API)';
```

---

### Table: `psgc_barangays`
**Purpose:** Philippine barangays

```sql
CREATE TABLE psgc_barangays (
    -- 1. Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- 2. PSGC Data
    barangay_code VARCHAR(20) UNIQUE NOT NULL,
    barangay_name VARCHAR(100) NOT NULL,
    city_municipality_code VARCHAR(20) NOT NULL REFERENCES psgc_cities_municipalities(city_municipality_code) ON DELETE CASCADE,
    
    -- 3. Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 4. Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_barangays_code ON psgc_barangays(barangay_code);
CREATE INDEX idx_barangays_city ON psgc_barangays(city_municipality_code);
CREATE INDEX idx_barangays_is_active ON psgc_barangays(is_active);

-- RLS
ALTER TABLE psgc_barangays ENABLE ROW LEVEL SECURITY;

CREATE POLICY barangays_select_all_policy ON psgc_barangays
    FOR SELECT
    USING (is_active = TRUE);

COMMENT ON TABLE psgc_barangays IS 'Philippine barangays (from PSGC API)';
```

---

## Summary

### Total Tables: 30

#### Core Tables (9)
1. users
2. user_sessions
3. bookings
4. booking_status_history
5. reschedule_requests
6. services
7. service_images
8. aircon_brands
9. brand_images

#### Financial Tables (2)
10. payments
11. refunds

#### Feedback & Communication (5)
12. ratings
13. message_threads
14. messages
15. notifications

#### Inventory (3)
16. inventory_items
17. inventory_movements
18. booking_inventory_usage

#### Payroll & HR (3)
19. employee_info
20. payroll_records
21. commission_rules

#### System & Audit (2)
22. audit_logs
23. system_settings

#### Address (PSGC) (4)
24. psgc_regions
25. psgc_provinces
26. psgc_cities_municipalities
27. psgc_barangays

---

## Database Size Estimates

**Year 1 Projections:**
- Users: ~500 records × 2KB = ~1 MB
- Bookings: ~2,000 records × 3KB = ~6 MB
- Messages: ~10,000 records × 1KB = ~10 MB
- Notifications: ~20,000 records × 0.5KB = ~10 MB
- Audit Logs: ~50,000 records × 2KB = ~100 MB
- Inventory: ~500 records × 2KB = ~1 MB
- PSGC Data: ~42,000 records × 0.5KB = ~21 MB
- Other Tables: ~10 MB

**Total (excluding images): ~160 MB**

**Images (Supabase Storage):**
- Profile pictures: ~500 × 200KB = ~100 MB
- Payment receipts: ~2,000 × 500KB = ~1 GB
- Service/brand images: ~100 × 1MB = ~100 MB
- Aircon problem photos: ~1,000 × 500KB = ~500 MB

**Total Storage Year 1: ~1.86 GB**

---

## Maintenance Scripts

### Clean Up Old Notifications (90 days)
```sql
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days'
AND is_read = TRUE;
```

### Expire Old Bookings (Auto-run via pg_cron)
```sql
UPDATE bookings
SET status = 'expired'
WHERE status = 'submitted'
AND expires_at < NOW()
AND expires_at IS NOT NULL;
```

### Permanently Delete Old Archives (30 days)
```sql
-- Bookings
DELETE FROM bookings 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '30 days';

-- Users
DELETE FROM users 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '30 days';

-- Add for other tables...
```

### Update Technician Stats (Daily)
```sql
UPDATE users
SET 
    total_jobs_completed = (
        SELECT COUNT(*)
        FROM bookings
        WHERE technician_id = users.id
        AND status = 'completed'
        AND deleted_at IS NULL
    ),
    average_rating = (
        SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0.00)
        FROM ratings
        WHERE technician_id = users.id
        AND deleted_at IS NULL
    )
WHERE role = 'technician';
```

---

## Migration Order

When creating the database from scratch, follow this order to respect foreign key dependencies:

```sql
-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Helper Functions
CREATE FUNCTION update_updated_at_column() ...
CREATE FUNCTION audit_trigger_function() ...

-- 3. Independent Tables
CREATE TABLE psgc_regions;
CREATE TABLE users;
CREATE TABLE services;
CREATE TABLE aircon_brands;
CREATE TABLE system_settings;

-- 4. Tables with Single Dependencies
CREATE TABLE psgc_provinces;
CREATE TABLE user_sessions;
CREATE TABLE service_images;
CREATE TABLE brand_images;
CREATE TABLE employee_info;

-- 5. Tables with Multiple Dependencies
CREATE TABLE psgc_cities_municipalities;
CREATE TABLE bookings;
CREATE TABLE inventory_items;

-- 6. Tables Dependent on Bookings
CREATE TABLE psgc_barangays;
CREATE TABLE booking_status_history;
CREATE TABLE reschedule_requests;
CREATE TABLE payments;
CREATE TABLE refunds;
CREATE TABLE ratings;
CREATE TABLE message_threads;
CREATE TABLE inventory_movements;
CREATE TABLE booking_inventory_usage;

-- 7. Final Tables
CREATE TABLE messages;
CREATE TABLE notifications;
CREATE TABLE payroll_records;
CREATE TABLE commission_rules;
CREATE TABLE audit_logs;
```

---

**Document Status:** Complete ✅  
**Reviewed By:** Database Team  
**Next Update:** When new tables are added or schemas change

---

*This schema supports the complete KJAC system from initial launch through future growth.*
