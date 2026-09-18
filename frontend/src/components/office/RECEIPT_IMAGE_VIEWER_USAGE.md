# ReceiptImageViewer Component

A production-ready React component for displaying payment receipts in a full-screen image viewer format.

## Features

- **Full-screen overlay** with dark background (bg-black/95)
- **Fixed header** (height 64px) with "Proof of Payment" title, reference ID, and GCash reference
- **Icon buttons** for Download, Print/Share, and Close (using lucide-react)
- **Responsive content area** that fills remaining viewport height
- **Image handling** with 9:16 portrait aspect ratio, scaled to fit viewport
- **Loading state** with spinner and message
- **Error state** with retry option
- **Non-previewable file handling** with download fallback
- **Multiple close methods**: X button, Escape key, or backdrop click
- **Receipt caching** shared with ReceiptModal (up to 30 cached receipts)
- **Accessibility features**: ARIA labels, keyboard navigation, semantic HTML

## Usage

```tsx
import { useState } from "react";
import { ReceiptImageViewer } from "@/components/office/ReceiptImageViewer";

export function PaymentSection() {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setViewerOpen(true)}>
        View Receipt
      </button>

      <ReceiptImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        paymentUuid="uuid-of-payment"
        referenceId="BOOKING-REF-123"
        gcashRefId="GCASH-REF-456"
      />
    </>
  );
}
```

## Props

```typescript
interface ReceiptImageViewerProps {
  /** Whether the viewer is open */
  open: boolean;
  
  /** Callback when viewer should close */
  onClose: () => void;
  
  /** UUID of the payment record (used to fetch receipt from API) */
  paymentUuid: string;
  
  /** Booking reference ID for display and download filename */
  referenceId: string;
  
  /** Optional GCash reference ID for display in header */
  gcashRefId?: string | null;
}
```

## Close Behaviors

The viewer closes when:
1. **X button** is clicked in the top-right corner
2. **Escape key** is pressed (keyboard navigation)
3. **Dark background** is clicked (backdrop click)

## States

### Loading
- Displays a spinner with "Loading receipt…" message
- Download and Print buttons are disabled

### Error
- Shows an error message with retry option
- User can click "Try again" to attempt loading again

### Success
- Image is displayed centered with aspect ratio maintained
- Image scales to fill available space without distortion
- Download and Print buttons are enabled

### Non-previewable
- File type cannot be previewed in browser (e.g., HEIC images, PDFs)
- Shows message with "Download file" button
- User must download to view

## Icon Button Actions

### Download
- **Action**: Downloads receipt with filename `receipt-{referenceId}`
- **Disabled when**: URL not loaded or still loading
- **Works with**: All file types

### Print/Share
- **Action**: Opens receipt in new window and triggers print dialog
- **Disabled when**: URL not loaded, still loading, or file is non-previewable
- **Works with**: Only previewable image formats

### Close
- **Action**: Closes the viewer
- **Never disabled**

## Caching

Receipts are cached in memory to avoid redundant downloads:
- **Cache size**: Up to 30 receipts
- **Eviction**: Oldest receipt is removed when cache is full
- **Cleanup**: Object URLs are revoked when entries are evicted or session ends
- **Shared**: Cache is shared between ReceiptImageViewer and ReceiptModal

## Styling

The component uses Tailwind CSS with:
- Dark background (`bg-black/95`)
- Gray accent colors for disabled states
- Primary color for action buttons
- Responsive padding and sizing (`px-4 sm:px-6`)

## Accessibility

- **Semantic HTML**: Uses `<dialog>` role with `aria-modal="true"`
- **Keyboard support**: Escape key closes viewer
- **ARIA labels**: All buttons have descriptive labels
- **Loading state**: Uses `aria-busy="true"` for loading indicators
- **Error state**: Uses `role="alert"` for error messages
- **Alt text**: Image alt text includes booking reference
- **Focus management**: Backdrop click only closes if clicking outside content
- **Scroll lock**: Body overflow is hidden when viewer is open

## Integration

### With BookingDetailSheet
Existing `ReceiptViewer` component uses the shared `ReceiptModal`. To integrate full-screen viewing:

```tsx
// In BookingDetailSheet.tsx
import { ReceiptImageViewer } from "@/components/office/ReceiptImageViewer";

export function ReceiptViewer({ paymentUuid, referenceId, gcashRefId }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <button onClick={() => setFullscreen(true)}>
        View receipt fullscreen
      </button>
      <ReceiptImageViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        paymentUuid={paymentUuid}
        referenceId={referenceId}
        gcashRefId={gcashRefId}
      />
    </>
  );
}
```

## Dependencies

- `react` - Core React hooks (useState, useEffect, useCallback)
- `lucide-react` - Icons (Download, Share2, X)
- `@/api/booking.api` - API client for `receiptBlob()` method
- `tailwindcss` - Styling

## Notes

- Component returns `null` when `open` is false (minimal DOM footprint)
- Body overflow is managed to prevent scroll while viewer is open
- Receipt fetch errors are handled gracefully with retry option
- HEIC images are automatically marked as non-previewable
- Component supports both portrait and landscape images, maintains aspect ratio
