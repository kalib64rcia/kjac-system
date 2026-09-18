# Implementation Plan: KJAC Mobile App (Flutter)

## Overview

This implementation plan covers the complete development of the KJAC mobile app - a unified Flutter application serving both Customers and Technicians. The app follows Clean Architecture principles with distinct layers for UI, business logic, and data access. Implementation is organized into 8 phases, progressing from foundation setup through final deployment.

**Implementation Language:** Dart (Flutter 3.12+)

**Key Corrections (Based on Current Web App):**
- Technicians are created via admin invites, NOT self-registration
- Rating is for "KJAC as a whole", not per technician
- Technician status updates only support: `on_the_way`, `arrived`, `ongoing`, `completed`

---

## Tasks

### Phase 1: Project Setup & Foundation

- [ ] 1. Initialize Flutter project structure
  - Create Flutter project with proper naming convention (kjac_mobile)
  - Set up directory structure following Clean Architecture pattern
  - Configure project to support both Android and iOS platforms
  - _Requirements: 11.1, 11.2_

- [ ] 2. Configure pubspec.yaml with required dependencies
  - Add core dependencies: flutter, flutter_test, dart_core
  - Add state management: riverpod, provider
  - Add networking: dio, retrofit
  - Add local storage: hive, hive_flutter, shared_preferences
  - Add navigation: go_router
  - Add platform-specific: firebase_messaging, google_maps_flutter, image_picker
  - Add testing: mockito, test
  - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 3. Set up project directories following clean architecture
  - Create core/, features/, infra/, router/ directories
  - Set up domain/data/presentation subdirectories for each feature
  - Configure proper layering rules and dependencies
  - _Requirements: 11.2_

- [ ] 4. Configure environment variables and API base URL
  - Create .env file structure for different environments (dev, staging, prod)
  - Configure API_BASE_URL, Firebase configuration, Google Maps API key
  - Set up environment detection at runtime
  - _Requirements: 11.3_

- [ ] 5. Set up Firebase for push notifications
  - Configure Firebase project and download configuration files
  - Set up Firebase Cloud Messaging for iOS and Android
  - Implement FCM token management
  - _Requirements: 10.2, 11.6_

- [ ] 6. Configure Google Maps API key
  - Add Google Maps API key to Android and iOS configuration
  - Set up necessary permissions in AndroidManifest and Info.plist
  - Implement map initialization service
  - _Requirements: 11.8_

- [ ] 7. Set up error tracking (Sentry)
  - Add Sentry SDK to dependencies
  - Configure Sentry with appropriate environment and DSN
  - Implement automatic error reporting for unhandled exceptions
  - _Requirements: 10.3_

### Phase 2: Core Infrastructure

- [ ] 8. Implement App Theme (colors, typography, spacing) - **MATCH WEB APP**
  - Define KJAC color palette in app_colors.dart (primary-400 #38b6ff, success-600 #16a34a, warning-600 #d97706, error-600 #dc2626)
  - Create typography styles: Manrope primary, JetBrains Mono technical, Inter fallback
  - Set up consistent spacing tokens (4px, 8px, 16px, 24px, 32px)
  - Implement iOS Human Interface Guidelines compliance (min 44px touch targets)
  - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [ ] 9. Create Base Widgets (Button, Card, Input, Badge) - **MATCH WEB APP**
  - Implement Button widget with KJAC variants (primary, secondary, destructive, outline, ghost)
  - Create Card component with border-gray-200, bg-white, rounded-lg, shadow-sm
  - Build Input component with 44px min-height, rounded-lg, border-gray-200
  - Implement Badge component with pill shape (rounded-full), status variants
  - _Requirements: 11.2, 12.4, 12.5, 12.6_

- [ ] 10. Implement API Client with Dio and interceptors
  - Configure Dio client with base URL and timeout settings
  - Implement AuthInterceptor for automatic token refresh
  - Create LoggingInterceptor for request/response debugging
  - Add ErrorInterceptor for consistent error handling
  - _Requirements: 10.6, 11.3_

- [ ] 11. Set up Local Storage (Hive + SharedPreferences)
  - Initialize Hive in main.dart with proper type adapters
  - Implement secure storage for sensitive data (tokens, biometric keys)
  - Create StorageManager utility for unified access
  - _Requirements: 9.5, 11.4_

- [ ] 12. Implement Error Handling utilities
  - Create AppException, NetworkException, BusinessLogicException classes
  - Implement error mapping from API responses
  - Create error display utility for consistent UI feedback
  - _Requirements: 10.3_

- [ ] 13. Create Router configuration with GoRouter
  - Define route names in route_names.dart
  - Configure router with splash, auth, customer, and technician routes
  - Implement route guards for authenticated routes
  - _Requirements: 11.5_

- [ ] 14. Set up Authentication Provider
  - Create AuthState model (notAuthed, authenticating, authenticated)
  - Implement AuthProvider with ChangeNotifier
  - Add user stream subscription for auth state changes
  - _Requirements: 1.1_

- [ ] 15. Implement Network Status Monitor
  - Create ConnectivityMonitor service using connectivity_plus
  - Implement stream for network status changes
  - Add offline indicator UI component
  - _Requirements: 9.1_

### Phase 3: Authentication Module

- [ ] 16. Implement Splash Screen (2-second animation)
  - Create splash screen with KJAC branding
  - Implement exact 2-second delay with animation
  - Add navigation logic based on auth state and onboarding
  - _Requirements: 1.1_

- [ ] 17. Implement Onboarding Screens (5 screens with swipe)
  - Design and implement 5 onboarding content screens
  - Add swipe gesture navigation between screens
  - Implement skip and next buttons
  - Store onboarding completion in SharedPreferences
  - _Requirements: 1.2_

- [ ] 18. Implement Login Screen (Customer & Technician tabs)
  - Create tab-based login screen with Customer/Technician tabs
  - Implement email/password validation
  - Add login button with loading state
  - Implement error display for failed login attempts
  - _Requirements: 1.3_

- [ ] 19. Implement Customer Registration Screen
  - Design registration form with required fields
  - Implement email format validation
  - Add phone number validation for Philippine format
  - Create registration service integration
  - _Requirements: 1.4_

- [ ] 20. Implement Technician Invite Acceptance Flow - **CORRECTED: No self-registration**
  - **NO Technician registration screen**
  - Technician clicks invite link → opens web page → enters credentials
  - Mobile app sign-in only (after invite accepted via web)
  - Show sign-in screen with invite token validation
  - _Requirements: 1.5_

- [ ] 21. Implement Forgot Password Flow
  - Create email input screen for password reset request
  - Implement forgot_password API integration
  - Add success/error messaging
  - _Requirements: 1.6_

- [ ] 22. Implement Reset Password Flow
  - Design password reset form with new password confirmation
  - Implement reset_password API integration
  - Add password strength validation
  - Redirect to login on success
  - _Requirements: 1.6_

- [ ] 23. Implement 2FA Verification Screen (admin only)
  - Create OTP input screen for two-factor authentication
  - Implement OTP verification service integration
  - Add resend OTP functionality
  - _Requirements: 1.3_

- [ ] 24. Implement Biometric Login option
  - Add biometric login toggle to login screen
  - Implement biometric authentication service
  - Handle biometric failure fallback to password
  - Store biometric enablement state
  - _Requirements: 1.7_

- [ ] 25. Create Auth State Management with Provider
  - Implement AuthNotifier with Riverpod
  - Add login, logout, and session management methods
  - Create stream for auth state changes
  - _Requirements: 1.1, 1.8_

### Phase 4: Customer Module

- [ ] 26. Implement Customer Home Dashboard
  - Create welcome banner with customer name
  - Add quick action buttons (book service, view bookings, profile)
  - Implement recent bookings preview section
  - _Requirements: 2.1_

- [ ] 27. Implement My Bookings Screen (tabs: All, Active, Past)
  - Design tab-based navigation for booking statuses
  - Implement Booking Card widget with status badges
  - Add pull-to-refresh functionality
  - _Requirements: 2.1_

- [ ] 28. Implement Create Booking Wizard (Step 1-5)
  - Step 1: Service Selection (repair, installation, maintenance, cleaning)
  - Step 2: Details (brand, model, description, images)
  - Step 3: Schedule (date/time picker for Mon-Sat 8AM-5PM)
  - Step 4: Location (address selection with landmark)
  - Step 5: Review (summary, down payment, confirmation)
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 29. Implement Booking Detail Screen
  - Display comprehensive booking information
  - Add status timeline visualization
  - Implement status action buttons based on current state
  - _Requirements: 2.5_

- [ ] 30. Implement Booking Status Tracker Screen
  - Design status flow visualization (submitted → proposed → scheduled → confirmed → assigned → ongoing → completed)
  - Add real-time status updates display
  - Implement push notification integration for status changes
  - _Requirements: 2.6_

- [ ] 31. Implement Upload Payment Screen
  - Create payment upload form with GCash receipt capture
  - Implement image picker for photo capture or gallery selection
  - Add upload progress indicator
  - Validate image format and size
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 32. Implement Customer Profile Screen
  - Design profile management interface
  - Implement editable fields (name, phone, address)
  - Add password change section
  - _Requirements: 6.1, 6.5_

- [ ] 33. Implement Chat Screen (customer side)
  - Create messaging interface with message bubbles
  - Implement message input with send functionality
  - Add real-time message display with Firebase integration
  - _Requirements: 8.2_

- [ ] 34. Implement Notifications Screen
  - Design notification list with unread count
  - Implement notification detail view
  - Add mark as read functionality
  - _Requirements: 8.4_

- [ ] 35. Implement Settings Screen (customer)
  - Create settings options (notifications, language, privacy)
  - Implement logout functionality
  - Add app version and support information
  - _Requirements: 11.2_

### Phase 5: Technician Module - **CORRECTED**

- [ ] 36. Implement Technician Home Dashboard - **NO Performance Metrics**
  - Display today's appointments count and summary
  - Add status breakdown (pending, on the way, in progress, complete)
  - Show KJAC overall rating (not per-technician stats)
  - _Requirements: 4.1_

- [ ] 37. Implement Today's Appointments Screen
  - Create list of appointments for current day
  - Add status badges (Pending, On the way, Arrived, In progress, Complete)
  - Implement filter by status functionality
  - _Requirements: 4.2_

- [ ] 38. Implement Appointment Detail Screen
  - Display comprehensive appointment information
  - Add customer details and job description
  - Implement status update buttons (onTheWay, arrived, ongoing, complete)
  - **NO "Mark Incomplete"** (not implemented in backend)
  - _Requirements: 4.3_

- [ ] 39. Implement Schedule Calendar Screen
  - Design monthly calendar view
  - Add appointment markers for scheduled dates
  - Implement date selection for appointment details
  - _Requirements: 4.2_

- [ ] 40. Implement Customer Navigation Screen (Google Maps)
  - Integrate Google Maps SDK for location display
  - Show customer location with custom pin
  - Implement navigation button to open native maps app
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 41. Implement Technician Profile Screen - **SIMPLIFIED**
  - Display technician information and KJAC rating
  - Add editable profile section with admin approval workflow
  - Implement profile picture update with ImagePicker
  - **REMOVE**: Performance metrics (not in backend)
  - _Requirements: 6.2, 6.4_

- [ ] 42. Implement Rating Screen - **CORRECTED: Business-wide rating**
  - Design rating interface for KJAC (not per-technician)
  - Accept 1-5 star rating with optional written review
  - Submit rating to business-wide endpoint
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 43. Implement Chat Screen (technician side)
  - Create messaging interface with admin
  - Implement message input and send functionality
  - Add real-time message display
  - _Requirements: 8.2_

- [ ] 44. Create Technician State Management with Provider
  - Implement TechnicianNotifier with Riverpod
  - Add appointment management and status update methods
  - Create stream for appointment changes
  - _Requirements: 4.1, 4.3_

### Phase 6: Shared Features

- [ ] 45. Implement Messaging System
  - Create Message data model
  - Implement message service with Firebase integration
  - Add message queue for offline scenarios
  - _Requirements: 8.1, 8.3_

- [ ] 46. Implement Push Notification Handling
  - Create notification service with FCM integration
  - Implement foreground notification display
  - Add notification tap handling for deep linking
  - _Requirements: 8.5, 10.2_

- [ ] 47. Implement Offline Sync Queue
  - Create QueuedOperation data model
  - Implement RetryQueue service with exponential backoff
  - Add offline operation queuing for failed requests
  - _Requirements: 9.3, 9.4_

- [ ] 48. Implement Image Picker Integration
  - Create ImageService utility for image operations
  - Implement photo capture and gallery selection
  - Add image compression and optimization
  - _Requirements: 6.4, 3.2_

- [ ] 49. Implement Loading States & Skeleton UI
  - Create LoadingOverlay widget for full-screen loading
  - Implement SkeletonCard for list item placeholders (match web CardSkeleton)
  - Add loading animation with primary color
  - _Requirements: 10.2, 12.7_

- [ ] 50. Implement Form Validation Utilities
  - Create form_validators.dart with reusable validators
  - Implement email, phone, password, and address validation
  - Add custom error messages for each validation
  - _Requirements: 6.1, 1.4, 1.5_

### Phase 7: Testing

- [ ] 51. Write Unit Tests for Business Logic
  - Test booking status transitions
  - Test rating calculation logic (business-wide)
  - Test address validation
  - Achieve 90%+ code coverage
  - _Requirements: 11.10_

- [ ] 52. Write Property Tests for Correctness Properties
  - **Property 1**: Navigation based on authentication state
    - Test splash screen duration (2 seconds)
    - Test navigation to correct screen based on auth state
    - Test onboarding completion flow
    - _Validates: Requirements 1.1, 1.2, 1.3_
  
  - **Property 2**: Registration data validation
    - Test email format validation
    - Test phone number format validation
    - Test password strength requirements
    - _Validates: Requirements 1.4, 1.5_
  
  - **Property 3**: Booking status transitions
    - Test all valid status transitions
    - Test invalid status transition rejection
    - Test state machine integrity
    - _Validates: Requirements 2.1, 2.5, 2.6, 2.7, 2.8_
  
  - **Property 4**: Payment upload workflow
    - Test payment screen visibility conditions
    - Test image validation
    - Test failed upload queueing
    - _Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - **Property 5**: Technician status updates
    - Test valid status transitions (on_the_way, arrived, ongoing, complete)
    - Test GPS coordinate inclusion
    - Test notification triggers
    - _Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - **Property 6**: Rating calculation correctness (business-wide)
    - Test average rating calculation (KJAC as whole)
    - Test rating count updates
    - _Validates: Requirements 5.1, 5.2, 5.3, 5.4_
  
  - **Property 7**: Offline data synchronization
    - Test offline operation queuing
    - Test sync on connection restore
    - Test cache purge logic
    - _Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - **Property 8**: Authentication security
    - Test login failure counting
    - Test account lockout after 5 failures
    - Test email notification on lockout
    - _Validates: Requirements 1.6, 1.7, 1.8, 10.4, 10.5_
  
  - _Execute all property tests with 100+ iterations_
  - _Requirements: 11.11_

- [ ] 53. Write Widget Tests for Key Screens
  - Test Login Screen validation
  - Test Booking Creation wizard screens
  - Test Technician status update buttons
  - Test profile picture upload
  - _Requirements: 11.11_

- [ ] 54. Write Integration Tests for User Flows
  - Test complete booking flow from creation to completion
  - Test user registration and onboarding flow
  - Test technician job assignment and completion flow
  - Test payment upload and approval workflow
  - _Requirements: 11.12_

- [ ] 55. Performance Testing (launch time < 3s)
  - Measure app launch time from cold start
  - Test on mid-range device specification
  - Optimize assets and code for performance
  - _Requirements: 10.1_

### Phase 8: Deployment

- [ ] 56. Configure Android signing and build settings
  - Create keystore for release builds
  - Configure build.gradle with correct settings
  - Set up AndroidManifest with required permissions
  - _Requirements: 11.9_

- [ ] 57. Configure iOS signing and build settings
  - Create provisioning profiles
  - Configure info.plist with required keys
  - Set up code signing in Xcode
  - _Requirements: 11.9_

- [ ] 58. Test on multiple device sizes
  - Test on Android devices (small, medium, large)
  - Test on iOS devices (iPhone SE, iPhone 14, iPad)
  - Verify responsive layout behavior
  - _Requirements: 11.9_

- [ ] 59. Prepare App Store and Play Store assets
  - Create app icons (various sizes)
  - Design screenshots for both platforms
  - Write app description and keywords
  - _Requirements: 11.9_

- [ ] 60. Create deployment documentation
  - Document build and release process
  - Create troubleshooting guide
  - Document environment configuration
  - _Requirements: 11.9_

---

## Quality Gates

The following quality gates must be passed before deployment:

1. **Test Coverage**
   - All unit tests passing (90%+ coverage)
   - All property tests passing (100+ iterations each)
   - All integration tests passing
   - All widget tests passing for critical screens

2. **Performance**
   - App launch time under 3 seconds on mid-range devices
   - Network requests timeout properly (30 seconds max)
   - Memory usage stable during extended usage

3. **Security**
   - All API communication uses HTTPS only
   - JWT tokens properly managed and refreshed
   - Biometric authentication secure
   - Sensitive data encrypted at rest

4. **UI/UX**
   - All screens responsive across device sizes
   - Loading states and error messages consistent
   - Accessibility compliance (contrast, touch targets)
   - Design matches web app exactly (Manrope fonts, KJAC colors, same UI patterns)

---

## Notes

- Tasks marked with **CORRECTED** reflect changes based on current web app implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- Integration tests cover critical user flows
- Checkpoints at the end of each major phase ensure quality gates are met
- The implementation follows Clean Architecture principles with clear separation of concerns
- All tasks build incrementally, with foundation phases completed before feature development
- Testing tasks are structured as sub-tasks under implementation tasks where appropriate
- Design system tasks must match web app exactly (Manrope fonts, KJAC color palette, same UI components)