# KJAC Design System

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Applies To:** Web (React) and Mobile (Flutter)

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Iconography](#iconography)
7. [Animations & Transitions](#animations--transitions)
8. [Responsive Design](#responsive-design)
9. [Platform-Specific Guidelines](#platform-specific-guidelines)

---

## Design Philosophy

### Core Principles
1. **Consistency** - Unified design language across web and mobile
2. **Accessibility** - WCAG 2.1 AA compliance (future goal)
3. **Performance** - Fast loading, smooth interactions
4. **Clarity** - Clear information hierarchy, scannable content
5. **Trust** - Professional appearance, secure feeling

### Design Approach
- **Mobile-first** responsive design (web)
- **iOS Human Interface Guidelines** (HIG) for mobile
- **Component-based** architecture
- **Design tokens** for maintainability

---

## Color System

### Primary Color
```css
--primary: #38b6ff;  /* Klein & Justin Blue */
--primary-50: #e6f7ff;
--primary-100: #b3e5ff;
--primary-200: #80d4ff;
--primary-300: #4dc2ff;
--primary-400: #38b6ff;  /* Base */
--primary-500: #1aa9ff;
--primary-600: #0090e6;
--primary-700: #0077cc;
--primary-800: #005fa3;
--primary-900: #004d85;
```

**Usage:**
- **Primary buttons** - `primary-400`
- **Links** - `primary-600`
- **Active states** - `primary-500`
- **Focus outlines** - `primary-600`
- **Badge backgrounds** - `primary-100`

---

### Secondary Colors (Blue Hues)
```css
--secondary-light: #6EC6FF;   /* Lighter blue */
--secondary-medium: #1E90DA;  /* Medium blue */
--secondary-dark: #004C99;    /* Darker blue */
--secondary-accent: #00D4FF;  /* Cyan accent */
```

**Usage:**
- **Secondary buttons** - `secondary-medium`
- **Hover states** - `secondary-light`
- **Section backgrounds** - `secondary-light` with opacity
- **Accent highlights** - `secondary-accent`

---

### Neutral Colors (Grayscale)
```css
--white: #FFFFFF;
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
--black: #000000;
```

**Usage:**
- **Main background** - `white`
- **Card backgrounds** - `white` or `gray-50`
- **Borders** - `gray-200`
- **Body text** - `gray-900`
- **Secondary text** - `gray-600`
- **Disabled text** - `gray-400`
- **Placeholder text** - `gray-400`

---

### Semantic Colors

#### Success
```css
--success-50: #F0FDF4;
--success-500: #22C55E;  /* Green - main success color */
--success-700: #15803D;
```

**Usage:** Success messages, checkmarks, positive states

#### Warning
```css
--warning-50: #FFFBEB;
--warning-500: #F59E0B;  /* Amber - main warning color */
--warning-700: #B45309;
```

**Usage:** Warning messages, pending states, caution notices

#### Error
```css
--error-50: #FEF2F2;
--error-500: #EF4444;  /* Red - main error color */
--error-700: #B91C1C;
```

**Usage:** Error messages, validation errors, destructive actions

#### Info
```css
--info-50: #EFF6FF;
--info-500: #3B82F6;  /* Blue - main info color */
--info-700: #1D4ED8;
```

**Usage:** Informational messages, help text, tooltips

---

### Color Usage Guidelines

#### Text Contrast
- **Body text on white:** `gray-900` (21:1 contrast ratio)
- **Secondary text on white:** `gray-600` (7:1 contrast ratio)
- **White text on primary:** `white` (4.5:1 contrast ratio)
- **Link text:** `primary-600` with underline on hover

#### Background Combinations
✅ **Approved Combinations:**
- `white` background + `gray-900` text
- `primary-400` background + `white` text
- `gray-50` background + `gray-900` text
- `gray-900` background + `white` text

❌ **Avoid:**
- `gray-300` background + `gray-400` text (low contrast)
- `primary-100` background + `primary-300` text (low contrast)

---

## Typography

### Font Families

#### Manrope (Primary Font)
**Usage:** Headers, body text, buttons, badges, general UI
```css
font-family: 'Manrope', system-ui, -apple-system, sans-serif;
```

**Weights Available:**
- 400 (Regular) - Body text
- 500 (Medium) - Subheadings, emphasized text
- 600 (SemiBold) - Buttons, small headers
- 700 (Bold) - Main headers
- 800 (ExtraBold) - Hero text (rare)

---

#### JetBrains Mono (Technical Font)
**Usage:** Navbars, sidebars, statistics, IDs, numbers, technical data
```css
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

**Weights Available:**
- 400 (Regular) - IDs, numbers
- 500 (Medium) - Stats, technical labels
- 600 (SemiBold) - Emphasized technical data

**When to Use JetBrains Mono:**
- Booking reference IDs (e.g., `KJAC-2026-ABC123`)
- Phone numbers, email addresses (in technical contexts)
- Statistics and metrics (revenue, counts)
- Date/time displays (when precision matters)
- Data tables (for alignment)

---

#### Inter (Fallback Font)
**Usage:** Fallback if Manrope fails to load
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

---

### Font Configuration (Configurable by Admin)
**Note:** Font families can be changed via admin settings panel (future phase). The design system should support font switching without breaking layouts.

**Implementation:**
```css
:root {
  --font-primary: 'Manrope', system-ui, sans-serif;
  --font-technical: 'JetBrains Mono', monospace;
  --font-fallback: 'Inter', system-ui, sans-serif;
}
```

---

### Type Scale (Responsive)

#### Web Typography

##### Headings
```css
/* H1 - Page Title */
.h1 {
  font-family: var(--font-primary);
  font-size: clamp(2rem, 5vw, 3.5rem);      /* 32px - 56px */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
}

/* H2 - Section Title */
.h2 {
  font-family: var(--font-primary);
  font-size: clamp(1.75rem, 4vw, 2.5rem);   /* 28px - 40px */
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin-bottom: 1.25rem;
}

/* H3 - Subsection Title */
.h3 {
  font-family: var(--font-primary);
  font-size: clamp(1.5rem, 3vw, 2rem);      /* 24px - 32px */
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 1rem;
}

/* H4 - Card Title */
.h4 {
  font-family: var(--font-primary);
  font-size: clamp(1.25rem, 2.5vw, 1.5rem); /* 20px - 24px */
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

/* H5 - Small Header */
.h5 {
  font-family: var(--font-primary);
  font-size: clamp(1.125rem, 2vw, 1.25rem); /* 18px - 20px */
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

/* H6 - Micro Header */
.h6 {
  font-family: var(--font-primary);
  font-size: 1rem;                           /* 16px */
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

##### Body Text
```css
/* Body Large */
.text-lg {
  font-family: var(--font-primary);
  font-size: clamp(1.125rem, 2vw, 1.25rem); /* 18px - 20px */
  font-weight: 400;
  line-height: 1.6;
  color: var(--gray-900);
}

/* Body Base */
.text-base {
  font-family: var(--font-primary);
  font-size: 1rem;                           /* 16px */
  font-weight: 400;
  line-height: 1.6;
  color: var(--gray-900);
}

/* Body Small */
.text-sm {
  font-family: var(--font-primary);
  font-size: 0.875rem;                       /* 14px */
  font-weight: 400;
  line-height: 1.5;
  color: var(--gray-700);
}

/* Caption/Meta Text */
.text-xs {
  font-family: var(--font-primary);
  font-size: 0.75rem;                        /* 12px */
  font-weight: 400;
  line-height: 1.4;
  color: var(--gray-600);
}
```

##### Technical Text (JetBrains Mono)
```css
/* Technical Large (Stats) */
.text-tech-lg {
  font-family: var(--font-technical);
  font-size: clamp(1.5rem, 3vw, 2rem);      /* 24px - 32px */
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

/* Technical Base (IDs, Numbers) */
.text-tech-base {
  font-family: var(--font-technical);
  font-size: 0.875rem;                       /* 14px */
  font-weight: 500;
  line-height: 1.5;
}

/* Technical Small */
.text-tech-sm {
  font-family: var(--font-technical);
  font-size: 0.75rem;                        /* 12px */
  font-weight: 400;
  line-height: 1.4;
}
```

---

#### Mobile Typography (Flutter)

```dart
// Headings
TextStyle h1 = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 32,
  fontWeight: FontWeight.w700,
  height: 1.2,
  letterSpacing: -0.5,
);

TextStyle h2 = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 24,
  fontWeight: FontWeight.w700,
  height: 1.3,
  letterSpacing: -0.3,
);

TextStyle h3 = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 20,
  fontWeight: FontWeight.w600,
  height: 1.4,
);

// Body
TextStyle bodyLarge = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 17,  // iOS standard
  fontWeight: FontWeight.w400,
  height: 1.5,
);

TextStyle bodyBase = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 15,
  fontWeight: FontWeight.w400,
  height: 1.5,
);

TextStyle bodySmall = TextStyle(
  fontFamily: 'Manrope',
  fontSize: 13,
  fontWeight: FontWeight.w400,
  height: 1.4,
  color: Color(0xFF6B7280), // gray-500
);

// Technical (JetBrains Mono)
TextStyle technicalLarge = TextStyle(
  fontFamily: 'JetBrains Mono',
  fontSize: 20,
  fontWeight: FontWeight.w600,
  height: 1.2,
);

TextStyle technicalBase = TextStyle(
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
  fontWeight: FontWeight.w500,
  height: 1.5,
);
```

---

### Typography Rules

1. **No text wrapping in buttons and badges** - Text must fit on one line
   - Use `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
   - Or shorten text programmatically

2. **Hierarchy** - Always use correct heading levels (don't skip)
   - h1 → h2 → h3 (not h1 → h3)

3. **Line Length** - Max 75 characters per line for body text (optimal readability)

4. **Emphasis** - Use font-weight, not all caps (except h6 labels)

5. **Links** - Underline on hover, primary color

---

## Spacing & Layout

### Spacing Scale (4px Base Unit)
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**Usage Guide:**
- **Micro spacing** (1-2): Icon-to-text, input padding
- **Small spacing** (3-4): Between related elements (label-input, card items)
- **Medium spacing** (5-6): Between components (buttons, cards)
- **Large spacing** (8-12): Section padding, between sections
- **Extra large spacing** (16-24): Hero sections, major divisions

---

### Border Radius Scale
```css
--radius-none: 0;
--radius-sm: 0.25rem;   /* 4px - inputs, small buttons */
--radius-md: 0.5rem;    /* 8px - buttons, badges */
--radius-lg: 0.75rem;   /* 12px - cards */
--radius-xl: 1rem;      /* 16px - modals, large cards */
--radius-2xl: 1.5rem;   /* 24px - hero sections */
--radius-full: 9999px;  /* Fully rounded - pills, avatars */
```

**Consistency Rule:** Use same radius scale across all elements

---

### Container Widths (Responsive Breakpoints)
```css
/* Mobile First Approach */
--container-sm: 640px;   /* Small devices */
--container-md: 768px;   /* Tablets */
--container-lg: 1024px;  /* Small laptops */
--container-xl: 1280px;  /* Desktops */
--container-2xl: 1536px; /* Large desktops */
```

**Granular Breakpoints:**
```css
/* Extra Small (Mobile Portrait) */
@media (min-width: 320px) { /* ... */ }

/* Small (Mobile Landscape) */
@media (min-width: 480px) { /* ... */ }

/* Medium (Tablets) */
@media (min-width: 768px) { /* ... */ }

/* Large (Laptops) */
@media (min-width: 1024px) { /* ... */ }

/* Extra Large (Desktops) */
@media (min-width: 1280px) { /* ... */ }

/* 2XL (Large Monitors) */
@media (min-width: 1536px) { /* ... */ }

/* 4K */
@media (min-width: 2560px) { /* ... */ }
```

---

### Grid System

#### Web (Tailwind-Style 12-Column Grid)
```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 640px) {
  .container { max-width: 640px; padding: 0 var(--space-6); }
}

@media (min-width: 768px) {
  .container { max-width: 768px; }
}

@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}
```

#### Mobile (Flutter Safe Area)
```dart
SafeArea(
  child: Container(
    padding: EdgeInsets.symmetric(horizontal: 16),
    child: // Your content
  ),
)
```

---

### Clamp for Smooth Responsiveness

**Example: Responsive Padding**
```css
.section {
  padding: clamp(2rem, 5vw, 5rem) clamp(1rem, 3vw, 3rem);
  /* min: 32px/16px, preferred: 5vw/3vw, max: 80px/48px */
}
```

**Example: Responsive Font Size**
```css
.hero-title {
  font-size: clamp(2rem, 5vw + 1rem, 4rem);
  /* Smoothly scales from 32px to 64px */
}
```

**Benefits:**
- Smooth transitions between breakpoints
- Fewer media queries needed
- Better responsive feel

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: var(--white);
  background: var(--primary-400);
  border: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 200ms ease;
}

.btn-primary:hover {
  background: var(--primary-500);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(56, 182, 255, 0.2);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(56, 182, 255, 0.15);
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.6;
}

.btn-primary.loading {
  cursor: wait;
  pointer-events: none;
}

.btn-primary.loading .btn-text {
  display: none;
}

.btn-primary.loading::after {
  content: '';
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--white);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

#### Secondary Button
```css
.btn-secondary {
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-600);
  background: var(--white);
  border: 2px solid var(--primary-400);
  border-radius: var(--radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 200ms ease;
}

.btn-secondary:hover {
  background: var(--primary-50);
  border-color: var(--primary-500);
}
```

#### Ghost Button
```css
.btn-ghost {
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-600);
  background: transparent;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 200ms ease;
}

.btn-ghost:hover {
  background: var(--primary-50);
  border-radius: var(--radius-md);
}
```

#### Danger Button (Destructive)
```css
.btn-danger {
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: var(--white);
  background: var(--error-500);
  border: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-danger:hover {
  background: var(--error-600);
}
```

#### Button Sizes
```css
/* Small */
.btn-sm {
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
}

/* Medium (Default) */
.btn-md {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
}

/* Large */
.btn-lg {
  font-size: 1.125rem;
  padding: 1rem 2rem;
}
```

**Button Rules:**
1. Disable button once clicked (prevent double-click)
2. Show loading spinner, hide text during loading
3. Don't resize button during loading (use fixed dimensions)
4. Always use `cursor: pointer` on clickable buttons
5. Always use `cursor: not-allowed` on disabled buttons

---

### Form Inputs

#### Text Input
```css
.input {
  font-family: var(--font-primary);
  font-size: 1rem;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  width: 100%;
  transition: all 200ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.input:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}

.input.error {
  border-color: var(--error-500);
}

.input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input::placeholder {
  color: var(--gray-400);
}
```

#### Label
```css
.label {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
  display: block;
}

.label.required::after {
  content: ' *';
  color: var(--error-500);
}

.label .optional {
  font-weight: 400;
  color: var(--gray-500);
}
```

#### Error Message
```css
.input-error {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--error-600);
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
```

**Form Field Structure:**
```html
<div class="form-field">
  <label class="label required" for="email">
    Email Address
  </label>
  <input 
    type="email" 
    id="email" 
    class="input" 
    placeholder="you@example.com"
    required
  />
  <p class="input-error">
    <icon-alert-circle size="16" />
    Please enter a valid email address
  </p>
</div>
```

---

### Cards

#### Basic Card
```css
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 200ms ease;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}

.card-clickable {
  cursor: pointer;
}

.card-clickable:active {
  transform: translateY(0);
}
```

#### Card with Header
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-subtitle">Optional subtitle</p>
  </div>
  <div class="card-body">
    <!-- Content -->
  </div>
  <div class="card-footer">
    <!-- Actions -->
  </div>
</div>
```

```css
.card-header {
  border-bottom: 1px solid var(--gray-200);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.25rem;
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.card-footer {
  border-top: 1px solid var(--gray-200);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

---

### Badges

```css
.badge {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* Status Badges */
.badge-success {
  background: var(--success-50);
  color: var(--success-700);
}

.badge-warning {
  background: var(--warning-50);
  color: var(--warning-700);
}

.badge-error {
  background: var(--error-50);
  color: var(--error-700);
}

.badge-info {
  background: var(--info-50);
  color: var(--info-700);
}

.badge-primary {
  background: var(--primary-50);
  color: var(--primary-700);
}

.badge-neutral {
  background: var(--gray-100);
  color: var(--gray-700);
}
```

---

### Modals

```css
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
  animation: fadeIn 200ms ease;
}

/* Modal Container */
.modal {
  background: var(--white);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 200ms ease;
}

/* Modal Header */
.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
}

.modal-close {
  background: none;
  border: none;
  color: var(--gray-500);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
}

.modal-close:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}

/* Modal Body */
.modal-body {
  padding: var(--space-6);
}

/* Modal Footer */
.modal-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--gray-200);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### Toast Notifications (Bottom Left)

```css
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  left: var(--space-6);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 400px;
}

.toast {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: start;
  gap: var(--space-3);
  animation: slideInLeft 300ms ease;
}

.toast-success {
  border-left: 4px solid var(--success-500);
}

.toast-error {
  border-left: 4px solid var(--error-500);
}

.toast-warning {
  border-left: 4px solid var(--warning-500);
}

.toast-info {
  border-left: 4px solid var(--info-500);
}

.toast-icon {
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.25rem;
}

.toast-message {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

### Skeleton Loaders

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-300) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Skeleton Variants */
.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-title {
  height: 1.5rem;
  width: 60%;
  margin-bottom: 0.75rem;
}

.skeleton-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
}

.skeleton-card {
  height: 200px;
  border-radius: var(--radius-lg);
}
```

---

## Iconography

### Icon System: Lucide Icons
**Library:** [Lucide](https://lucide.dev/)  
**Style:** Outlined, minimal, consistent stroke width

**Installation:**
- **Web:** `npm install lucide-react`
- **Mobile:** `flutter pub add flutter_lucide`

### Icon Sizes
```css
--icon-xs: 12px;   /* Inline with small text */
--icon-sm: 16px;   /* Inline with normal text */
--icon-md: 20px;   /* Buttons, inputs */
--icon-lg: 24px;   /* Headers, feature icons */
--icon-xl: 32px;   /* Hero sections */
--icon-2xl: 48px;  /* Large feature displays */
```

### Icon Usage Guidelines
1. **Consistent size** - Use predefined sizes, not arbitrary
2. **Stroke width** - Keep default (usually 2px)
3. **Alignment** - Vertically center with text
4. **Spacing** - 4-8px gap between icon and text
5. **Color** - Match text color or use semantic colors

**Example:**
```html
<button class="btn-primary">
  <icon-check size="20" />
  Confirm Booking
</button>
```

---

## Animations & Transitions

### Transition Timing
```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
--transition-slower: 500ms;
```

### Easing Functions
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1); /* Material Design */
```

### Standard Transition
```css
transition: all var(--transition-base) var(--ease-smooth);
```

### Hover Effects
```css
/* Lift on Hover */
.card-hover {
  transition: transform var(--transition-base) ease, box-shadow var(--transition-base) ease;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

/* Scale on Hover */
.scale-hover {
  transition: transform var(--transition-fast) ease;
}
.scale-hover:hover {
  transform: scale(1.05);
}

/* Fade on Hover */
.fade-hover {
  transition: opacity var(--transition-base) ease;
}
.fade-hover:hover {
  opacity: 0.8;
}
```

### Loading Spinner
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--gray-200);
  border-top-color: var(--primary-400);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### Animation Rules
1. **Duration:** 200-300ms for most interactions (smooth but not slow)
2. **Easing:** Use `ease-smooth` for natural feel
3. **Accessibility:** Respect `prefers-reduced-motion`
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Responsive Design

### Mobile-First Approach
1. Design for mobile (320px) first
2. Progressively enhance for larger screens
3. Use `min-width` media queries, not `max-width`

### Breakpoint Strategy
```css
/* Mobile: Default (no media query) */
.element {
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .element {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .element {
    padding: 2rem;
    font-size: 1.25rem;
  }
}
```

### Responsive Images
```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### Touch Targets (Mobile)
**Minimum tap target:** 44x44px (iOS HIG), 48x48px (Material Design)

```css
.btn-mobile {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.5rem;
}
```

---

## Platform-Specific Guidelines

### Web (React)

#### Navbar (Desktop)
```
┌────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Home About Services▾ Brands▾ More▾  [Track Staus] [Book Now]  │
└────────────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Height: 80px
- Background: `white` with shadow
- Sticky on scroll
- Logo: 180px width max
- Nav links: `text-base`, `gray-700`, hover: `primary-600`
- CTA buttons: Ghost + Primary

---

#### Navbar (Mobile - Hamburger)
```
┌─────────────────────────────────────────────────┐
│  [Logo]                                   [☰]  │
└─────────────────────────────────────────────────┘

[Sliding Sheet Sidebar]
┌─────────────────────────────┐
│ Home                        │
│ About                       │
│ Services ▸                  │
│ Brands ▸                    │
│ ...                         │
│─────────────────────────────│
│ [Book Appointment Now]      │ ← Sticky Footer
│ [Track Booking Status]      │
└─────────────────────────────┘
```

**Specs:**
- Height: full (above main page, below the main navbar)
- Sidebar width: 80% screen width, max 320px
- Overlay: `rgba(0, 0, 0, 0.5)` with blur
- Slide animation: 300ms

---

#### Admin Sidebar
```
┌────────────────┐
│ [Logo]         │
│                │
│ Dashboard      │
│ Bookings       │
│ Customers      │
│ Technicians    │
│ Services       │
│ Inventory      │
│ Payroll        │
│ Reports        │
│ Audit Logs     │
│ Archive        │
│                │
│ ─────────────  │
│ [Profile Card] │ ← Sticky Footer (Profile, Settings, Log out)
└────────────────┘
```

**Specs:**
- Width: 280px (expanded), 80px (collapsed - icon only)
- Background: `white`
- Border: `1px solid gray-200`
- Nav item hover: `gray-50`
- Active item: `primary-50` bg, `primary-600` text
- Icons: `icon-md` (20px), `gray-500`, active: `primary-600`

---

### Mobile (Flutter - iOS HIG)

#### Bottom Tab Navigation
```
┌─────────────────────────────────┐
│                                 │
│          Content Area           │
│                                 │
│─────────────────────────────────│
│  🏠      📋      ⚙️      👤   │
│ Home  Bookings Settings Profile │
└─────────────────────────────────┘
```

**Specs:**
- Height: 50px + safe area
- Background: `white` with shadow
- Icons: 24px, `gray-600`, active: `primary-400`
- Labels: 12px, `gray-600`, active: `primary-600`
- Ripple effect on tap

---

#### Status Bar & Safe Area
```dart
SafeArea(
  top: true,
  bottom: true,
  child: Scaffold(
    // Your content
  ),
)
```

Always respect safe area insets (notch, home indicator)

---

## Accessibility Guidelines (Future WCAG 2.1 AA)

### Color Contrast
- **Normal text:** Minimum 4.5:1
- **Large text (18pt+):** Minimum 3:1
- **UI components:** Minimum 3:1

### Focus Indicators
```css
*:focus-visible {
  outline: 2px solid var(--primary-600);
  outline-offset: 2px;
}
```

### Keyboard Navigation
- All interactive elements reachable via Tab
- Logical tab order
- Escape key closes modals/dropdowns

### Screen Reader Support
- Semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels for icon-only buttons
- Alt text for images

---

## Design System Checklist

When implementing a new feature:
- [ ] Use design tokens (no hardcoded values)
- [ ] Follow spacing scale (4px base unit)
- [ ] Use correct typography scale
- [ ] Implement all states (hover, active, disabled, loading)
- [ ] Add skeleton loaders
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Implement all states (hover, active, disabled, loading)
- [ ] Add skeleton loaders
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Ensure sufficient color contrast
- [ ] Add keyboard navigation support
- [ ] Test with screen reader (future)

---

## Extended Components Library

### Dropdowns & Select Menus

#### Standard Select
```css
.select-wrapper {
  position: relative;
  width: 100%;
}

.select {
  font-family: var(--font-primary);
  font-size: 1rem;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  width: 100%;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition: all 200ms ease;
}

.select:hover {
  border-color: var(--gray-400);
}

.select:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.select:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}

.select.error {
  border-color: var(--error-500);
}
```

#### Custom Dropdown (Advanced)
```css
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  font-family: var(--font-primary);
  font-size: 1rem;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  transition: all 200ms ease;
}

.dropdown-trigger:hover {
  border-color: var(--gray-400);
}

.dropdown-trigger.active {
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 100%;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 50;
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  transition: all 200ms ease;
}

.dropdown-menu.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.dropdown-item {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 150ms ease;
}

.dropdown-item:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}

.dropdown-item.selected {
  background: var(--primary-50);
  color: var(--primary-600);
  font-weight: 500;
}

.dropdown-item:active {
  background: var(--primary-100);
}

.dropdown-divider {
  height: 1px;
  background: var(--gray-200);
  margin: 0.5rem 0;
}

.dropdown-header {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-500);
  padding: 0.5rem 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**Dropdown Rules:**
1. Close on outside click
2. Close on Escape key
3. Arrow keys navigate items
4. Enter selects item
5. Max height 300px, then scroll

---

### Checkboxes & Radio Buttons

#### Custom Checkbox
```css
.checkbox-wrapper {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  cursor: pointer;
}

.checkbox {
  /* Hide native checkbox */
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-custom {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-sm);
  background: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;
  flex-shrink: 0;
}

.checkbox:checked + .checkbox-custom {
  background: var(--primary-400);
  border-color: var(--primary-400);
}

.checkbox:checked + .checkbox-custom::after {
  content: '';
  width: 0.4rem;
  height: 0.7rem;
  border: solid var(--white);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox:focus + .checkbox-custom {
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.checkbox:disabled + .checkbox-custom {
  background: var(--gray-100);
  border-color: var(--gray-300);
  cursor: not-allowed;
}

.checkbox-label {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  line-height: 1.5;
}

.checkbox:disabled ~ .checkbox-label {
  color: var(--gray-400);
}
```

#### Custom Radio Button
```css
.radio-wrapper {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  cursor: pointer;
}

.radio {
  /* Hide native radio */
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-custom {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--gray-300);
  border-radius: 50%;
  background: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;
  flex-shrink: 0;
}

.radio:checked + .radio-custom {
  border-color: var(--primary-400);
}

.radio:checked + .radio-custom::after {
  content: '';
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--primary-400);
}

.radio:focus + .radio-custom {
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.radio:disabled + .radio-custom {
  background: var(--gray-100);
  border-color: var(--gray-300);
  cursor: not-allowed;
}

.radio-label {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  line-height: 1.5;
}

.radio:disabled ~ .radio-label {
  color: var(--gray-400);
}
```

---

### Toggle Switch

```css
.switch-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.switch {
  /* Hide native checkbox */
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-custom {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  background: var(--gray-300);
  border-radius: var(--radius-full);
  transition: all 200ms ease;
  flex-shrink: 0;
}

.switch-custom::after {
  content: '';
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  background: var(--white);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 200ms ease;
}

.switch:checked + .switch-custom {
  background: var(--primary-400);
}

.switch:checked + .switch-custom::after {
  transform: translateX(1.25rem);
}

.switch:focus + .switch-custom {
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.switch:disabled + .switch-custom {
  background: var(--gray-200);
  cursor: not-allowed;
  opacity: 0.6;
}

.switch-label {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
}

.switch:disabled ~ .switch-label {
  color: var(--gray-400);
}
```

---

### Tabs

```css
.tabs-wrapper {
  width: 100%;
}

.tabs-list {
  display: flex;
  border-bottom: 2px solid var(--gray-200);
  gap: 0;
}

.tab {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-600);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  position: relative;
  bottom: -2px;
  transition: all 200ms ease;
  white-space: nowrap;
}

.tab:hover {
  color: var(--gray-900);
  background: var(--gray-50);
}

.tab.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-400);
  font-weight: 600;
}

.tab:focus-visible {
  outline: 2px solid var(--primary-600);
  outline-offset: -2px;
}

.tab-content {
  padding: var(--space-6) 0;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
  animation: fadeIn 300ms ease;
}
```

**Tab Variants:**

#### Pills Tabs
```css
.tabs-list.pills {
  border-bottom: none;
  gap: 0.5rem;
  background: var(--gray-100);
  padding: 0.25rem;
  border-radius: var(--radius-md);
}

.tabs-list.pills .tab {
  border-bottom: none;
  border-radius: var(--radius-sm);
  bottom: 0;
}

.tabs-list.pills .tab.active {
  background: var(--white);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

---

### Accordion

```css
.accordion {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.accordion-item {
  border-bottom: 1px solid var(--gray-200);
}

.accordion-item:last-child {
  border-bottom: none;
}

.accordion-header {
  width: 100%;
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-900);
  background: var(--white);
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  text-align: left;
  transition: all 200ms ease;
}

.accordion-header:hover {
  background: var(--gray-50);
}

.accordion-header.active {
  background: var(--primary-50);
  color: var(--primary-600);
}

.accordion-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 200ms ease;
  flex-shrink: 0;
}

.accordion-header.active .accordion-icon {
  transform: rotate(180deg);
}

.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease;
}

.accordion-content.open {
  max-height: 1000px; /* Adjust based on content */
}

.accordion-body {
  padding: 1rem 1.5rem 1.5rem;
  font-size: 0.875rem;
  color: var(--gray-700);
  line-height: 1.6;
}
```

---

### Pagination

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0;
}

.pagination-button {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 200ms ease;
}

.pagination-button:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.pagination-button.active {
  background: var(--primary-400);
  border-color: var(--primary-400);
  color: var(--white);
  font-weight: 600;
}

.pagination-button:disabled {
  background: var(--gray-100);
  color: var(--gray-400);
  cursor: not-allowed;
  opacity: 0.5;
}

.pagination-ellipsis {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
}

.pagination-info {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-600);
  margin: 0 1rem;
}
```

---

### Data Tables

```css
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
}

.table thead {
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-200);
}

.table th {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-700);
  text-align: left;
  padding: 0.75rem 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  background: var(--gray-100);
}

.table th .sort-icon {
  display: inline-block;
  margin-left: 0.5rem;
  opacity: 0.4;
}

.table th.sorted .sort-icon {
  opacity: 1;
}

.table tbody tr {
  border-bottom: 1px solid var(--gray-200);
  transition: background 150ms ease;
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table tbody tr:hover {
  background: var(--gray-50);
}

.table tbody tr.selected {
  background: var(--primary-50);
}

.table td {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-900);
  padding: 1rem;
}

.table td.numeric {
  font-family: var(--font-technical);
  text-align: right;
}

.table td.actions {
  text-align: right;
  white-space: nowrap;
}

/* Responsive Table */
@media (max-width: 768px) {
  .table thead {
    display: none;
  }
  
  .table tbody tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
  }
  
  .table td {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .table td:last-child {
    border-bottom: none;
  }
  
  .table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--gray-600);
  }
}
```

---

### Search Bar

```css
.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  width: 100%;
  transition: all 200ms ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: none;
}

.search-input:not(:placeholder-shown) ~ .search-clear {
  display: block;
}

.search-clear:hover {
  background: var(--gray-100);
  color: var(--gray-600);
}
```

---

### File Upload

```css
.file-upload-wrapper {
  width: 100%;
}

.file-upload-dropzone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  padding: 2rem;
  text-align: center;
  background: var(--gray-50);
  cursor: pointer;
  transition: all 200ms ease;
}

.file-upload-dropzone:hover {
  border-color: var(--primary-400);
  background: var(--primary-50);
}

.file-upload-dropzone.dragover {
  border-color: var(--primary-400);
  background: var(--primary-100);
}

.file-upload-dropzone.error {
  border-color: var(--error-500);
  background: var(--error-50);
}

.file-upload-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  color: var(--gray-400);
}

.file-upload-text {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.file-upload-hint {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  color: var(--gray-500);
}

.file-upload-input {
  display: none;
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  margin-top: 1rem;
  background: var(--white);
}

.file-preview-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-sm);
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-600);
  flex-shrink: 0;
}

.file-preview-info {
  flex: 1;
  min-width: 0;
}

.file-preview-name {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-preview-size {
  font-family: var(--font-technical);
  font-size: 0.75rem;
  color: var(--gray-500);
}

.file-preview-remove {
  background: none;
  border: none;
  color: var(--error-500);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.file-preview-remove:hover {
  background: var(--error-50);
}

/* Upload Progress */
.file-upload-progress {
  margin-top: 1rem;
}

.file-upload-progress-bar {
  height: 0.5rem;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.file-upload-progress-fill {
  height: 100%;
  background: var(--primary-400);
  border-radius: var(--radius-full);
  transition: width 300ms ease;
}
```

---

### Date Picker (Basic Styling)

```css
.date-picker {
  font-family: var(--font-primary);
  font-size: 1rem;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  width: 100%;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition: all 200ms ease;
}

.date-picker:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
}
```

**Note:** Use a library like `react-datepicker` or `flatpickr` for full calendar functionality. Style the calendar dropdown to match the design system.

---

### Breadcrumbs

```css
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1rem 0;
}

.breadcrumb-item {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-600);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-link {
  color: var(--gray-600);
  text-decoration: none;
  transition: color 150ms ease;
}

.breadcrumb-link:hover {
  color: var(--primary-600);
}

.breadcrumb-link.active {
  color: var(--gray-900);
  font-weight: 500;
  pointer-events: none;
}

.breadcrumb-separator {
  color: var(--gray-400);
}
```

**HTML Example:**
```html
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <div class="breadcrumb-item">
    <a href="/" class="breadcrumb-link">Home</a>
    <span class="breadcrumb-separator">/</span>
  </div>
  <div class="breadcrumb-item">
    <a href="/bookings" class="breadcrumb-link">Bookings</a>
    <span class="breadcrumb-separator">/</span>
  </div>
  <div class="breadcrumb-item">
    <span class="breadcrumb-link active">KJAC-2026-ABC123</span>
  </div>
</nav>
```

---

### Progress Bars

#### Linear Progress
```css
.progress-bar {
  width: 100%;
  height: 0.75rem;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-400);
  border-radius: var(--radius-full);
  transition: width 300ms ease;
  position: relative;
  overflow: hidden;
}

/* Animated Progress (Loading) */
.progress-fill.indeterminate {
  width: 100%;
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--primary-400) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: progressSlide 1.5s infinite;
}

@keyframes progressSlide {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* With Label */
.progress-wrapper {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-text {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  font-weight: 500;
}

.progress-percentage {
  font-family: var(--font-technical);
  font-size: 0.875rem;
  color: var(--gray-600);
  font-weight: 500;
}
```

#### Circular Progress (Spinner)
```css
.spinner-circle {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary-400);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-circle.sm {
  width: 1rem;
  height: 1rem;
  border-width: 2px;
}

.spinner-circle.lg {
  width: 3rem;
  height: 3rem;
  border-width: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

### Alert Banners

```css
.alert {
  font-family: var(--font-primary);
  border-radius: var(--radius-lg);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.alert-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.125rem;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alert-message {
  font-size: 0.875rem;
  line-height: 1.5;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  opacity: 0.7;
}

.alert-close:hover {
  opacity: 1;
}

/* Alert Variants */
.alert-success {
  background: var(--success-50);
  border: 1px solid var(--success-200);
}

.alert-success .alert-icon,
.alert-success .alert-title {
  color: var(--success-700);
}

.alert-success .alert-message {
  color: var(--success-600);
}

.alert-error {
  background: var(--error-50);
  border: 1px solid var(--error-200);
}

.alert-error .alert-icon,
.alert-error .alert-title {
  color: var(--error-700);
}

.alert-error .alert-message {
  color: var(--error-600);
}

.alert-warning {
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
}

.alert-warning .alert-icon,
.alert-warning .alert-title {
  color: var(--warning-700);
}

.alert-warning .alert-message {
  color: var(--warning-600);
}

.alert-info {
  background: var(--info-50);
  border: 1px solid var(--info-200);
}

.alert-info .alert-icon,
.alert-info .alert-title {
  color: var(--info-700);
}

.alert-info .alert-message {
  color: var(--info-600);
}
```

---

### Empty States

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
  min-height: 300px;
}

.empty-state-icon {
  width: 4rem;
  height: 4rem;
  color: var(--gray-300);
  margin-bottom: 1rem;
}

.empty-state-title {
  font-family: var(--font-primary);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.5rem;
}

.empty-state-message {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-600);
  max-width: 400px;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.empty-state-action {
  /* Use btn-primary or btn-secondary */
}
```

---

### Avatar Component

```css
.avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  overflow: hidden;
  background: var(--gray-200);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-700);
  text-transform: uppercase;
}

/* Avatar Sizes */
.avatar-xs {
  width: 1.5rem;
  height: 1.5rem;
}

.avatar-xs .avatar-initials {
  font-size: 0.625rem;
}

.avatar-sm {
  width: 2rem;
  height: 2rem;
}

.avatar-sm .avatar-initials {
  font-size: 0.75rem;
}

.avatar-md {
  width: 2.5rem;
  height: 2.5rem;
}

.avatar-md .avatar-initials {
  font-size: 1rem;
}

.avatar-lg {
  width: 3rem;
  height: 3rem;
}

.avatar-lg .avatar-initials {
  font-size: 1.25rem;
}

.avatar-xl {
  width: 4rem;
  height: 4rem;
}

.avatar-xl .avatar-initials {
  font-size: 1.5rem;
}

/* Avatar with Status Badge */
.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 2px solid var(--white);
}

.avatar-status.online {
  background: var(--success-500);
}

.avatar-status.offline {
  background: var(--gray-400);
}

.avatar-status.busy {
  background: var(--error-500);
}
```

---

### Chip/Tag Component

```css
.chip {
  font-family: var(--font-primary);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  color: var(--gray-700);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.chip-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.chip-remove {
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  opacity: 0.7;
  transition: all 150ms ease;
}

.chip-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

/* Chip Variants */
.chip-primary {
  background: var(--primary-100);
  color: var(--primary-700);
}

.chip-success {
  background: var(--success-100);
  color: var(--success-700);
}

.chip-warning {
  background: var(--warning-100);
  color: var(--warning-700);
}

.chip-error {
  background: var(--error-100);
  color: var(--error-700);
}
```

---

### Tooltip

```css
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-900);
  color: var(--white);
  font-family: var(--font-primary);
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
  z-index: 100;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 0.25rem solid transparent;
  border-top-color: var(--gray-900);
}

.tooltip-wrapper:hover .tooltip,
.tooltip-wrapper:focus .tooltip {
  opacity: 1;
}

/* Tooltip Positions */
.tooltip.tooltip-top {
  bottom: calc(100% + 0.5rem);
  top: auto;
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.tooltip-bottom {
  top: calc(100% + 0.5rem);
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.tooltip-bottom::after {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: var(--gray-900);
}

.tooltip.tooltip-left {
  right: calc(100% + 0.5rem);
  left: auto;
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.tooltip-left::after {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-top-color: transparent;
  border-left-color: var(--gray-900);
}

.tooltip.tooltip-right {
  left: calc(100% + 0.5rem);
  right: auto;
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.tooltip-right::after {
  right: 100%;
  left: auto;
  top: 50%;
  transform: translateY(-50%);
  border-top-color: transparent;
  border-right-color: var(--gray-900);
}
```

---

### Popover Menu

```css
.popover {
  position: relative;
  display: inline-block;
}

.popover-content {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 50;
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  transition: all 200ms ease;
}

.popover-content.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.popover-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.popover-title {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-900);
}

.popover-body {
  padding: 0.5rem;
}

.popover-item {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-700);
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--radius-sm);
  transition: all 150ms ease;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
}

.popover-item:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}

.popover-item.danger {
  color: var(--error-600);
}

.popover-item.danger:hover {
  background: var(--error-50);
  color: var(--error-700);
}

.popover-divider {
  height: 1px;
  background: var(--gray-200);
  margin: 0.25rem 0;
}
```

---

### Stepper (Multi-Step Indicator)

```css
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 0;
  margin-bottom: 2rem;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.stepper-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 1.5rem;
  left: calc(50% + 1.5rem);
  width: calc(100% - 3rem);
  height: 2px;
  background: var(--gray-200);
  z-index: -1;
}

.stepper-step.completed:not(:last-child)::after {
  background: var(--primary-400);
}

.stepper-circle {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--gray-200);
  color: var(--gray-500);
  font-family: var(--font-primary);
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  transition: all 200ms ease;
  position: relative;
  z-index: 1;
}

.stepper-step.active .stepper-circle {
  background: var(--primary-400);
  color: var(--white);
  box-shadow: 0 0 0 4px rgba(56, 182, 255, 0.2);
}

.stepper-step.completed .stepper-circle {
  background: var(--primary-400);
  color: var(--white);
}

.stepper-label {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-600);
  text-align: center;
}

.stepper-step.active .stepper-label {
  color: var(--primary-600);
  font-weight: 600;
}

.stepper-step.completed .stepper-label {
  color: var(--gray-900);
  font-weight: 500;
}

/* Responsive Stepper */
@media (max-width: 768px) {
  .stepper {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stepper-step {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 1rem;
  }
  
  .stepper-step:not(:last-child)::after {
    top: calc(50% + 2rem);
    left: 1.5rem;
    width: 2px;
    height: calc(100% - 1rem);
  }
  
  .stepper-circle {
    margin-bottom: 0;
  }
  
  .stepper-label {
    text-align: left;
  }
}
```

---

## Advanced Design Rules

### Shadow System (Elevation Scale)

```css
/* Shadow Tokens */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);
```

**Usage Guidelines:**
- **xs** - Subtle borders, dividers
- **sm** - Cards at rest, inputs
- **md** - Dropdowns, popovers, cards on hover
- **lg** - Modals, dialogs
- **xl** - Large modals, overlays
- **2xl** - Hero sections with depth
- **inner** - Pressed/inset elements

**Example:**
```css
.card {
  box-shadow: var(--shadow-sm);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.modal {
  box-shadow: var(--shadow-xl);
}
```

---

### Z-Index Scale (Layering Hierarchy)

```css
/* Z-Index Tokens */
--z-base: 0;
--z-dropdown: 10;
--z-sticky: 20;
--z-fixed: 30;
--z-modal-backdrop: 40;
--z-modal: 50;
--z-popover: 60;
--z-tooltip: 70;
--z-notification: 80;
--z-top: 100;
```

**Layer Hierarchy (Bottom to Top):**
1. **base (0)** - Normal document flow
2. **dropdown (10)** - Dropdown menus, select options
3. **sticky (20)** - Sticky headers, floating action buttons
4. **fixed (30)** - Fixed navbars, sidebars
5. **modal-backdrop (40)** - Modal overlays
6. **modal (50)** - Modal dialogs
7. **popover (60)** - Context menus, popovers
8. **tooltip (70)** - Tooltips
9. **notification (80)** - Toast notifications, alerts
10. **top (100)** - Dev tools, emergency notices

**Rules:**
- Never use arbitrary z-index values
- Always use tokens from the scale
- Document why if you deviate

---

### Image Guidelines

#### Aspect Ratios
```css
/* Standard Aspect Ratios */
.aspect-square { aspect-ratio: 1 / 1; }    /* 1:1 - Avatars, thumbnails */
.aspect-video { aspect-ratio: 16 / 9; }    /* 16:9 - Hero images */
.aspect-portrait { aspect-ratio: 3 / 4; }  /* 3:4 - Profile photos */
.aspect-landscape { aspect-ratio: 4 / 3; } /* 4:3 - Product images */
.aspect-wide { aspect-ratio: 21 / 9; }     /* 21:9 - Banners */
```

#### Responsive Images
```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}

.img-cover {
  object-fit: cover;
  width: 100%;
  height: 100%;
}

.img-contain {
  object-fit: contain;
  width: 100%;
  height: 100%;
}
```

#### Image Placeholder (Loading)
```css
.img-placeholder {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-300) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

#### Lazy Loading
```html
<img 
  src="placeholder.jpg" 
  data-src="actual-image.jpg"
  loading="lazy"
  alt="Description"
/>
```

**Rules:**
1. Always include `alt` text
2. Use lazy loading for images below fold
3. Serve appropriate sizes for different viewports
4. Use modern formats (WebP, AVIF) with fallbacks
5. Show placeholder while loading

---

### Form Validation Patterns

#### Real-Time Validation (As User Types)
**When to Use:**
- Password strength meter
- Username availability check
- Character count/limit

**Implementation:**
```css
.input.validating {
  border-color: var(--gray-400);
}

.input.validating ~ .input-feedback {
  color: var(--gray-500);
}

.input.valid {
  border-color: var(--success-500);
}

.input.valid ~ .input-feedback {
  color: var(--success-600);
}

.input.invalid {
  border-color: var(--error-500);
}

.input.invalid ~ .input-feedback {
  color: var(--error-600);
}
```

#### On-Blur Validation (After User Leaves Field)
**When to Use:**
- Email format validation
- Required fields
- Most standard validations

#### On-Submit Validation (When Form Submitted)
**When to Use:**
- Cross-field validation
- Server-side validation
- Final check before submission

**Error Grouping:**
```css
.form-errors {
  background: var(--error-50);
  border: 1px solid var(--error-200);
  border-radius: var(--radius-lg);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.form-errors-title {
  font-weight: 600;
  color: var(--error-700);
  margin-bottom: 0.5rem;
}

.form-errors-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.form-errors-list li {
  font-size: 0.875rem;
  color: var(--error-600);
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

---

### Booking Status Colors

**Specific colors for each booking status in the KJAC system:**

```css
/* Booking Status Badges */
.status-pending {
  background: var(--warning-50);
  color: var(--warning-700);
}

.status-confirmed {
  background: var(--info-50);
  color: var(--info-700);
}

.status-assigned {
  background: var(--primary-50);
  color: var(--primary-700);
}

.status-in-progress {
  background: #EDE9FE; /* Purple-50 */
  color: #6D28D9; /* Purple-700 */
}

.status-completed {
  background: var(--success-50);
  color: var(--success-700);
}

.status-cancelled {
  background: var(--error-50);
  color: var(--error-700);
}

.status-expired {
  background: var(--gray-100);
  color: var(--gray-700);
}
```

**Status Color Reference:**
- **Pending** (No payment) → Warning (Amber)
- **Confirmed** (Payment uploaded) → Info (Blue)
- **Assigned** (Technician assigned) → Primary (Klein Blue)
- **In Progress** (Service ongoing) → Purple
- **Completed** (Service done) → Success (Green)
- **Cancelled** (Booking cancelled) → Error (Red)
- **Expired** (Past date, no payment) → Gray

---

### Data Visualization (Charts & Graphs)

**Chart Color Palette:**
```css
/* Data Visualization Colors */
--chart-1: #38b6ff;  /* Primary blue */
--chart-2: #6EC6FF;  /* Light blue */
--chart-3: #1E90DA;  /* Medium blue */
--chart-4: #00D4FF;  /* Cyan */
--chart-5: #004C99;  /* Dark blue */
--chart-6: #22C55E;  /* Green */
--chart-7: #F59E0B;  /* Amber */
--chart-8: #EF4444;  /* Red */
```

**Usage:**
- Use `chart-1` through `chart-5` for primary data series
- Use `chart-6` for positive metrics (growth, success rate)
- Use `chart-7` for neutral/warning metrics
- Use `chart-8` for negative metrics (declines, errors)

**Grid & Axis:**
```css
--chart-grid: var(--gray-200);
--chart-axis: var(--gray-400);
--chart-label: var(--gray-600);
```

---

### Print Styles

```css
@media print {
  /* Hide non-essential elements */
  nav, .sidebar, .btn, .modal, .toast, footer {
    display: none !important;
  }
  
  /* Optimize for print */
  body {
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }
  
  /* Expand containers */
  .container {
    max-width: 100%;
    padding: 0;
  }
  
  /* Avoid page breaks inside elements */
  .card, .table, .section {
    page-break-inside: avoid;
  }
  
  /* Show link URLs */
  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
  
  /* Optimize tables */
  table {
    border-collapse: collapse;
    width: 100%;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  
  /* Headers and footers */
  @page {
    margin: 2cm;
  }
  
  /* Remove shadows and borders */
  .card, .modal, .dropdown {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
  }
}
```

---

### Error Pages Design

#### 404 Page
```html
<div class="error-page">
  <div class="error-code">404</div>
  <h1 class="error-title">Page Not Found</h1>
  <p class="error-message">
    The page you're looking for doesn't exist or has been moved.
  </p>
  <div class="error-actions">
    <a href="/" class="btn-primary">Go Home</a>
    <a href="/contact" class="btn-secondary">Contact Support</a>
  </div>
</div>
```

```css
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 100vh;
  padding: 2rem;
}

.error-code {
  font-family: var(--font-technical);
  font-size: clamp(4rem, 15vw, 10rem);
  font-weight: 700;
  color: var(--gray-200);
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-family: var(--font-primary);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 1rem;
}

.error-message {
  font-family: var(--font-primary);
  font-size: 1rem;
  color: var(--gray-600);
  max-width: 500px;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}
```

#### 500 Page (Same structure, different messaging)
```
Error Code: 500
Title: "Something Went Wrong"
Message: "We're experiencing technical difficulties. Please try again later."
```

#### Maintenance Page
```
Title: "We'll Be Back Soon"
Message: "We're performing scheduled maintenance. Thank you for your patience."
```

---

### Microcopy Guidelines

#### Button Labels
**Do's:**
- "Save Changes" (specific action)
- "Delete Booking" (clear consequence)
- "Send Message" (clear action)

**Don'ts:**
- "Submit" (too generic)
- "OK" (unclear action)
- "Click Here" (not descriptive)

#### Error Messages
**Do's:**
- "Email address is required"
- "Password must be at least 8 characters"
- "This booking reference doesn't exist"

**Don'ts:**
- "Invalid input" (too vague)
- "Error 422" (technical jargon)
- "You can't do that" (not helpful)

#### Empty States
**Do's:**
- "No bookings yet. Create your first appointment!"
- "You haven't received any messages."
- "Search returned no results. Try different keywords."

**Don'ts:**
- "No data"
- "Empty"
- "Nothing here"

#### Loading States
**Do's:**
- "Loading bookings..."
- "Uploading payment..."
- "Saving changes..."

**Don'ts:**
- "Please wait"
- "Processing"
- "Loading..."

---

### Icon-Text Pairing Rules

#### When to Show Icons WITH Text
- Navigation menu items (desktop)
- Primary action buttons
- Feature cards
- Empty states
- Error messages

#### When to Show Icons WITHOUT Text
- Icon buttons in toolbars (with tooltip)
- Social media links (recognizable icons)
- Status indicators (with color coding)
- Mobile navigation (with labels below)
- Close buttons (X icon universally understood)

#### Icon Position
- **Left of text** - Default for buttons and links
- **Right of text** - Dropdowns, external links, next actions
- **Above text** - Mobile bottom navigation, feature cards
- **Standalone** - Icon buttons with tooltips

**Example:**
```html
<!-- Icon with text -->
<button class="btn-primary">
  <icon-check size="20" />
  Confirm Booking
</button>

<!-- Icon only (with tooltip) -->
<button class="btn-icon" title="Edit">
  <icon-edit size="20" />
</button>
```

---

## Interaction Patterns

### Drag and Drop

```css
.draggable {
  cursor: grab;
  transition: all 200ms ease;
}

.draggable.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.drop-zone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  padding: 2rem;
  transition: all 200ms ease;
}

.drop-zone.drag-over {
  border-color: var(--primary-400);
  background: var(--primary-50);
}

.drop-zone.drop-valid {
  border-color: var(--success-500);
  background: var(--success-50);
}

.drop-zone.drop-invalid {
  border-color: var(--error-500);
  background: var(--error-50);
}
```

---

### Infinite Scroll

```css
.infinite-scroll-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.infinite-scroll-end {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  color: var(--gray-500);
  text-align: center;
  padding: 2rem;
}
```

**Implementation Notes:**
1. Show loader when fetching next page
2. Show "No more results" when end reached
3. Trigger fetch when user scrolls to 80% of content
4. Debounce scroll events (300ms)

---

### Pull to Refresh (Mobile)

```css
.pull-to-refresh {
  position: relative;
  overflow-y: auto;
}

.pull-to-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 300ms ease;
}

.pull-to-refresh.pulling .pull-to-refresh-indicator {
  top: 10px;
}

.pull-to-refresh.refreshing .pull-to-refresh-indicator {
  top: 10px;
}
```

**Flutter Implementation:**
```dart
RefreshIndicator(
  onRefresh: () async {
    // Refresh logic
  },
  color: Color(0xFF38B6FF), // primary-400
  child: ListView(...),
)
```

---

### Swipe Actions (Mobile List Items)

```css
.swipeable-item {
  position: relative;
  overflow: hidden;
}

.swipe-actions-left,
.swipe-actions-right {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.swipe-actions-left {
  left: 0;
  padding-left: 1rem;
  background: var(--primary-400);
}

.swipe-actions-right {
  right: 0;
  padding-right: 1rem;
  background: var(--error-500);
}

.swipe-action-btn {
  color: var(--white);
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
}
```

**Common Patterns:**
- **Swipe right** → Archive, Complete, Accept
- **Swipe left** → Delete, Reject, Cancel

---

### Confirmation Patterns

#### When to Show Confirmation Dialog
✅ **Always confirm:**
- Permanent deletions
- Cancelling bookings with payments
- Removing users/technicians
- Irreversible actions

❌ **Don't confirm:**
- Saving changes (expected action)
- Adding items (reversible)
- Opening modals
- Navigation

#### Confirmation Dialog
```html
<div class="modal-overlay">
  <div class="modal confirmation-modal">
    <div class="modal-header">
      <icon-alert-triangle size="24" color="var(--warning-500)" />
      <h3 class="modal-title">Confirm Deletion</h3>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete this booking? This action cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-danger">Delete</button>
    </div>
  </div>
</div>
```

---

### Undo/Redo Pattern

```css
.toast.with-undo {
  justify-content: space-between;
}

.toast-undo-btn {
  font-family: var(--font-primary);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-600);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 150ms ease;
}

.toast-undo-btn:hover {
  background: var(--primary-50);
}
```

**Example:**
```html
<div class="toast toast-success with-undo">
  <div class="toast-content">
    <p class="toast-message">Booking deleted successfully</p>
  </div>
  <button class="toast-undo-btn">Undo</button>
</div>
```

**When to Use:**
- Deletions (soft delete with 30-day archive)
- Bulk actions
- Accidental dismissals
- Status changes

---

## Design System Implementation Checklist

When implementing ANY new feature or component:

### Planning Phase
- [ ] Review existing components (reuse before creating)
- [ ] Check design tokens (colors, spacing, typography)
- [ ] Identify required states (default, hover, active, disabled, loading, error)
- [ ] Plan responsive behavior (mobile, tablet, desktop)

### Implementation Phase
- [ ] Use design tokens (no hardcoded values)
- [ ] Follow spacing scale (4px base unit)
- [ ] Use correct typography scale (Manrope for UI, JetBrains Mono for technical)
- [ ] Implement all interaction states
- [ ] Add transitions/animations (200-300ms)
- [ ] Use correct shadow elevation
- [ ] Apply proper z-index layer
- [ ] Add loading/skeleton states

### Accessibility Phase
- [ ] Ensure sufficient color contrast (4.5:1 minimum)
- [ ] Add keyboard navigation support (Tab, Enter, Escape)
- [ ] Include focus indicators
- [ ] Add ARIA labels where needed
- [ ] Test with screen reader (future)
- [ ] Respect `prefers-reduced-motion`

### Responsive Phase
- [ ] Test on mobile (320px - 767px)
- [ ] Test on tablet (768px - 1023px)
- [ ] Test on desktop (1024px+)
- [ ] Ensure touch targets are 44x44px minimum (mobile)
- [ ] Test landscape orientation (mobile)

### Quality Assurance Phase
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Performance check (no layout shifts, smooth animations)
- [ ] Review for consistency with design system
- [ ] Check for edge cases (very long text, no data, errors)
- [ ] Validate HTML/CSS

---

**Document Status:** Complete and Comprehensive ✅  
**Maintained By:** Design & Frontend Team  
**Next Review:** When design updates are proposed  
**Last Major Update:** September 10, 2026

---

*This comprehensive design system ensures consistency, accessibility, and premium quality across all KJAC platforms. All components, patterns, and rules have been documented to support seamless frontend development.*