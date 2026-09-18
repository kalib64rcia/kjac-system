# Address Section Layout Refactoring

## Overview
Separated geographical address components into a hierarchical, organized layout using the new `AreaSection` component.

## Before (Single-Line Compilation)
```
┌─────────────────────────────────────────────┐
│ Address                                     │
├─────────────────────────────────────────────┤
│ Area      Anon Region, Province, City, ...  │
│ Landmark  Church                            │
└─────────────────────────────────────────────┘
```

## After (Hierarchical Sections)
```
┌─────────────────────────────────────────────┐
│ Address                                     │
├─────────────────────────────────────────────┤
│ Street address                              │
│ House #123, Main Street                     │
├─────────────────────────────────────────────┤
│ [Area Sub-Section]                          │
│ • Region:   Calabarzo                       │
│ • Province: Laguna                          │
│ • City:     Pinagsanjan                     │
│ • Barangay: Anon Anonuevo                   │
├─────────────────────────────────────────────┤
│ Landmark                                    │
│ Church                                      │
└─────────────────────────────────────────────┘
```

## Changes Made

### 1. New Component: `AreaSection.tsx`
- Location: `frontend/src/components/office/AreaSection.tsx`
- Purpose: Renders geographical address levels (Region → Province → City → Barangay) as separate rows
- Features:
  - Grouped in a styled container with gray background (`bg-gray-50`)
  - Rounded borders matching design system
  - Conditional rendering (only shows when address_parts exist)
  - Accessible with `aria-label="Service area"`
  - Each level displayed as a separate `DetailRow` for clarity

### 2. Updated: `BookingDetailSheet.tsx`
- Added import: `import { AreaSection } from "@/components/office/AreaSection";`
- Replaced 20 lines of individual address_parts conditionals with single `<AreaSection addressParts={booking.address_parts} />` component
- Maintains backward compatibility with fallback to `address_text` display when `address_parts` is unavailable

## Benefits
✅ **Improved Readability**: Each geographical level is clearly separated  
✅ **Better UX**: Users can quickly identify and scan address components  
✅ **Maintainability**: Centralized address display logic in dedicated component  
✅ **Design Consistency**: Uses existing `DetailRow` and design system components  
✅ **Accessibility**: Proper semantic markup with `role="region"` and `aria-label`  
✅ **Fallback Support**: Still displays compiled `address_text` when structured data unavailable

## Testing Checklist
- [x] TypeScript build passes (no errors)
- [x] Component imports correctly
- [x] Dev server starts successfully
- [ ] Visual inspection in browser (manual)
- [ ] Verify with actual booking data
- [ ] Test fallback display (when address_parts is null)

## CSS Classes Used
- `rounded-lg` - Rounded corners matching system
- `border border-gray-100` - Light border for visual separation
- `bg-gray-50` - Subtle background to group area components
- `p-4` - Padding for content spacing
- `space-y-2` - Vertical spacing between detail rows
