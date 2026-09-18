# Requirements Document: KJAC Mobile App (Flutter)

## Introduction

The KJAC Mobile App is a unified Flutter application serving two distinct user roles: **Customers** and **Technicians**. This app enables air conditioning service management for Klein & Justin Airconditioning (KJAC), integrating with a FastAPI backend and Supabase PostgreSQL database.

The application features role-based access control, real-time booking status tracking, technician dispatch, and service rating. The mobile app supports the complete booking lifecycle from submission through completion, including payment processing, technician assignment, and service feedback.

### System Overview

- **Platform**: Flutter 3.12+ (iOS & Android)
- **Backend**: FastAPI + Supabase PostgreSQL
- **Authentication**: JWT-based with refresh tokens
- **Push Notifications**: Firebase Cloud Messaging
- **Maps**: Google Maps SDK integration
- **Design**: Matches web app design system exactly (Manrope fonts, KJAC color palette)

---

## Glossary

- **KJAC**: Klein & Justin Airconditioning - Service management system
- **Customer**: End-user who requests air conditioning services
- **Technician**: Service professional assigned to complete bookings
- **Admin**: System administrator managing bookings and personnel
- **Booking**: Service request from customer to be completed by technician
- **Appointment**: Scheduled booking with confirmed time and technician
- **Booking Status**: Current state in the booking lifecycle
- **Status Flow**: submitted → proposed → scheduled → confirmed → assigned → ongoing → completed
- **GCash**: Filipino mobile payment platform for service payments
- **2FA**: Two-factor authentication for admin access

---

## Requirements

### Requirement 1: Authentication & User Management

**User Story:** As a user, I want secure authentication, so that only authorized personnel can access the system.

#### Acceptance Criteria

1. THE App SHALL display a splash screen for 2 seconds on launch before navigating to the appropriate screen based on authentication state
2. WHEN the user has not completed onboarding, THE App SHALL display 5 onboarding screens with swipe navigation
3. WHEN the user is not authenticated, THE App SHALL present separate login forms for Customer and Technician roles
4. WHEN a new Customer registers, THE App SHALL validate email, collect profile information, and send verification email
5. WHERE a Technician receives an invite, THE App SHALL allow sign-in via web invite link (`/technician/accept?token=...`)
6. IF password reset is requested, THE App SHALL send reset link to registered email address
7. WHERE a user has enabled biometric authentication, THE App SHALL allow Face ID or Touch ID login
8. IF login fails 5 times within 15 minutes, THE App SHALL lock the account and notify user via email

---

### Requirement 2: Customer Booking Management

**User Story:** As a customer, I want to create, track, and manage bookings, so that I can schedule AC services conveniently.

#### Acceptance Criteria

1. WHEN the customer navigates to create booking, THE App SHALL present a 5-step wizard: Service Selection → Details → Schedule → Location → Review
2. WHERE the customer selects service type, THE App SHALL display available brands and models from inventory
3. WHEN the customer selects date/time preferences, THE App SHALL show available windows (8 AM - 5 PM, Mon-Sat only)
4. WHILE the customer has not added a primary address, THE App SHALL restrict booking creation with warning message
5. WHEN a booking is submitted, THE App SHALL show submission confirmation and reference ID
6. WHEN a booking status changes, THE App SHALL push real-time notification to customer device
7. WHERE a proposed schedule exists, THE App SHALL allow customer to Accept & Pay or Decline before technician assignment
8. IF a customer declines a proposed schedule, THE App SHALL return booking to submitted state for admin re-evaluation

---

### Requirement 3: Payment Processing

**User Story:** As a customer, I want to upload payment receipts, so that my service can be confirmed and technician dispatched.

#### Acceptance Criteria

1. WHEN payment is due for a booking (status = "scheduled"), THE App SHALL display payment upload screen
2. WHERE the customer selects GCash receipt, THE App SHALL allow photo capture or gallery selection
3. WHILE a payment receipt is being uploaded, THE App SHALL show progress indicator and prevent navigation
4. IF receipt upload fails, THE App SHALL display error message and allow retry
5. WHEN receipt is approved by admin, THE App SHALL update booking status to "confirmed"
6. WHEN receipt is rejected, THE App SHALL notify customer and return booking to scheduled state

---

### Requirement 4: Technician Assignment & Job Management

**User Story:** As a technician, I want to view assigned appointments, so that I can manage my schedule and deliver services.

#### Acceptance Criteria

1. WHEN a technician logs in, THE App SHALL display today's appointments dashboard
2. WHERE technician has assigned appointments, THE App SHALL show list with status badges (Pending, On the way, Arrived, In progress, Complete)
3. WHEN technician updates job status, THE App SHALL send update to backend and refresh UI
4. WHILE technician is en route to job, THE App SHALL track GPS location and update admin in real-time
5. WHEN technician arrives at location, THE App SHALL allow checking in and starting service
6. IF technician cannot complete job, THE App SHALL allow marking as incomplete with reason

---

### Requirement 5: Service Completion & Rating

**User Story:** As a customer, I want to rate Klein & Justin Airconditioning after service completion, so that I can provide feedback on service quality.

#### Acceptance Criteria

1. WHEN service is marked complete, THE App SHALL prompt customer to rate KJAC
2. WHERE customer rates KJAC, THE App SHALL accept 1-5 star rating with optional written review
3. WHILE rating is submitted, THE App SHALL show processing indicator
4. WHEN rating is submitted, THE App SHALL update overall KJAC rating average
5. WHERE customer has completed 5+ bookings, THE App SHALL display service history

---

### Requirement 6: Profile Management

**User Story:** As a user, I want to manage my profile, so that my contact information remains current.

#### Acceptance Criteria

1. WHEN customer updates profile, THE App SHALL validate phone format and address completeness
2. WHILE technician profile changes require admin approval, THE App SHALL show pending status indicator
3. IF technician requests profile change, THE App SHALL notify admin via push notification
4. WHEN profile picture is updated, THE App SHALL use ImagePicker to capture or select image
5. WHERE a user changes password, THE App SHALL require current password and confirm new password

---

### Requirement 7: Navigation & Maps

**User Story:** As a technician, I want navigation to customer locations, so that I can find addresses efficiently.

#### Acceptance Criteria

1. WHEN technician selects job details, THE App SHALL display customer address with Google Maps integration
2. WHERE map is displayed, THE App SHALL show current location and destination pin
3. WHEN navigation button is tapped, THE App SHALL open native navigation app with directions
4. WHILE technician moves, THE App SHALL update location every 30 seconds and send to backend
5. IF GPS signal is lost, THE App SHALL cache location and retry transmission

---

### Requirement 8: Messaging & Notifications

**User Story:** As a user, I want real-time messaging and notifications, so that I stay informed about my bookings.

#### Acceptance Criteria

1. WHEN admin sends message, THE App SHALL push notification to customer or technician device
2. WHILE chat is open, THE App SHALL sync messages in real-time
3. IF message fails to send, THE App SHALL queue for retry with exponential backoff
4. WHERE notifications are enabled, THE App SHALL display badge count on app icon
5. WHEN user taps notification, THE App SHALL navigate to relevant screen

---

### Requirement 9: Offline Capabilities

**User Story:** As a user with intermittent connectivity, I want offline access to recent data, so that I can continue using the app.

#### Acceptance Criteria

1. WHEN offline, THE App SHALL display offline indicator badge
2. WHILE offline, THE App SHALL cache recent bookings and allow viewing
3. IF job status update fails, THE App SHALL queue locally and sync when connection restored
4. WHEN connection restored, THE App SHALL automatically sync queued changes
5. IF cache exceeds storage limit, THE App SHALL purge data older than 30 days

---

### Requirement 10: Performance & Security

**User Story:** As a user, I want a responsive and secure app, so that I can trust the system with my data.

#### Acceptance Criteria

1. WHEN app launches, THE App SHALL be usable within 3 seconds on mid-range devices
2. WHILE API requests are processing, THE App SHALL show appropriate loading indicators
3. IF network request fails, THE App SHALL retry up to 3 times before showing error
4. WHERE JWT token expires, THE App SHALL silently refresh using refresh token
5. IF refresh fails, THE App SHALL log user out and require re-authentication
6. ALL API communication SHALL use HTTPS only
7. WHEN sensitive data is displayed, THE App SHALL blur data when app is backgrounded
8. IF device is compromised (rooted/jailbroken), THE App SHALL warn user and limit functionality

---

### Requirement 11: Design System

**User Story:** As a user, I want the mobile app to match the web app visually, so that the experience is consistent.

#### Acceptance Criteria

1. THE App SHALL use **Manrope** font (Inter on iOS fallback) for all text
2. WHERE technical content is displayed, THE App SHALL use **JetBrains Mono** font
3. WHEN displaying buttons, THE App SHALL use KJAC color palette (primary-400 blue, success-600 green, warning-600 orange, error-600 red)
4. WHERE input fields are displayed, THE App SHALL use min-height 44px (iOS Human Interface Guidelines)
5. WHEN cards are displayed, THE App SHALL use `border-gray-200`, `bg-white`, `rounded-lg` (0.5rem), `shadow-sm`
6. WHERE badges are displayed, THE App SHALL use pill shape (`rounded-full`) with status variants (default, success, warning, info, teal, slate)
7. WHEN scrolling, THE App SHALL use ghost pill-and-groove style (transparent, fades in on hover/scroll)
8. WHERE icons are displayed, THE App SHALL use Lucide React compatible icons
9. WHEN loading states are displayed, THE App SHALL use skeleton loaders (CardSkeleton pattern)

---

### Requirement 12: Technical Specifications

**User Story:** As a developer, I want defined technical standards, so that the app maintains consistency and quality.

#### Acceptance Criteria

1. THE App SHALL use Flutter 3.12+ with Dart 3.x
2. WHERE state management is needed, THE App SHALL use Provider or Riverpod
3. FOR HTTP requests, THE App SHALL use Dio client with interceptors for auth and logging
4. FOR local storage, THE App SHALL use Hive for structured data and SharedPreferences for preferences
5. FOR navigation, THE App SHALL use GoRouter or named route system
6. FOR push notifications, THE App SHALL use Firebase Cloud Messaging
7. FOR image handling, THE App SHALL use ImagePicker and CachedNetworkImage
8. FOR maps, THE App SHALL integrate Google Maps SDK with proper API keys
9. MINIMUM supported OS: Android 8.0 (API 26) / iOS 13.0
10. THE App SHALL include unit tests for core business logic
11. THE App SHALL include widget tests for critical UI components
12. THE App SHALL include integration tests for key user flows

---

## Future Enhancements

The following features are out of scope for the initial release but should be tracked for future phases:

1. **QR/Barcode Scanning**: Inventory item tracking via camera
2. **In-app Camera**: Service photos and documentation
3. **Push Notification Preferences**: Granular control over notification types
4. **Dark Mode**: Theme switching based on system preference
5. **Multi-language**: Tagalog and English language support
6. **Offline Forms**: Complete form completion while offline
7. **Voice Commands**: Hands-free operation for technicians
8. **Analytics Dashboard**: Customer and technician insights
9. **In-app Purchases**: Service upgrades and packages
10. **Social Sharing**: Service review sharing to social media

---

**Document Version**: 1.1  
**Last Updated**: September 18, 2026  
**Maintained By**: KJAC Development Team