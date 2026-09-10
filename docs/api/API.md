# KJAC API Documentation

**API Version:** 1.0  
**Last Updated:** September 10, 2026  
**Base URL:** `https://api.kjac-system.com/v1`  
**Protocol:** REST over HTTPS  
**Authentication:** JWT Bearer Tokens

---

## Table of Contents
1. [Authentication](#authentication)
2. [Request/Response Format](#requestresponse-format)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Pagination](#pagination)
6. [API Endpoints](#api-endpoints)

---

## Authentication

### Token Types
- **Access Token:** Short-lived (15 minutes), used for API requests
- **Refresh Token:** Long-lived (7 days), used to obtain new access tokens

### Authentication Flow
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 900,
      "token_type": "Bearer"
    }
  }
}
```

### Using Access Token
```http
GET /bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Request/Response Format

### Standard Request Headers
```http
Content-Type: application/json
Authorization: Bearer {access_token}
Accept: application/json
X-Request-ID: {unique-request-id}  # Optional, for tracing
```

### Standard Success Response
```json
{
  "success": true,
  "data": { /* Response data */ },
  "meta": {
    "timestamp": "2026-09-10T14:30:00+08:00",
    "request_id": "req_abc123xyz"
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-10T14:30:00+08:00",
    "request_id": "req_abc123xyz"
  }
}
```

---

## Error Handling

### HTTP Status Codes
- `200` OK - Successful request
- `201` Created - Resource created successfully
- `204` No Content - Successful request with no response body
- `400` Bad Request - Invalid request data
- `401` Unauthorized - Missing or invalid authentication
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `409` Conflict - Resource conflict (e.g., duplicate)
- `422` Unprocessable Entity - Validation error
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error - Server error
- `503` Service Unavailable - Service temporarily unavailable

### Error Codes
```
AUTH_001: Invalid credentials
AUTH_002: Account locked (too many failed attempts)
AUTH_003: Email not verified
AUTH_004: Token expired
AUTH_005: Invalid token

VAL_001: Validation error (see details array)
VAL_002: Required field missing
VAL_003: Invalid format

BOOKING_001: Booking not found
BOOKING_002: Booking already expired
BOOKING_003: Booking cannot be cancelled (too late)
BOOKING_004: Rate limit exceeded (too many bookings)

PAYMENT_001: Payment verification failed
PAYMENT_002: Invalid GCash reference number

PERM_001: Insufficient permissions
PERM_002: Resource access denied

RATE_001: Rate limit exceeded (see headers for retry-after)
```

---

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 300           # Requests allowed per window
X-RateLimit-Remaining: 295       # Requests remaining
X-RateLimit-Reset: 1694359200    # Unix timestamp when limit resets
Retry-After: 60                  # Seconds to wait (if rate limited)
```

### Rate Limits (Per Minute)
- **Public endpoints:** 100 requests/minute per IP
- **Authenticated endpoints:** 300 requests/minute per user
- **Admin endpoints:** 500 requests/minute per admin

### Special Rate Limits
- **Login attempts:** 5 per 15 minutes per email
- **Booking creation:** 3 per 30 minutes per user/IP
- **Password reset:** 3 per hour per email

---

## Pagination

### Query Parameters
```
?page=1          # Page number (1-indexed)
?limit=20        # Items per page (default: 20, max: 100)
?sort=created_at # Sort field
?order=desc      # Sort order (asc or desc)
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* Array of items */ ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 156,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## API Endpoints

---

## 1. Authentication

### 1.1 Login

**Admin & Technician Login**
```http
POST /auth/login
Content-Type: application/json

{
  "identifier": "admin@kjac.com",  # Email or username
  "password": "securePassword123"
}
```

**Customer Login (with biometric option)**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "device_id": "device_abc123",     # For biometric auth tracking
  "fcm_token": "fcm_token_xyz"      # Firebase Cloud Messaging token
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer",
      "profile_picture_url": "https://storage.kjac.com/profiles/user123.jpg",
      "email_verified": true
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 900
    },
    "requires_2fa": false  # True for admin accounts
  }
}
```

**Errors:**
- `401` - AUTH_001: Invalid credentials
- `401` - AUTH_002: Account locked
- `403` - AUTH_003: Email not verified
- `403` - Account pending approval (technician)

---

### 1.2 Admin 2FA Verification

```http
POST /auth/2fa/verify
Authorization: Bearer {temp_access_token}
Content-Type: application/json

{
  "code": "123456"  # 6-digit code from authenticator app
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 900
    }
  }
}
```

---

### 1.3 Customer Registration

```http
POST /auth/register/customer
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "09261234567",
  "password": "securePassword123",
  "confirm_password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 124,
      "uuid": "660e8400-e29b-41d4-a716-446655440001",
      "email": "jane@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "email_verified": false
    },
    "message": "Registration successful. Please check your email for verification link."
  }
}
```

**Validation Rules:**
- `first_name`, `last_name`: Required, 2-100 characters
- `email`: Required, valid format, unique
- `phone`: Required, Philippine format (09XX-XXX-XXXX)
- `password`: Required, min 8 characters, must include uppercase, lowercase, number

---

### 1.4 Email Verification (Magic Link)

```http
GET /auth/verify-email?token={verification_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully. You can now log in.",
    "redirect_url": "/login"
  }
}
```

---

### 1.5 Technician Self-Registration

```http
POST /auth/register/technician
Content-Type: application/json

{
  "first_name": "Mark",
  "middle_name": "Santos",
  "last_name": "Cruz",
  "email": "mark@example.com",
  "phone": "09261234568",
  "date_of_birth": "1990-05-15",
  "street_address": "123 Main St",
  "region_code": "0401",
  "province_code": "0421",
  "city_municipality_code": "042108",
  "barangay_code": "042108001",
  "landmark": "Near City Hall",
  "password": "securePassword123",
  "confirm_password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 125,
      "uuid": "770e8400-e29b-41d4-a716-446655440002",
      "email": "mark@example.com",
      "status": "pending_approval"
    },
    "message": "Registration submitted. Your account will be reviewed by admin."
  }
}
```

---

### 1.6 Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

**Note:** Always return success even if email doesn't exist (security best practice)

---

### 1.7 Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "newSecurePassword123",
  "confirm_password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully. You can now log in with your new password."
  }
}
```

---

### 1.8 Logout

```http
POST /auth/logout
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."  # Optional: logout specific session
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 1.9 Refresh Access Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

---

## 2. User Management

### 2.1 Get Current User Profile

```http
GET /users/me
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "middle_name": null,
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "09261234567",
    "role": "customer",
    "status": "active",
    "profile_picture_url": "https://storage.kjac.com/profiles/user123.jpg",
    "email_verified": true,
    "address": {
      "region_code": "0401",
      "province_code": "0421",
      "city_municipality_code": "042108",
      "barangay_code": "042108001",
      "street_address": "123 Main St, Brgy. Labuin",
      "landmark": "Near City Hall",
      "latitude": 14.2571542,
      "longitude": 121.3957919
    },
    "created_at": "2026-01-15T10:30:00+08:00",
    "updated_at": "2026-09-10T14:00:00+08:00"
  }
}
```

---

### 2.2 Update Profile

```http
PATCH /users/me
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "first_name": "John",
  "middle_name": "Allen",
  "last_name": "Doe",
  "phone": "09261234567",
  "street_address": "456 New St",
  "landmark": "Near Mall",
  "profile_picture_url": "https://storage.kjac.com/profiles/user123_new.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* Updated user object */ },
    "message": "Profile updated successfully"
  }
}
```

**Note:** For technicians, profile updates (except profile_picture_url) require admin approval

---

### 2.3 Update Address

```http
PATCH /users/me/address
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "region_code": "0401",
  "province_code": "0421",
  "city_municipality_code": "042108",
  "barangay_code": "042108001",
  "street_address": "789 Updated St",
  "landmark": "Near Park",
  "latitude": 14.2571542,
  "longitude": 121.3957919
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Address updated successfully",
    "note": "This change will not affect your pending or ongoing bookings"
  }
}
```

---

### 2.4 Upload Profile Picture

```http
POST /users/me/profile-picture
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: [binary image data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile_picture_url": "https://storage.kjac.com/profiles/user123_abc.webp",
    "message": "Profile picture uploaded successfully"
  }
}
```

**Validation:**
- Max file size: 3MB
- Allowed formats: JPG, PNG, HEIC
- Auto-converted to WebP
- Server-side virus scanning

---

### 2.5 Change Password

```http
POST /users/me/change-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "current_password": "oldPassword123",
  "new_password": "newSecurePassword456",
  "confirm_password": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully. You will be logged out from all devices."
  }
}
```

**Note:** Force logout from all sessions after password change

---

### 2.6 Admin: Get All Users

```http
GET /admin/users?role=customer&status=active&page=1&limit=20
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `role` (optional): Filter by role (admin, customer, technician)
- `status` (optional): Filter by status (active, inactive, suspended, pending_approval)
- `search` (optional): Search by name, email, phone
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "09261234567",
      "role": "customer",
      "status": "active",
      "email_verified": true,
      "created_at": "2026-01-15T10:30:00+08:00"
    }
    // ... more users
  ],
  "meta": {
    "pagination": { /* Pagination info */ }
  }
}
```

---

### 2.7 Admin: Create Technician Account

```http
POST /admin/users/technician
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "first_name": "Pedro",
  "middle_name": "Garcia",
  "last_name": "Santos",
  "email": "pedro@example.com",
  "phone": "09261234569",
  "date_of_birth": "1988-03-20",
  "street_address": "456 Tech St",
  "region_code": "0401",
  "province_code": "0421",
  "city_municipality_code": "042108",
  "barangay_code": "042108001",
  "landmark": "Near School"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 126,
      "uuid": "880e8400-e29b-41d4-a716-446655440003",
      "email": "pedro@example.com",
      "role": "technician",
      "status": "active"
    },
    "credentials": {
      "email": "pedro@example.com",
      "temporary_password": "Auto-Gen-Pass-8x7Y2z",
      "message": "Credentials sent to technician's email. Must change password on first login."
    }
  }
}
```

---

### 2.8 Admin: Approve/Deny Technician Registration

```http
PATCH /admin/users/{user_id}/approval
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "action": "approve",  # or "deny"
  "notes": "Approved after background check"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* Updated user object with status: "active" */ },
    "message": "Technician account approved. Welcome email sent."
  }
}
```

---

## 3. Booking Management

### 3.1 Create Booking (Guest or Customer)

**Guest Booking:**
```http
POST /bookings
Content-Type: application/json

{
  "customer_first_name": "Maria",
  "customer_last_name": "Santos",
  "customer_email": "maria@example.com",
  "customer_phone": "09261234570",
  "region_code": "0401",
  "province_code": "0421",
  "city_municipality_code": "042108",
  "barangay_code": "042108001",
  "street_address": "789 Customer St",
  "landmark": "Near Church",
  "service_id": 1,
  "brand_id": 1,
  "preferred_date": "2026-09-15",
  "preferred_time": "10:00:00",
  "problem_description": "AC not cooling properly",
  "aircon_photos": [
    "https://storage.kjac.com/uploads/temp_abc123.jpg"
  ]
}
```

**Customer Booking (Authenticated):**
```http
POST /bookings
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "service_id": 1,
  "brand_id": 1,
  "preferred_date": "2026-09-15",
  "preferred_time": "10:00:00",
  "problem_description": "AC making strange noise",
  "aircon_photos": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "reference_id": "KJAC-2026-ABC123",
      "customer_id": 123,
      "service_id": 1,
      "brand_id": 1,
      "status": "submitted",
      "down_payment_amount": 500.00,
      "preferred_date": "2026-09-15",
      "preferred_time": "10:00:00",
      "expires_at": "2026-09-10T17:30:00+08:00",  # 3 hours from now
      "created_at": "2026-09-10T14:30:00+08:00"
    },
    "message": "Booking created successfully. Please upload payment within 3 hours.",
    "next_steps": [
      "Save your booking reference ID: KJAC-2026-ABC123",
      "Pay down payment of ₱500.00 via GCash",
      "Upload payment receipt on booking status page"
    ]
  }
}
```

**Validation Rules:**
- `preferred_date`: Must be future date, not past
- `preferred_date`: Cannot be Sunday (if `allow_sunday_bookings` setting = false)
- `preferred_time`: Must be between 8:00 AM - 5:00 PM
- `service_id`, `brand_id`: Must exist and be active
- Rate limit: 3 bookings per 30 minutes per user/IP

---

### 3.2 Get Booking by Reference ID (Public)

```http
GET /bookings/track/{reference_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "reference_id": "KJAC-2026-ABC123",
      "status": "confirmed",
      "service": {
        "id": 1,
        "name": "AC Repair",
        "base_price": 1500.00
      },
      "brand": {
        "id": 1,
        "name": "Daikin"
      },
      "customer": {
        "first_name": "Maria",
        "last_name": "Santos",
        "phone": "09261234570"
      },
      "technician": {
        "id": 125,
        "first_name": "Pedro",
        "last_name": "Santos",
        "profile_picture_url": "https://storage.kjac.com/profiles/tech125.jpg",
        "average_rating": 4.85
      },
      "preferred_date": "2026-09-15",
      "preferred_time": "10:00:00",
      "address": {
        "street_address": "789 Customer St",
        "landmark": "Near Church",
        "city": "Sta. Cruz",
        "province": "Laguna"
      },
      "down_payment_amount": 500.00,
      "payment_status": "verified",
      "status_history": [
        {
          "status": "submitted",
          "timestamp": "2026-09-10T14:30:00+08:00"
        },
        {
          "status": "pending",
          "timestamp": "2026-09-10T15:00:00+08:00"
        },
        {
          "status": "confirmed",
          "timestamp": "2026-09-10T16:00:00+08:00"
        }
      ],
      "can_cancel": true,
      "can_reschedule": true,
      "cancellation_policy": "immediate_refund",  # or "requires_approval" or "non_refundable"
      "created_at": "2026-09-10T14:30:00+08:00",
      "updated_at": "2026-09-10T16:00:00+08:00"
    }
  }
}
```

**Error:**
- `404` - BOOKING_001: Booking not found

---

### 3.3 Get My Bookings (Customer/Technician)

```http
GET /users/me/bookings?status=confirmed&page=1&limit=20
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (optional): Filter by status
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "reference_id": "KJAC-2026-ABC123",
      "status": "confirmed",
      "service_name": "AC Repair",
      "brand_name": "Daikin",
      "preferred_date": "2026-09-15",
      "preferred_time": "10:00:00",
      "technician_name": "Pedro Santos",
      "created_at": "2026-09-10T14:30:00+08:00"
    }
    // ... more bookings
  ],
  "meta": {
    "pagination": { /* Pagination info */ }
  }
}
```

---

### 3.4 Cancel Booking

```http
POST /bookings/{booking_id}/cancel
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reason": "Emergency came up, need to reschedule",
  "acknowledge_policy": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "status": "cancelled",
      "cancellation_reason": "Emergency came up, need to reschedule"
    },
    "refund": {
      "status": "approved",  # or "processing" or "denied"
      "amount": 500.00,
      "refund_type": "full",
      "message": "Full refund approved. Will be processed within 24 hours."
    }
  }
}
```

**Business Logic:**
- **Before confirmation:** Auto-approve full refund
- **Same day before dispatch:** Requires admin approval
- **After technician dispatched:** Non-refundable

**Errors:**
- `403` - BOOKING_003: Booking cannot be cancelled (already completed)
- `404` - BOOKING_001: Booking not found

---

### 3.5 Request Reschedule

```http
POST /bookings/{booking_id}/reschedule
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "new_preferred_date": "2026-09-18",
  "new_preferred_time": "14:00:00",
  "reason": "Work schedule conflict"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reschedule_request": {
      "id": 789,
      "booking_id": 456,
      "old_date": "2026-09-15",
      "old_time": "10:00:00",
      "new_date": "2026-09-18",
      "new_time": "14:00:00",
      "status": "pending",
      "reason": "Work schedule conflict"
    },
    "message": "Reschedule request submitted. Admin will review and notify you."
  }
}
```

---

### 3.6 Admin: Get All Bookings

```http
GET /admin/bookings?status=pending&date_from=2026-09-01&page=1
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `status`: Filter by status
- `customer_id`: Filter by customer
- `technician_id`: Filter by technician
- `service_id`: Filter by service
- `date_from`, `date_to`: Date range filter
- `search`: Search by reference ID, customer name
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "reference_id": "KJAC-2026-ABC123",
      "customer": { /* Customer object */ },
      "technician": { /* Technician object or null */ },
      "service": { /* Service object */ },
      "brand": { /* Brand object */ },
      "status": "pending",
      "payment_status": "pending",
      "preferred_date": "2026-09-15",
      "created_at": "2026-09-10T14:30:00+08:00"
    }
    // ... more bookings
  ],
  "meta": {
    "pagination": { /* Pagination info */ },
    "summary": {
      "total_bookings": 150,
      "pending_count": 12,
      "confirmed_count": 25,
      "completed_count": 100
    }
  }
}
```

---

### 3.7 Admin: Assign Technician

```http
PATCH /admin/bookings/{booking_id}/assign-technician
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "technician_id": 125,
  "notes": "Best fit for Daikin brand"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "technician_id": 125,
      "status": "confirmed"
    },
    "message": "Technician assigned successfully. Notifications sent to customer and technician."
  }
}
```

---

### 3.8 Technician: Update Job Status

```http
PATCH /bookings/{booking_id}/status
Authorization: Bearer {technician_access_token}
Content-Type: application/json

{
  "status": "ongoing",  # "ongoing", "completed"
  "notes": "Started service at customer location",
  "latitude": 14.2571542,  # Optional: current location
  "longitude": 121.3957919
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "status": "ongoing",
      "ongoing_at": "2026-09-15T10:05:00+08:00"
    },
    "message": "Booking status updated. Customer notified."
  }
}
```

**Status Flow:**
- `confirmed` → `ongoing` (when technician clicks "Start Service")
- `ongoing` → `completed` (when technician clicks "Complete Service")

---

## 4. Payment Management

### 4.1 Upload Payment Receipt

```http
POST /bookings/{booking_id}/payment
Authorization: Bearer {access_token} # Optional for guest
Content-Type: multipart/form-data

file: [binary image data]
gcash_reference_number: "GC-REF-123456789"
amount: 500.00
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 234,
      "booking_id": 456,
      "amount": 500.00,
      "gcash_reference_number": "GC-REF-123456789",
      "gcash_receipt_url": "https://storage.kjac.com/receipts/payment234.webp",
      "status": "pending",
      "created_at": "2026-09-10T15:00:00+08:00"
    },
    "booking_status": "pending",
    "message": "Payment receipt uploaded. Admin will verify within 24 hours."
  }
}
```

**Validation:**
- Max file size: 3MB
- Allowed formats: JPG, PNG, HEIC
- Server-side validation and virus scanning

---

### 4.2 Admin: Verify Payment

```http
PATCH /admin/payments/{payment_id}/verify
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "action": "approve",  # or "reject"
  "notes": "Payment verified, GCash reference confirmed",
  "rejection_reason": null  # Required if action is "reject"
}
```

**Response (Approve):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 234,
      "status": "verified",
      "verified_at": "2026-09-10T16:00:00+08:00"
    },
    "booking": {
      "id": 456,
      "status": "confirmed"
    },
    "message": "Payment approved. Booking confirmed. Customer notified."
  }
}
```

**Response (Reject):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 234,
      "status": "rejected",
      "rejection_reason": "GCash reference number does not match"
    },
    "booking": {
      "id": 456,
      "status": "submitted"
    },
    "message": "Payment rejected. Customer notified to re-upload."
  }
}
```

---

## 5. Services & Brands

### 5.1 Get All Services

```http
GET /services?is_active=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "AC Repair",
      "slug": "ac-repair",
      "description": "Professional aircon repair services",
      "base_price": 1500.00,
      "down_payment_amount": 500.00,
      "estimated_duration_minutes": 120,
      "icon_name": "wrench",
      "badge_text": "Popular",
      "badge_color": "#38b6ff",
      "process_steps": [
        {
          "step": 1,
          "title": "Diagnosis",
          "description": "Technician inspects and diagnoses the issue"
        },
        {
          "step": 2,
          "title": "Quotation",
          "description": "Detailed cost breakdown provided"
        },
        {
          "step": 3,
          "title": "Repair",
          "description": "Expert repair performed"
        },
        {
          "step": 4,
          "title": "Testing",
          "description": "AC tested to ensure proper functioning"
        }
      ],
      "images": [
        {
          "url": "https://storage.kjac.com/services/repair_before.jpg",
          "type": "before"
        },
        {
          "url": "https://storage.kjac.com/services/repair_after.jpg",
          "type": "after"
        }
      ]
    }
    // ... more services
  ]
}
```

---

### 5.2 Get Service Details

```http
GET /services/{service_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "AC Repair",
    "slug": "ac-repair",
    "description": "Professional aircon repair services for all brands",
    "detailed_description": "<p>Our expert technicians...</p>",
    "base_price": 1500.00,
    "down_payment_amount": 500.00,
    "estimated_duration_minutes": 120,
    "process_steps": [ /* Array of steps */ ],
    "images": [ /* Array of images */ ],
    "is_active": true,
    "is_featured": true
  }
}
```

---

### 5.3 Get All Brands

```http
GET /brands?is_active=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Daikin",
      "slug": "daikin",
      "description": "World-class air conditioning systems",
      "logo_url": "https://storage.kjac.com/brands/daikin_logo.png",
      "is_partner": true,
      "badge_text": "Official Partner",
      "badge_color": "#0066CC",
      "images": [
        {
          "url": "https://storage.kjac.com/brands/daikin_product1.jpg",
          "type": "product"
        }
      ]
    },
    {
      "id": 2,
      "name": "Carrier",
      "slug": "carrier",
      "description": "Trusted cooling solutions",
      "logo_url": "https://storage.kjac.com/brands/carrier_logo.png",
      "is_partner": false,
      "badge_text": null,
      "badge_color": null,
      "images": []
    }
    // ... more brands
  ]
}
```

---

### 5.4 Admin: Create/Update Service

```http
POST /admin/services
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "AC Installation",
  "slug": "ac-installation",
  "description": "Professional AC installation service",
  "detailed_description": "<p>Complete installation...</p>",
  "base_price": 2500.00,
  "down_payment_amount": 1000.00,
  "estimated_duration_minutes": 180,
  "icon_name": "package",
  "badge_text": "New",
  "badge_color": "#10B981",
  "process_steps": [ /* Steps array */ ],
  "is_active": true,
  "is_featured": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": { /* Created service object */ },
    "message": "Service created successfully"
  }
}
```

---

## 6. PSGC Address Endpoints

### 6.1 Get Regions

```http
GET /psgc/regions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "region_code": "0100",
      "region_name": "Region I (Ilocos Region)"
    },
    {
      "region_code": "0400",
      "region_name": "Region IV-A (CALABARZON)"
    }
    // ... more regions
  ]
}
```

---

### 6.2 Get Provinces by Region

```http
GET /psgc/provinces?region_code=0400
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "province_code": "0410",
      "province_name": "Batangas"
    },
    {
      "province_code": "0421",
      "province_name": "Laguna"
    }
    // ... more provinces
  ]
}
```

---

### 6.3 Get Cities/Municipalities by Province

```http
GET /psgc/cities?province_code=0421
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "city_municipality_code": "042108",
      "city_municipality_name": "Sta. Cruz",
      "is_city": false
    },
    {
      "city_municipality_code": "042122",
      "city_municipality_name": "San Pablo City",
      "is_city": true
    }
    // ... more cities/municipalities
  ]
}
```

---

### 6.4 Get Barangays by City/Municipality

```http
GET /psgc/barangays?city_municipality_code=042108
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "barangay_code": "042108001",
      "barangay_name": "Alipit"
    },
    {
      "barangay_code": "042108002",
      "barangay_name": "Bagumbayan"
    },
    {
      "barangay_code": "042108014",
      "barangay_name": "Labuin"
    }
    // ... more barangays
  ]
}
```

---

## 7. Ratings & Reviews

### 7.1 Submit Rating

```http
POST /bookings/{booking_id}/rating
Authorization: Bearer {customer_access_token}
Content-Type: application/json

{
  "rating": 5,
  "review_text": "Excellent service! Pedro was professional and fixed the issue quickly."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rating": {
      "id": 567,
      "booking_id": 456,
      "technician_id": 125,
      "rating": 5,
      "review_text": "Excellent service!...",
      "created_at": "2026-09-15T16:00:00+08:00"
    },
    "technician_new_average": 4.87,
    "message": "Thank you for your feedback!"
  }
}
```

**Validation:**
- Can only rate after booking status = "completed"
- Can only rate once per booking
- Rating must be 1-5 stars

---

### 7.2 Get Technician Ratings

```http
GET /technicians/{technician_id}/ratings?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "technician": {
      "id": 125,
      "first_name": "Pedro",
      "last_name": "Santos",
      "average_rating": 4.87,
      "total_ratings": 45,
      "total_jobs": 50
    },
    "ratings": [
      {
        "id": 567,
        "customer_name": "Maria S.",
        "rating": 5,
        "review_text": "Excellent service!...",
        "service_name": "AC Repair",
        "created_at": "2026-09-15T16:00:00+08:00"
      }
      // ... more ratings
    ]
  },
  "meta": {
    "pagination": { /* Pagination info */ }
  }
}
```

---

## 8. Notifications

### 8.1 Get My Notifications

```http
GET /users/me/notifications?is_read=false&page=1
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 890,
      "type": "booking_confirmed",
      "title": "Booking Confirmed",
      "message": "Your booking KJAC-2026-ABC123 has been confirmed for Sept 15, 2026",
      "is_read": false,
      "data": {
        "booking_id": 456,
        "reference_id": "KJAC-2026-ABC123"
      },
      "created_at": "2026-09-10T16:00:00+08:00"
    }
    // ... more notifications
  ],
  "meta": {
    "unread_count": 3,
    "pagination": { /* Pagination info */ }
  }
}
```

---

### 8.2 Mark Notification as Read

```http
PATCH /notifications/{notification_id}/read
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": 890,
      "is_read": true,
      "read_at": "2026-09-10T17:00:00+08:00"
    }
  }
}
```

---

### 8.3 Mark All as Read

```http
POST /notifications/read-all
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "marked_read_count": 5,
    "message": "All notifications marked as read"
  }
}
```

---

## 9. System Settings (Admin Only)

### 9.1 Get System Settings

```http
GET /admin/settings
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "setting_key": "booking_expiration_hours",
      "setting_value": "3",
      "data_type": "integer",
      "category": "booking",
      "description": "Hours until booking expires without payment",
      "is_editable": true
    },
    {
      "setting_key": "login_max_attempts",
      "setting_value": "5",
      "data_type": "integer",
      "category": "rate_limiting",
      "description": "Maximum failed login attempts before lockout",
      "is_editable": true
    },
    {
      "setting_key": "gcash_account_number",
      "setting_value": "0912-345-6789",
      "data_type": "string",
      "category": "payment",
      "description": "Business GCash account number for down payments",
      "is_editable": true
    },
    {
      "setting_key": "gcash_account_name",
      "setting_value": "Juan Dela Cruz",
      "data_type": "string",
      "category": "payment",
      "description": "Business GCash account name (must match GCash profile)",
      "is_editable": true
    },
    {
      "setting_key": "allow_sunday_bookings",
      "setting_value": "false",
      "data_type": "boolean",
      "category": "booking",
      "description": "Allow customers to book appointments on Sunday",
      "is_editable": true
    }
    // ... more settings
  ]
}
```

---

### 9.2 Update System Setting

```http
PATCH /admin/settings/{setting_key}
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "setting_value": "5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "setting": {
      "setting_key": "booking_expiration_hours",
      "setting_value": "5",
      "updated_at": "2026-09-10T17:00:00+08:00"
    },
    "message": "Setting updated successfully"
  }
}
```

---

## 10. Analytics & Reports (Admin Only)

### 10.1 Get Dashboard Stats

```http
GET /admin/analytics/dashboard
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "appointments": 8,
      "pending_bookings": 3,
      "active_technicians": 5,
      "revenue": 12500.00
    },
    "this_month": {
      "total_bookings": 125,
      "completed_bookings": 110,
      "cancelled_bookings": 5,
      "revenue": 187500.00,
      "new_customers": 45
    },
    "charts": {
      "revenue_by_month": [ /* Last 12 months */ ],
      "bookings_by_service": [ /* Service breakdown */ ],
      "customer_growth": [ /* Last 6 months */ ]
    }
  }
}
```

---

## Webhooks (Future)

For real-time updates, implement webhooks for:
- Payment gateway (Paymongo) notifications
- SMS notifications delivery status
- External system integrations

---

## API Versioning

Current version: `v1`

Breaking changes will be introduced in new versions (`v2`, `v3`, etc.)

Access versioned endpoints:
```
https://api.kjac-system.com/v1/bookings
https://api.kjac-system.com/v2/bookings  # Future
```

---

## Security Best Practices

1. **Always use HTTPS** - No HTTP allowed
2. **Validate all inputs** - Server-side validation mandatory
3. **Rate limiting** - Enforced on all endpoints
4. **CORS** - Whitelist allowed origins
5. **SQL Injection Prevention** - Parameterized queries (SQLAlchemy ORM)
6. **XSS Prevention** - Sanitize all outputs
7. **CSRF Protection** - CSRF tokens for state-changing operations
8. **File Upload Security** - Virus scanning, type validation, size limits
9. **Audit Logging** - Log all sensitive operations
10. **Password Hashing** - Bcrypt with cost factor 12

---

## Testing Environments

### Development
- **Base URL:** `http://localhost:8000/v1`
- **Database:** Local PostgreSQL

### Staging
- **Base URL:** `https://staging-api.kjac-system.com/v1`
- **Database:** Staging Supabase instance

### Production
- **Base URL:** `https://api.kjac-system.com/v1`
- **Database:** Production Supabase instance

---

## API Client Examples

### JavaScript (Axios)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.kjac-system.com/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create booking
const createBooking = async (bookingData) => {
  try {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  } catch (error) {
    console.error('Booking error:', error.response.data);
    throw error;
  }
};
```

### Flutter (Dio)
```dart
import 'package:dio/dio.dart';

class ApiClient {
  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.kjac-system.com/v1',
      headers: {'Content-Type': 'application/json'},
    ),
  );

  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/bookings', data: data);
      return response.data;
    } on DioException catch (e) {
      print('Error: ${e.response?.data}');
      rethrow;
    }
  }
}
```

---

**API Documentation Status:** Complete ✅  
**Maintained By:** Backend Development Team  
**For API Support:** api-support@kjac-system.com

---

*This API follows RESTful principles and industry best practices for security, performance, and maintainability.*
