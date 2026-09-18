# KJAC Mobile App (Flutter)

A unified Flutter application serving both Customers and Technicians for Klein & Justin Airconditioning (KJAC).

## Documentation Files

### Core Documentation
- **[requirements.md](requirements.md)** - Complete requirements document with all acceptance criteria
- **[design.md](design.md)** - Comprehensive design document with architecture, components, and design system
- **[tasks.md](tasks.md)** - Implementation plan with 60 tasks organized into 8 phases

### Key Corrections (Based on Current Web App)

1. **Technician Account Creation**: Technicians are created via admin invites, NOT self-registration
   - Admin sends invite → Technician accepts via web link (`/technician/accept?token=...`)
   - Mobile app sign-in only (no registration form)

2. **Booking Status Transitions**: 12 statuses supported
   ```
   submitted → proposed → scheduled → confirmed → assigned → ongoing → completed
   cancelled, expired, rescheduled, alternative_proposed, awaiting_payment
   ```

3. **Technician Status Updates**: Only 4 valid statuses
   - `on_the_way`, `arrived`, `inProgress`, `completed`
   - "Mark incomplete" functionality not implemented in backend

4. **Rating System**: Business-wide rating (KJAC as a whole)
   - NOT per-technician rating
   - One rating per completed booking

5. **Design System**: MUST MATCH WEB APP EXACTLY
   - Fonts: Manrope (primary), JetBrains Mono (technical)
   - Colors: KJAC color palette (primary-400 #38b6ff, success-600 #16a34a, warning-600 #d97706, error-600 #dc2626)
   - Components: Button, Card, Input, Badge all match web exactly
   - iOS Human Interface Guidelines: 44px min touch targets

## Project Structure

```
lib/
├── main.dart
├── core/           # Constants, utilities, shared widgets
├── features/       # Feature modules (auth, customer, technician, shared)
├── infra/          # Infrastructure (API, database, storage)
└── router/         # Navigation setup
```

## Design System Compliance

The mobile app MUST match the web app design system exactly. Key requirements:

### Typography
```css
--font-primary: "Manrope", "Inter", system-ui, -apple-system, sans-serif;
--font-technical: "JetBrains Mono", "Courier New", monospace;
```

### Colors
- Primary: #38b6ff (main blue)
- Success: #16a34a (green)
- Warning: #d97706 (orange)
- Error: #dc2626 (red)
- Info: #2563eb (blue)
- Teal: #0d9488 (active)

### Components
- Buttons: rounded-lg, min-h-44px, variants (primary, secondary, destructive, outline, ghost, link)
- Cards: border-gray-200, bg-white, rounded-lg, shadow-sm
- Inputs: min-h-44px, border-gray-200, rounded-lg, focus:border-primary-600
- Badges: rounded-full, status variants (default, success, warning, info, teal, slate)

## Development Roadmap

### Phase 1: Project Setup & Foundation (Tasks 1-7)
- Initialize Flutter project
- Configure dependencies
- Set up directory structure
- Configure Firebase and Google Maps
- Set up error tracking

### Phase 2: Core Infrastructure (Tasks 8-15)
- Implement App Theme (Manrope fonts, KJAC colors)
- Create Base Widgets (Button, Card, Input, Badge)
- Implement API Client with Dio
- Set up Local Storage (Hive)
- Create Router configuration
- Set up Authentication Provider
- Implement Network Status Monitor

### Phase 3: Authentication Module (Tasks 16-25)
- Implement Splash Screen
- Implement Onboarding Screens
- Implement Login Screen (Customer & Technician)
- Implement Customer Registration
- **Implement Technician Invite Acceptance (NO self-registration)**
- Implement Forgot Password Flow
- Implement Reset Password Flow
- Implement 2FA Verification (admin only)
- Implement Biometric Login
- Create Auth State Management

### Phase 4: Customer Module (Tasks 26-35)
- Implement Customer Home Dashboard
- Implement My Bookings Screen
- Implement Create Booking Wizard
- Implement Booking Detail Screen
- Implement Booking Status Tracker
- Implement Upload Payment Screen
- Implement Customer Profile Screen
- Implement Chat Screen
- Implement Notifications Screen
- Implement Settings Screen

### Phase 5: Technician Module (Tasks 36-44) - **CORRECTED**
- Implement Technician Home Dashboard (NO Performance Metrics)
- Implement Today's Appointments Screen
- Implement Appointment Detail Screen (NO "Mark Incomplete")
- Implement Schedule Calendar Screen
- Implement Customer Navigation Screen
- Implement Technician Profile Screen (SIMPLIFIED)
- Implement Rating Screen (Business-wide rating)
- Implement Chat Screen
- Create Technician State Management

### Phase 6: Shared Features (Tasks 45-50)
- Implement Messaging System
- Implement Push Notification Handling
- Implement Offline Sync Queue
- Implement Image Picker Integration
- Implement Loading States & Skeleton UI
- Implement Form Validation Utilities

### Phase 7: Testing (Tasks 51-55)
- Write Unit Tests
- Write Property Tests for all 8 properties
- Write Widget Tests
- Write Integration Tests
- Performance Testing

### Phase 8: Deployment (Tasks 56-60)
- Configure Android signing
- Configure iOS signing
- Test on multiple device sizes
- Prepare App Store and Play Store assets
- Create deployment documentation

## Quality Gates

Before deployment, the following quality gates must be passed:

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
   - **Design matches web app exactly** (Manrope fonts, KJAC colors, same UI patterns)

## Notes

- All technical requirements are in `requirements.md`
- Complete design specifications are in `design.md`
- Implementation tasks are in `tasks.md`
- Property tests are included in `tasks.md` task 52
- Design system compliance is mandatory (see "Design System Compliance" section above)