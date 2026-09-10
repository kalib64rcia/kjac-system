# Authentication Flows

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Applies To:** Web Admin, Mobile (Customer & Technician)

---

## Table of Contents
1. [Admin Login with 2FA](#admin-login-with-2fa)
2. [Customer Registration & Email Verification](#customer-registration--email-verification)
3. [Customer Login](#customer-login)
4. [Technician Self-Registration](#technician-self-registration)
5. [Admin Creates Technician Account](#admin-creates-technician-account)
6. [Technician First Login](#technician-first-login)
7. [Forgot Password Flow](#forgot-password-flow)
8. [Reset Password Flow](#reset-password-flow)
9. [Session Management](#session-management)
10. [Logout Flow](#logout-flow)

---

## Admin Login with 2FA

### Flow Diagram
```
[Admin enters credentials] 
        ↓
[System validates email/username and password]
        ↓
    Valid? ───NO──→ [Display error: "Invalid credentials"]
        ↓                       ↓
       YES                [Increment failed attempt counter]
        ↓                       ↓
[Check account status]      Failed attempts >= 5? ───YES──→ [Lock account for 15 mins]
        ↓                                                           ↓
   Locked? ───YES──→ [Display: "Account locked. Try again in X minutes"]
        ↓
       NO
        ↓
[Generate temporary access token]
        ↓
[Display 2FA prompt: "Enter 6-digit code from authenticator app"]
        ↓
[Admin enters 6-digit code]
        ↓
[System validates TOTP code]
        ↓
    Valid? ───NO──→ [Display error: "Invalid code. Try again"]
        ↓
       YES
        ↓
[Generate access token + refresh token]
        ↓
[Create user session record]
        ↓
[Store FCM token if provided]
        ↓
[Reset failed login attempt counter]
        ↓
[Redirect to /admin/dashboard]
```

### API Sequence
```
1. POST /auth/login
   Request: { identifier, password }
   Response: { temp_access_token, requires_2fa: true }

2. POST /auth/2fa/verify
   Header: Authorization: Bearer {temp_access_token}
   Request: { code: "123456" }
   Response: { access_token, refresh_token, user }

3. Store tokens in secure storage
4. Navigate to dashboard
```

### UI States
1. **Initial State:** Login form (username/email + password)
2. **Loading State:** "Signing in..." (disable form)
3. **2FA Prompt:** "Enter 6-digit code" with 6 input boxes
4. **Error State:** Red message below form
5. **Success State:** Redirect to dashboard

### Error Scenarios
- **Invalid credentials:** Show "Invalid email/username or password"
- **Account locked:** Show "Too many failed attempts. Try again in 14:32"
- **Invalid 2FA code:** Show "Invalid code. Please try again"
- **Network error:** Show "Connection failed. Please check your internet"

---

## Customer Registration & Email Verification

### Flow Diagram
```
[Customer opens registration page]
        ↓
[Fills form: First name, Last name, Email, Phone, Password, Confirm Password]
        ↓
[Clicks "Register" button]
        ↓
[Client-side validation]
        ↓
    Valid? ───NO──→ [Show validation errors inline]
        ↓
       YES
        ↓
[POST /auth/register/customer]
        ↓
[Server validates data]
        ↓
    Valid? ───NO──→ [Return validation errors]
        ↓                      ↓
       YES               [Display errors inline]
        ↓
[Check if email already exists]
        ↓
   Exists? ───YES──→ [Return error: "Email already registered"]
        ↓
       NO
        ↓
[Hash password with bcrypt]
        ↓
[Create user record (status: active, email_verified: false)]
        ↓
[Generate email verification token (UUID, expires in 24h)]
        ↓
[Send verification email with magic link]
        ↓
[Return success response]
        ↓
[Show success message: "Registration successful! Check your email."]
        ↓
[Customer receives email]
        ↓
[Customer clicks verification link]
        ↓
[GET /auth/verify-email?token={token}]
        ↓
[System validates token]
        ↓
    Valid? ───NO──→ [Show: "Invalid or expired link. Request new verification email"]
        ↓
       YES
        ↓
[Update user: email_verified_at = NOW()]
        ↓
[Show success message: "Email verified! You can now log in."]
        ↓
[Redirect to login page]
```

### Registration Form Validation Rules
- **First Name, Last Name:**
  - Required
  - 2-100 characters
  - Letters and spaces only
  
- **Email:**
  - Required
  - Valid email format (RFC 5322)
  - Unique (not already registered)
  - Max 255 characters

- **Phone:**
  - Required
  - Philippine mobile format: 09XX-XXX-XXXX or +639XX-XXX-XXXX
  - 11 digits (starting with 09) or 13 digits (starting with +639)

- **Password:**
  - Required
  - Minimum 8 characters
  - Must contain: 1 uppercase, 1 lowercase, 1 number
  - Optional: 1 special character
  
- **Confirm Password:**
  - Must match password field

### Email Verification Email Template
```
Subject: Verify your KJAC account

Hi [First Name],

Welcome to Klein & Justin Airconditioning!

Please verify your email address by clicking the link below:

[Verify Email Button]
https://kjac-system.com/verify-email?token=abc123xyz

This link expires in 24 hours.

If you didn't create an account, please ignore this email.

Thanks,
The KJAC Team
```

### UI States
1. **Form State:** All fields empty, no errors
2. **Validating State:** Show loading spinner in button, disable form
3. **Error State:** Show red error messages below fields
4. **Success State:** Show success banner, disable form
5. **Email Sent State:** Show "Check your email" message with resend link

---

## Customer Login

### Flow Diagram
```
[Customer opens login page]
        ↓
[Enters email and password]
        ↓
[Clicks "Login" button]
        ↓
[POST /auth/login]
        ↓
[System validates credentials]
        ↓
    Valid? ───NO──→ [Return error, increment fail counter]
        ↓                       ↓
       YES                 Attempts >= 5? ───YES──→ [Lock account 15 mins]
        ↓
       NO
        ↓
[Check if email verified]
        ↓
   Verified? ───NO──→ [Return error: "Please verify your email"]
        ↓                           ↓
       YES               [Offer "Resend verification email" button]
        ↓
[Generate access + refresh tokens]
        ↓
[Create session record]
        ↓
[Store FCM token for push notifications]
        ↓
[Check if profile complete (has address)]
        ↓
   Complete? ───NO──→ [Redirect to profile completion page]
        ↓                       ↓
       YES          [Show: "Complete your profile before booking"]
        ↓
[Redirect to home screen]
```

### Biometric Authentication (Mobile Only)
```
[First login with email/password]
        ↓
[After successful login, prompt: "Enable Face ID / Touch ID?"]
        ↓
   User accepts? ───NO──→ [Skip biometric setup]
        ↓
       YES
        ↓
[Store encrypted refresh token in device keychain]
        ↓
[Next login shows: "Sign in with Face ID" button]
        ↓
[User taps biometric button]
        ↓
[System requests biometric auth]
        ↓
   Authenticated? ───NO──→ [Fall back to email/password]
        ↓
       YES
        ↓
[Retrieve refresh token from keychain]
        ↓
[POST /auth/refresh with refresh_token]
        ↓
[Receive new access token]
        ↓
[Proceed to home screen]
```

---

## Technician Self-Registration

### Flow Diagram
```
[Technician opens registration page (mobile app)]
        ↓
[Fills comprehensive form:]
        • First name, Middle name, Last name
        • Email, Phone
        • Date of birth
        • Complete address (PSGC selection)
        • Landmark
        • Password, Confirm Password
        ↓
[Submits registration]
        ↓
[POST /auth/register/technician]
        ↓
[Server validates all data]
        ↓
    Valid? ───NO──→ [Return validation errors]
        ↓
       YES
        ↓
[Create user record with status: "pending_approval"]
        ↓
[Send notification to admin: "New technician registration"]
        ↓
[Show success message:]
        "Application submitted successfully!
         Admin will review and contact you within 2-3 business days."
        ↓
[Technician waits for admin review]
        ↓
--- ADMIN REVIEWS ---
        ↓
[Admin logs in to admin panel]
        ↓
[Navigates to: Technicians → Pending Approvals]
        ↓
[Reviews technician application]
        ↓
[Admin decision]
        ↓
    Approve? ───NO──→ [Admin clicks "Deny"]
        ↓                       ↓
       YES              [Enter denial reason]
        ↓                       ↓
[Admin clicks "Approve"]   [Update status: "denied"]
        ↓                       ↓
[Update status: "active"]   [Send email: "Application denied"]
        ↓                       ↓
[Generate temporary password]  [Technician notified]
        ↓
[Send email with credentials:]
        "Your account is approved!
         Email: [email]
         Temporary Password: [auto-gen]
         You must change password on first login."
        ↓
[Technician receives email]
        ↓
[Proceeds to first login]
```

---

## Admin Creates Technician Account

### Flow Diagram
```
[Admin logs in to admin panel]
        ↓
[Navigates to: Technicians → Add New]
        ↓
[Fills technician form:]
        • First name, Middle name, Last name
        • Email, Phone
        • Date of birth
        • Complete address
        • Landmark
        ↓
[Clicks "Create Account"]
        ↓
[POST /admin/users/technician]
        ↓
[Server validates data]
        ↓
    Valid? ───NO──→ [Show validation errors]
        ↓
       YES
        ↓
[Create user record with role: "technician", status: "active"]
        ↓
[Generate random secure password]
        ↓
[Hash password and store]
        ↓
[Send email to technician:]
        "Welcome to KJAC!
         Your account has been created by admin.
         
         Email: [email]
         Temporary Password: [random-password]
         
         Please log in and change your password immediately."
        ↓
[Show success message to admin:]
        "Technician account created successfully!
         Credentials sent to [email]"
        ↓
[Technician receives email]
        ↓
[Proceeds to first login]
```

---

## Technician First Login

### Flow Diagram
```
[Technician opens mobile app]
        ↓
[Enters email and temporary password]
        ↓
[POST /auth/login]
        ↓
[System validates credentials]
        ↓
    Valid? ───NO──→ [Show error: "Invalid credentials"]
        ↓
       YES
        ↓
[Check if first login (password not changed)]
        ↓
   First login? ───NO──→ [Proceed to normal login]
        ↓
       YES
        ↓
[Show "Change Password" screen:]
        "For security, please change your password"
        ↓
[Technician enters:]
        • Current password (temporary)
        • New password
        • Confirm new password
        ↓
[POST /users/me/change-password]
        ↓
[Server validates:]
        • Current password correct
        • New password meets requirements
        • Passwords match
        ↓
    Valid? ───NO──→ [Show validation errors]
        ↓
       YES
        ↓
[Update password hash]
        ↓
[Mark account as password_changed]
        ↓
[Invalidate all existing sessions]
        ↓
[Generate new tokens]
        ↓
[Show success: "Password changed successfully!"]
        ↓
[Redirect to technician dashboard]
```

---

## Forgot Password Flow

### Flow Diagram
```
[User clicks "Forgot Password?" link]
        ↓
[Enters email address]
        ↓
[Clicks "Send Reset Link"]
        ↓
[POST /auth/forgot-password]
        ↓
[Server checks if email exists]
        ↓
--- Always return success (security best practice) ---
        ↓
[Show: "If an account exists, a reset link has been sent to your email"]
        ↓
--- If email exists: ---
        ↓
[Generate password reset token (UUID, expires in 1 hour)]
        ↓
[Store token in database with user_id and expiry]
        ↓
[Send password reset email]
        ↓
[User receives email with reset link]
        ↓
[User clicks link]
        ↓
[Opens: /reset-password?token={token}]
        ↓
[System validates token]
        ↓
    Valid & Not Expired? ───NO──→ [Show: "Invalid or expired link. Request new reset"]
        ↓
       YES
        ↓
[Show "Reset Password" form]
        ↓
[User enters new password + confirm]
        ↓
[User clicks "Reset Password"]
        ↓
[Proceed to Reset Password Flow]
```

### Password Reset Email Template
```
Subject: Reset your KJAC password

Hi [First Name],

We received a request to reset your password.

Click the link below to choose a new password:

[Reset Password Button]
https://kjac-system.com/reset-password?token=xyz789abc

This link expires in 1 hour.

If you didn't request a password reset, please ignore this email.
Your password will remain unchanged.

Thanks,
The KJAC Team
```

---

## Reset Password Flow

### Flow Diagram
```
[User on reset password page with valid token]
        ↓
[Enters new password + confirm password]
        ↓
[Clicks "Reset Password"]
        ↓
[Client-side validation]
        ↓
    Valid? ───NO──→ [Show validation errors]
        ↓
       YES
        ↓
[POST /auth/reset-password]
        Request: { token, password, confirm_password }
        ↓
[Server validates token again]
        ↓
    Valid? ───NO──→ [Return error: "Invalid or expired token"]
        ↓
       YES
        ↓
[Validate new password requirements]
        ↓
    Valid? ───NO──→ [Return validation errors]
        ↓
       YES
        ↓
[Hash new password with bcrypt]
        ↓
[Update user password]
        ↓
[Delete reset token (mark as used)]
        ↓
[Invalidate all existing sessions (force re-login)]
        ↓
[Send "Password Changed" notification email]
        ↓
[Return success response]
        ↓
[Show success message:]
        "Password reset successfully!
         You can now log in with your new password."
        ↓
[Redirect to login page after 3 seconds]
```

---

## Session Management

### Access Token Lifecycle
```
[User logs in successfully]
        ↓
[Server generates JWT access token]
        • Payload: { user_id, role, exp: 15 minutes }
        • Signed with secret key
        ↓
[Client stores token in memory (React state) or secure storage (Flutter)]
        ↓
[Client includes token in API requests:]
        Authorization: Bearer {access_token}
        ↓
--- Token expires after 15 minutes ---
        ↓
[API request fails with 401 Unauthorized]
        ↓
[Client automatically calls: POST /auth/refresh]
        ↓
[Server validates refresh token]
        ↓
    Valid? ───NO──→ [Force logout, redirect to login]
        ↓
       YES
        ↓
[Generate new access token]
        ↓
[Return new access token]
        ↓
[Client stores new token]
        ↓
[Retry failed API request with new token]
```

### Refresh Token Lifecycle
```
[Refresh token generated at login]
        • Expires in 7 days
        • Stored in database (user_sessions table)
        • Linked to device info, FCM token
        ↓
[Client stores securely:]
        • Web: HTTP-only cookie (future) or localStorage (current)
        • Mobile: Secure keychain/keystore
        ↓
[Used to obtain new access tokens]
        ↓
--- Token expires after 7 days ---
        ↓
[POST /auth/refresh fails with 401]
        ↓
[Force logout]
        ↓
[Clear all stored tokens]
        ↓
[Redirect to login]
```

### Session Timeout (Admin Web Only)
```
[Admin logs in]
        ↓
[Start inactivity timer: 30 minutes (configurable)]
        ↓
[User interacts with page (mouse move, click, keyboard)]
        ↓
[Reset inactivity timer]
        ↓
--- If no activity for 30 minutes ---
        ↓
[Show warning modal: "Session expiring in 60 seconds. Stay logged in?"]
        ↓
   User responds? ───NO──→ [Auto logout after 60 seconds]
        ↓                           ↓
       YES                    [Clear session]
        ↓                           ↓
[User clicks "Stay Logged In"]  [Redirect to login]
        ↓
[Extend session (refresh access token)]
        ↓
[Reset inactivity timer]
```

---

## Logout Flow

### Single Device Logout
```
[User clicks "Logout" button]
        ↓
[Show confirmation modal: "Are you sure you want to logout?"]
        ↓
   User confirms? ───NO──→ [Cancel, return to page]
        ↓
       YES
        ↓
[POST /auth/logout]
        Request: { refresh_token }
        ↓
[Server deletes session record from database]
        ↓
[Client clears all stored tokens]
        ↓
[Clear user data from state/storage]
        ↓
[Redirect to login page]
        ↓
[Show toast: "Logged out successfully"]
```

### Logout from All Devices
```
[User goes to: Settings → Active Sessions]
        ↓
[Shows list of active sessions:]
        • Current device (This device)
        • iPhone 14 - Last active 2 hours ago
        • Chrome on Windows - Last active 1 day ago
        ↓
[User clicks "Logout from all devices"]
        ↓
[Show confirmation modal:]
        "This will log you out from all devices.
         You'll need to log in again on each device."
        ↓
   User confirms? ───NO──→ [Cancel]
        ↓
       YES
        ↓
[POST /auth/logout-all]
        ↓
[Server deletes all user sessions from database]
        ↓
[Client clears local tokens]
        ↓
[Redirect to login page]
        ↓
[Show message: "Logged out from all devices"]
```

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- Optional: 1 special character (!@#$%^&*)

### Password Hashing
- Algorithm: bcrypt
- Cost factor: 12
- Never store passwords in plain text
- Never log passwords

### Token Security
- **Access tokens:** Short-lived (15 min), stored in memory (web) or secure storage (mobile)
- **Refresh tokens:** Long-lived (7 days), stored securely, revocable
- **2FA tokens:** TOTP (Time-based One-Time Password), 30-second window

### Rate Limiting
- **Login attempts:** 5 per 15 minutes per email → Lock account
- **Password reset:** 3 per hour per email
- **Email verification resend:** 3 per hour per email

### Failed Login Handling
- Don't reveal if email exists
- Generic error: "Invalid email or password"
- Increment fail counter on any login failure
- Lock account after 5 consecutive failures
- Send email notification on account lock
- Automatic unlock after 15 minutes

---

## Error Messages

### User-Friendly Error Messages
❌ **Bad:** "Database query failed: user not found in table `users`"  
✅ **Good:** "Invalid email or password"

❌ **Bad:** "bcrypt hash verification failed"  
✅ **Good:** "Invalid email or password"

❌ **Bad:** "JWT token expired at 2026-09-10T14:30:00Z"  
✅ **Good:** "Your session has expired. Please log in again"

❌ **Bad:** "TOTP secret validation error: incorrect code"  
✅ **Good:** "Invalid verification code. Please try again"

---

**Document Status:** Complete ✅  
**Maintained By:** Development Team  
**Related Docs:** API.md, PRD.md, BUSINESS_RULES.md

---

*These authentication flows ensure security while maintaining a smooth user experience.*
