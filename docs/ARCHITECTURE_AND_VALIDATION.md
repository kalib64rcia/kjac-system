# KJAC System - Architecture & Validation Rules

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Purpose:** Define system architecture, validation strategies, and implementation rules

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [Validation Strategy](#validation-strategy)
4. [Server-Side Validation Rules](#server-side-validation-rules)
5. [Client-Side Validation Rules](#client-side-validation-rules)
6. [Fixed Issues](#fixed-issues)
7. [Implementation Guidelines](#implementation-guidelines)

---

## System Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Dumb UI)                     │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │   React Web Application  │  │  Flutter Mobile Application  ││
│  │   (TypeScript + Tailwind)│  │  (Customer + Technician)     ││
│  │                          │  │                              ││
│  │  • Admin Panel (routes)  │  │  • Role-based UI             ││
│  │  • Public Website        │  │  • Bottom tab navigation     ││
│  │  • Multi-page routing    │  │  • Shared backend            ││
│  │                          │  │                              ││
│  │  Responsibility:         │  │  Responsibility:             ││
│  │  ✓ UI/UX rendering       │  │  ✓ UI/UX rendering           ││
│  │  ✓ Client validation (UX)│  │  ✓ Client validation (UX)    ││
│  │  ✓ API calls to FastAPI  │  │  ✓ API calls to FastAPI      ││
│  │  ✗ NO business logic     │  │  ✗ NO business logic         ││
│  │  ✗ NO database access    │  │  ✗ NO database access        ││
│  └────────────┬─────────────┘  └────────────┬─────────────────┘│
│               │                             │                  │
│               └──────────────┬──────────────┘                  │
│                              │                                 │
│                        HTTPS/REST API                          │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────┐
│                      BACKEND LAYER (Smart)                      │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │             FastAPI Application Server                    │  │
│  │             (Single Unified Backend)                      │  │
│  │                                                           │  │
│  │  Responsibilities:                                        │  │
│  │  ✓ ALL business logic enforcement                        │  │
│  │  ✓ ALL server-side validation (Pydantic)                 │  │
│  │  ✓ Authentication bridge (Supabase JWT → verify)         │  │
│  │  ✓ Authorization (role-based access control)             │  │
│  │  ✓ Database operations (SQLAlchemy ORM)                  │  │
│  │  ✓ File upload/download                                  │  │
│  │  ✓ API key management (.env - never exposed)             │  │
│  │  ✓ Email sending (SMTP)                                  │  │
│  │  ✓ Push notification triggers (FCM)                      │  │
│  │  ✓ Background tasks (Celery - future)                    │  │
│  │  ✓ Rate limiting enforcement                             │  │
│  │                                                           │  │
│  │  Serves:                                                  │  │
│  │  • React Web (admin + public)                            │  │
│  │  • Flutter Mobile (customer + technician)                │  │
│  │  • Same API endpoints for both                           │  │
│  │                                                           │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│                       SQLAlchemy ORM                            │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                      DATABASE LAYER                             │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │         Supabase PostgreSQL Database (v15)               │  │
│  │                                                          │  │
│  │  Access Rules:                                           │  │
│  │  ✓ ONLY FastAPI can talk directly to database           │  │
│  │  ✓ Row Level Security (RLS) enabled on all tables       │  │
│  │  ✓ Triggers & functions for automated tasks             │  │
│  │  ✓ CHECK constraints for data integrity                 │  │
│  │  ✗ NO direct client access (web/mobile)                 │  │
│  │  ✗ NO connection pooling from clients                   │  │
│  │                                                          │  │
│  │  Tables: 30+                                             │  │
│  │  Data: users, bookings, payments, services, etc.        │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Architectural Rules

### 🚫 NEVER DO THIS:

```javascript
// ❌ WRONG - Client talking directly to database
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
const { data } = await supabase.from('bookings').select('*')

// ❌ WRONG - Business logic in client
function calculateDownPayment(servicePrice) {
  return servicePrice * 0.3  // Business logic belongs in backend!
}

// ❌ WRONG - Trusting client-side validation
if (emailIsValid) {  // This can be bypassed!
  submitBooking(data)
}
```

### ✅ ALWAYS DO THIS:

```javascript
// ✅ CORRECT - Client calls FastAPI backend
import axios from 'axios'
const response = await axios.get('/api/bookings', {
  headers: { Authorization: `Bearer ${token}` }
})

// ✅ CORRECT - Backend calculates everything
// Frontend just displays what backend returns
const { down_payment_amount } = response.data.booking

// ✅ CORRECT - Client validation is for UX only
if (emailIsValid) {
  // Still validate on server!
  await axios.post('/api/bookings', data)
    .catch(error => {
      // Show server validation errors
      showErrors(error.response.data.errors)
    })
}
```

---

## Data Flow

### 1. Booking Creation Flow

```
┌─────────────┐
│   Customer  │
│  (Web/Mobile)│
└──────┬──────┘
       │ 1. Fill form
       │    (client validation: UX only)
       ▼
┌─────────────────────┐
│   React / Flutter   │
│   Form Component    │
└──────┬──────────────┘
       │ 2. POST /api/bookings
       │    Authorization: Bearer {JWT}
       │    Body: { customer_name, ... }
       ▼
┌─────────────────────────────────────┐
│         FastAPI Backend             │
│                                     │
│  3. Verify JWT token (Supabase)    │
│  4. Validate request (Pydantic):   │
│     • Check required fields         │
│     • Validate email format         │
│     • Validate phone number         │
│     • Check date is future          │
│     • Check Sunday booking allowed  │
│     • Check rate limiting           │
│  5. Apply business logic:           │
│     • Generate reference ID         │
│     • Calculate expires_at          │
│     • Set default status            │
│  6. Insert to database (SQLAlchemy)│
└──────┬──────────────────────────────┘
       │ 7. SQL INSERT
       ▼
┌─────────────────┐
│   PostgreSQL    │
│   bookings      │
│   • RLS policy  │
│   • Triggers    │
└──────┬──────────┘
       │ 8. Return new booking
       ▼
┌─────────────────────────┐
│    FastAPI Backend      │
│  9. Format response     │
│  10. Return JSON        │
└──────┬──────────────────┘
       │ 11. 201 Created
       │     { booking: {...}, message: "..." }
       ▼
┌─────────────────────┐
│  React / Flutter    │
│  12. Show success   │
│  13. Redirect       │
└─────────────────────┘
```

**Key Points:**
- ✅ Validation happens TWICE (client + server)
- ✅ Client validation can be bypassed → Server validation is the ONLY real protection
- ✅ Business logic ONLY in FastAPI (reference ID generation, expiration calculation)
- ✅ Database constraints provide final safety net

---

## Validation Strategy

### Two-Layer Validation

```
┌─────────────────────────────────────────────────────────┐
│              CLIENT-SIDE VALIDATION (UX)                │
│  Purpose: Improve user experience, instant feedback    │
│  Library: Zod (React), built-in (Flutter)              │
│  Trust Level: ❌ NEVER TRUST - Can be bypassed         │
│                                                         │
│  Example:                                               │
│  • Email format check                                   │
│  • Required field check                                 │
│  • Phone number format                                  │
│  • Date range check                                     │
│                                                         │
│  ⚠️ This is cosmetic only!                              │
└─────────────────────────────────────────────────────────┘
                          ↓
                    HTTP Request
                          ↓
┌─────────────────────────────────────────────────────────┐
│          SERVER-SIDE VALIDATION (SECURITY)              │
│  Purpose: Enforce business rules, prevent bad data     │
│  Library: Pydantic (FastAPI models)                    │
│  Trust Level: ✅ ONLY SOURCE OF TRUTH                  │
│                                                         │
│  Example:                                               │
│  • Re-validate ALL fields                              │
│  • Check business rules (Sunday booking, rate limit)   │
│  • Verify authorization (JWT, role check)              │
│  • Sanitize input (SQL injection prevention)           │
│  • Enforce constraints                                 │
│                                                         │
│  ✅ This is the ONLY real validation                   │
└─────────────────────────────────────────────────────────┘
                          ↓
                    Database Query
                          ↓
┌─────────────────────────────────────────────────────────┐
│          DATABASE-LEVEL VALIDATION (Final Guard)        │
│  Purpose: Data integrity, prevent corruption           │
│  Methods: CHECK constraints, triggers, RLS             │
│  Trust Level: ✅ Final safety net                      │
│                                                         │
│  Example:                                               │
│  • CHECK (status IN ('submitted', 'pending', ...))    │
│  • CHECK (amount > 0)                                  │
│  • UNIQUE constraints                                   │
│  • FOREIGN KEY constraints                             │
│  • NOT NULL constraints                                 │
│                                                         │
│  ✅ This prevents data corruption                      │
└─────────────────────────────────────────────────────────┘
```

---

## Server-Side Validation Rules

### FastAPI Pydantic Models

#### 1. Booking Creation Validation

```python
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import date, time
import re

class BookingCreate(BaseModel):
    # Customer Information
    customer_first_name: str = Field(min_length=1, max_length=100)
    customer_last_name: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr  # Pydantic validates email format
    customer_phone: str = Field(pattern=r"^(09|\+639)\d{9}$")  # PH phone format
    
    # Address (PSGC codes)
    region_code: str = Field(pattern=r"^\d{4}$")
    province_code: str = Field(pattern=r"^\d{4}$")
    city_municipality_code: str = Field(pattern=r"^\d{6}$")
    barangay_code: str = Field(pattern=r"^\d{9}$")
    street_address: str = Field(min_length=5, max_length=500)
    landmark: str = Field(min_length=1, max_length=255)
    
    # Service Details
    service_id: int = Field(gt=0)
    brand_id: int = Field(gt=0)
    preferred_date: date
    preferred_time: time
    
    # Optional
    problem_description: str | None = Field(None, max_length=1000)
    aircon_photos: list[str] | None = None
    
    @validator('customer_phone')
    def validate_phone(cls, v):
        """Validate Philippine phone number format"""
        pattern = r"^(09|\+639)\d{9}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid Philippine phone number. Use 09XXXXXXXXX or +639XXXXXXXXX")
        return v
    
    @validator('preferred_date')
    def validate_date(cls, v):
        """Validate booking date is in future and not Sunday"""
        from datetime import date as dt_date
        from app.core.config import settings
        
        # Check if date is in future
        if v <= dt_date.today():
            raise ValueError("Booking date must be in the future")
        
        # Check if Sunday booking is allowed
        if v.weekday() == 6:  # Sunday = 6
            if not settings.ALLOW_SUNDAY_BOOKINGS:
                raise ValueError("Sunday bookings are not allowed")
        
        # Check max advance booking (30 days)
        max_date = dt_date.today() + timedelta(days=30)
        if v > max_date:
            raise ValueError("Cannot book more than 30 days in advance")
        
        return v
    
    @validator('preferred_time')
    def validate_time(cls, v):
        """Validate time is within business hours"""
        from datetime import time as dt_time
        
        start_time = dt_time(8, 0)   # 8:00 AM
        end_time = dt_time(16, 0)     # 4:00 PM (last appointment)
        
        if v < start_time or v > end_time:
            raise ValueError("Booking time must be between 8:00 AM and 4:00 PM")
        
        return v
```

#### 2. Payment Upload Validation

```python
from fastapi import UploadFile
from pydantic import BaseModel, Field

class PaymentUpload(BaseModel):
    gcash_reference_number: str = Field(
        min_length=5,
        max_length=100,
        pattern=r"^[A-Z0-9-]+$"  # Only alphanumeric and dashes
    )
    amount: float = Field(gt=0, le=1000000)  # Max 1M pesos
    payment_method: str = Field(pattern=r"^(gcash|cash|bank_transfer)$")
    
    @validator('gcash_reference_number')
    def validate_gcash_ref(cls, v):
        """Validate GCash reference format"""
        if not v.startswith('GC-') and not v.isalnum():
            raise ValueError("Invalid GCash reference number format")
        return v.upper()

# File validation (in endpoint)
async def validate_payment_file(file: UploadFile):
    """Validate payment receipt image"""
    # Check file size
    MAX_SIZE = 3 * 1024 * 1024  # 3MB
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise ValueError("File size must be less than 3MB")
    
    # Check file type
    ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if file.content_type not in ALLOWED_TYPES:
        raise ValueError(f"File type must be one of: {', '.join(ALLOWED_TYPES)}")
    
    # Reset file pointer
    await file.seek(0)
    return contents
```

#### 3. User Authentication Validation

```python
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserRegister(BaseModel):
    first_name: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z\s'-]+$")
    last_name: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z\s'-]+$")
    email: EmailStr
    phone: str = Field(pattern=r"^(09|\+639)\d{9}$")
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError("Passwords do not match")
        return v
    
    @validator('password')
    def password_strength(cls, v):
        """Enforce password strength"""
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v
```

#### 4. Business Rule Validation (Rate Limiting)

```python
from fastapi import Request, HTTPException
from datetime import datetime, timedelta

async def check_booking_rate_limit(request: Request, user_id: int | None = None):
    """
    Enforce rate limiting: 3 bookings per 30 minutes
    - For guests: Check by IP address
    - For customers: Check by user_id
    """
    from app.database import get_db
    
    # Get settings
    limit_count = 3  # From system_settings
    limit_window = 30  # minutes
    
    db = next(get_db())
    
    # Calculate time window
    time_threshold = datetime.now() - timedelta(minutes=limit_window)
    
    if user_id:
        # Check by user_id (authenticated customer)
        count = db.query(Booking).filter(
            Booking.customer_id == user_id,
            Booking.created_at >= time_threshold
        ).count()
    else:
        # Check by IP address (guest)
        ip_address = request.client.host
        count = db.query(Booking).filter(
            Booking.customer_email == request.state.email,  # Track by email
            Booking.created_at >= time_threshold
        ).count()
    
    if count >= limit_count:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {limit_count} bookings per {limit_window} minutes."
        )
```

---

## Client-Side Validation Rules

### React (Web) - Zod Schema

```typescript
import { z } from 'zod'

// Booking form validation (client-side UX only)
export const bookingSchema = z.object({
  customer_first_name: z.string()
    .min(1, "First name is required")
    .max(100, "First name too long"),
  
  customer_last_name: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name too long"),
  
  customer_email: z.string()
    .email("Invalid email format"),
  
  customer_phone: z.string()
    .regex(/^(09|\+639)\d{9}$/, "Invalid phone number. Use 09XXXXXXXXX"),
  
  street_address: z.string()
    .min(5, "Address too short")
    .max(500, "Address too long"),
  
  landmark: z.string()
    .min(1, "Landmark is required")
    .max(255, "Landmark too long"),
  
  preferred_date: z.date()
    .refine((date) => date > new Date(), "Date must be in the future")
    .refine((date) => date.getDay() !== 0, "Sunday bookings not allowed"),
  
  problem_description: z.string()
    .max(1000, "Description too long")
    .optional(),
})

// Usage in React component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function BookingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bookingSchema)
  })
  
  const onSubmit = async (data) => {
    try {
      // Client validation passed, send to server
      const response = await axios.post('/api/bookings', data)
      // Server will re-validate everything!
    } catch (error) {
      // Show server validation errors (these are the real ones)
      if (error.response?.data?.detail) {
        showError(error.response.data.detail)
      }
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('customer_first_name')} />
      {errors.customer_first_name && (
        <span className="text-red-500">{errors.customer_first_name.message}</span>
      )}
      {/* ... */}
    </form>
  )
}
```

### Flutter (Mobile) - Form Validation

```dart
// Client-side validation (UX only)
class BookingFormValidator {
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Invalid email format';
    }
    return null;
  }
  
  static String? validatePhone(String? value) {
    if (value == null || value.isEmpty) {
      return 'Phone number is required';
    }
    final phoneRegex = RegExp(r'^(09|\+639)\d{9}$');
    if (!phoneRegex.hasMatch(value)) {
      return 'Invalid phone number. Use 09XXXXXXXXX';
    }
    return null;
  }
  
  static String? validateDate(DateTime? value) {
    if (value == null) {
      return 'Date is required';
    }
    if (value.isBefore(DateTime.now())) {
      return 'Date must be in the future';
    }
    if (value.weekday == DateTime.sunday) {
      return 'Sunday bookings not allowed';
    }
    return null;
  }
}

// Usage in Flutter form
class BookingForm extends StatefulWidget {
  @override
  _BookingFormState createState() => _BookingFormState();
}

class _BookingFormState extends State<BookingForm> {
  final _formKey = GlobalKey<FormState>();
  
  Future<void> _submitForm() async {
    // Client validation (UX)
    if (_formKey.currentState!.validate()) {
      try {
        // Send to server (server will re-validate)
        final response = await dio.post('/api/bookings', data: formData);
        // Success
      } on DioError catch (e) {
        // Show server validation errors
        if (e.response?.data['detail'] != null) {
          showErrorDialog(e.response!.data['detail']);
        }
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            decoration: InputDecoration(labelText: 'Email *'),
            validator: BookingFormValidator.validateEmail,
          ),
          // ...
        ],
      ),
    );
  }
}
```

---

## Fixed Issues

### Issue #1: Duration Display Format ✅ FIXED

**Problem:** `estimated_duration_minutes` in DB, but display format unclear

**Solution:**

```python
# Backend (FastAPI response serializer)
class ServiceResponse(BaseModel):
    name: str
    base_price: float
    estimated_duration_minutes: int
    estimated_duration_display: str  # NEW FIELD
    
    @classmethod
    def from_orm(cls, service):
        duration_display = format_duration(service.estimated_duration_minutes)
        return cls(
            name=service.name,
            base_price=service.base_price,
            estimated_duration_minutes=service.estimated_duration_minutes,
            estimated_duration_display=duration_display
        )

def format_duration(minutes: int) -> str:
    """
    Format duration for display
    120 → "2 hours"
    90 → "1.5 hours"
    150 → "2-3 hours"
    """
    hours = minutes / 60
    if hours == int(hours):
        return f"{int(hours)} hour{'s' if hours != 1 else ''}"
    else:
        # Round to nearest 0.5
        rounded = round(hours * 2) / 2
        if rounded == int(rounded):
            return f"{int(rounded)} hours"
        else:
            lower = int(rounded)
            upper = lower + 1
            return f"{lower}-{upper} hours"
```

**Frontend:** Just display `estimated_duration_display` (e.g., "2-3 hours")

---

### Issue #2: Phone Number Format Validation ✅ FIXED

**Problem:** VARCHAR(20) might be insufficient for international numbers

**Solution:**

```sql
-- Update database schema
ALTER TABLE users 
ALTER COLUMN phone TYPE VARCHAR(25);

ALTER TABLE bookings 
ALTER COLUMN customer_phone TYPE VARCHAR(25);
```

**Validation Regex (documented):**

```python
# Philippine format (primary)
PH_PHONE_REGEX = r"^(09|\+639)\d{9}$"
# Examples: 09171234567, +639171234567

# International format (future)
INTL_PHONE_REGEX = r"^\+\d{1,3}\d{9,12}$"
# Examples: +15551234567, +447700900123
```

**Pydantic Validator:**

```python
@validator('phone')
def validate_phone(cls, v):
    # Try Philippine format first
    if re.match(r"^(09|\+639)\d{9}$", v):
        return v
    # Try international format
    if re.match(r"^\+\d{1,3}\d{9,12}$", v):
        return v
    raise ValueError("Invalid phone number format")
```

---

### Issue #3: Reference ID Pattern ✅ FIXED

**Problem:** No CHECK constraint on `reference_id` format

**Solution:**

```sql
-- Add CHECK constraint to enforce format
ALTER TABLE bookings 
ADD CONSTRAINT check_reference_id_format 
CHECK (reference_id ~ '^KJAC-\d{4}-[A-Z0-9]{6}$');

-- Format: KJAC-2026-ABC123
-- KJAC = prefix
-- 2026 = year (4 digits)
-- ABC123 = random 6-char alphanumeric (uppercase)
```

**Backend Generation (FastAPI):**

```python
import random
import string
from datetime import datetime

def generate_reference_id() -> str:
    """
    Generate unique booking reference ID
    Format: KJAC-YYYY-XXXXXX
    Example: KJAC-2026-A1B2C3
    """
    year = datetime.now().year
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"KJAC-{year}-{random_part}"
```

---

### Issue #4: Down Payment Calculation ✅ FIXED

**Problem:** Fixed amount vs percentage

**Solution:** Support BOTH methods

```sql
-- Update services table
ALTER TABLE services 
ADD COLUMN down_payment_type VARCHAR(20) 
CHECK (down_payment_type IN ('fixed', 'percentage')) 
DEFAULT 'fixed';

-- If type = 'fixed': use down_payment_amount as-is
-- If type = 'percentage': down_payment_amount is percentage (e.g., 30.00 = 30%)
```

**Backend Calculation:**

```python
def calculate_down_payment(service: Service) -> float:
    """Calculate down payment based on service configuration"""
    if service.down_payment_type == 'fixed':
        return float(service.down_payment_amount)
    elif service.down_payment_type == 'percentage':
        percentage = float(service.down_payment_amount)
        return (service.base_price * percentage) / 100
    else:
        raise ValueError(f"Unknown down payment type: {service.down_payment_type}")

# Example:
# Service: AC Repair
# base_price = 1500.00
# down_payment_amount = 30.00
# down_payment_type = 'percentage'
# Result: 1500 * 30 / 100 = 450.00
```

---

### Issue #5: Technician "On the Way" Status ✅ FIXED

**Problem:** Booking status doesn't reflect technician traveling

**Solution:** Keep current design (status stays "confirmed"), but clarify in docs

**Reasoning:**
- Booking status = appointment status
- Technician status = technician's current action
- These are separate concerns

**Implementation:**

```python
# Booking status enum (unchanged)
booking.status IN ('submitted', 'pending', 'confirmed', 'ongoing', 'completed', ...)

# Technician status tracked separately via status updates
# Endpoint: PATCH /technician/jobs/{id}/status
# Body: { "status": "on_the_way" | "arrived" | "started" | "completed" }

# These updates:
# 1. Create a booking_status_history record
# 2. Trigger notification to customer
# 3. Update last_location_update_at timestamp
# 4. Do NOT change booking.status until "started" → "ongoing"
```

**Why:** Booking "confirmed" means appointment is scheduled. Customer sees technician progress via separate status updates, not booking status changes.

---

## Implementation Guidelines

### FastAPI Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app initialization
│   ├── core/
│   │   ├── config.py          # Settings (from .env)
│   │   ├── security.py        # JWT validation, auth
│   │   └── database.py        # DB connection
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py
│   │   ├── booking.py
│   │   └── ...
│   ├── schemas/               # Pydantic models (validation)
│   │   ├── booking.py         # BookingCreate, BookingResponse
│   │   ├── user.py
│   │   └── ...
│   ├── api/                   # API endpoints
│   │   ├── v1/
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── bookings.py   # Booking CRUD
│   │   │   ├── payments.py   # Payment upload/verify
│   │   │   └── ...
│   ├── services/              # Business logic
│   │   ├── booking_service.py
│   │   ├── payment_service.py
│   │   └── ...
│   └── utils/                 # Helpers
│       ├── validators.py      # Custom validators
│       ├── formatters.py      # Duration, phone, etc.
│       └── ...
├── alembic/                   # Database migrations
├── tests/
├── .env                       # Environment variables
├── requirements.txt
└── README.md
```

### React Project Structure

```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── pages/                # Page components (routes)
│   │   ├── public/
│   │   │   ├── LandingPage.tsx      # /
│   │   │   ├── BookingPage.tsx      # /booking
│   │   │   └── TrackingPage.tsx     # /booking/status
│   │   └── admin/
│   │       ├── LoginPage.tsx        # /admin/login
│   │       ├── DashboardPage.tsx    # /admin/dashboard
│   │       ├── AppointmentsPage.tsx # /admin/appointments
│   │       └── ...
│   ├── components/           # Reusable components
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   ├── services/            # API calls
│   │   ├── api.ts           # Axios config
│   │   ├── bookingService.ts
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   ├── utils/               # Helpers
│   │   └── validators.ts    # Client-side validation (Zod)
│   ├── types/               # TypeScript types
│   └── routes/              # React Router config
│       └── index.tsx
├── public/
├── package.json
└── vite.config.ts
```

### Flutter Project Structure

```
mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart             # App initialization
│   ├── screens/             # UI screens
│   │   ├── customer/
│   │   │   ├── home_screen.dart
│   │   │   ├── booking_screen.dart
│   │   │   └── ...
│   │   └── technician/
│   │       ├── jobs_screen.dart
│   │       └── ...
│   ├── widgets/             # Reusable widgets
│   ├── services/            # API calls
│   │   ├── api_service.dart
│   │   ├── booking_service.dart
│   │   └── ...
│   ├── models/              # Data models
│   ├── providers/           # State management
│   ├── utils/               # Helpers
│   │   └── validators.dart  # Client validation
│   └── constants/           # Constants
├── assets/
├── pubspec.yaml
└── README.md
```

---

## Summary Checklist

### Architecture ✅
- [x] FastAPI backend serves both web and mobile
- [x] Clients (React, Flutter) are dumb UI only
- [x] Only FastAPI talks to database
- [x] Supabase Auth → FastAPI validates JWT
- [x] All business logic in backend

### Validation ✅
- [x] Client-side validation for UX (Zod, Flutter validators)
- [x] Server-side validation with Pydantic (ONLY real protection)
- [x] Database constraints as final guard
- [x] Never trust client input

### Routing ✅
- [x] React Router with URL routes (multi-page, not SPA)
- [x] Flutter bottom tab navigation (role-based)

### Fixed Issues ✅
- [x] Duration display format documented
- [x] Phone number validation regex defined
- [x] Reference ID pattern enforced with CHECK constraint
- [x] Down payment supports both fixed & percentage
- [x] Technician status clarified (separate from booking status)

---

**Next Steps:** Implement backend with these validation rules, then build frontend/mobile to consume the API.
