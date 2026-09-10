# FLOW_INVENTORY.md

**Klein & Justin Airconditioning - Inventory Management Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Inventory Dashboard](#inventory-dashboard)
3. [Add New Item](#add-new-item)
4. [Update Stock](#update-stock)
5. [QR/Barcode Scanning](#qrbarcode-scanning)
6. [Stock Movements](#stock-movements)
7. [Low Stock Alerts](#low-stock-alerts)
8. [Usage Tracking](#usage-tracking)
9. [Inventory Reports](#inventory-reports)
10. [Stock Audit](#stock-audit)

---

## Overview

### Purpose
This document defines the inventory management workflows for the KJAC system, covering stock tracking, QR/barcode scanning, usage monitoring, and automated alerts.

### Key Features
- **Real-time stock tracking** - Current quantities and locations
- **QR/Barcode scanning** - Fast item identification and updates
- **Usage tracking** - Monitor parts used per job
- **Low stock alerts** - Automated notifications when restocking needed
- **Audit trail** - Complete history of all stock movements
- **Reports** - Stock levels, usage, valuations

### Access Control
- **Admin only** - Full inventory management access
- **Technicians** - View-only access (future: usage reporting)

---

## Inventory Dashboard

### Main Inventory Page

**Route:** `/admin/inventory`

**Page Layout:**

**Header Actions:**
- Search bar (by name, SKU, category)
- Filter dropdown:
  - Category (All, Parts, Tools, Consumables)
  - Stock status (All, In Stock, Low Stock, Out of Stock)
  - Supplier
  - Location
- Sort: Name (A-Z), Stock (low to high), Value (high to low)
- Add Item button (primary blue)
- Scan Item button (camera icon) - Opens QR/Barcode scanner
- Import/Export buttons (CSV/Excel)

**Summary Cards (Top):**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 150          │  │ 12           │  │ ₱125,000     │  │ 8            │
│ Total Items  │  │ Low Stock    │  │ Total Value  │  │ Out of Stock │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Inventory Table:**

Columns:
1. Image (thumbnail)
2. SKU / Barcode
3. Item Name
4. Category
5. Current Stock (with unit)
6. Min Stock (threshold)
7. Unit Price
8. Total Value
9. Location
10. Last Updated
11. Status Badge (In Stock / Low / Out)
12. Actions (View, Edit, Scan, Delete)

**Table Features:**
- Color-coded rows:
  - Green: Stock > 150% of threshold
  - Yellow: Stock at threshold or below
  - Red: Out of stock
- Clickable rows → Item details
- Bulk actions (when rows selected):
  - Export selected
  - Update stock (bulk)
  - Delete selected

**Empty State:**
- "No inventory items yet"
- [Add First Item] button

---

## Add New Item

### Create Inventory Item

**Trigger:** Click "Add Item" button

**Flow:**

```
1. Admin clicks "Add Item"
   ↓
2. Add item modal opens
   ↓
3. Form displays:
   
   **Basic Information:**
   
   - Item name * (text input)
     - Placeholder: "e.g., R410A Refrigerant"
   
   - Category * (dropdown)
     - Parts (Refrigerants, Compressors, Filters, etc.)
     - Tools (Screwdrivers, Wrenches, Gauges, etc.)
     - Consumables (Tapes, Wires, Screws, etc.)
     - Other
   
   - Sub-category (dropdown, loads based on category)
   
   - Brand (text input, optional)
     - Placeholder: "e.g., Daikin, Carrier"
   
   - Model/Part number (text input, optional)
   
   - Description (textarea, optional)
     - Technical specs, usage notes
   
   **Identification:**
   
   - SKU * (text input, auto-generated option)
     - Format: KJAC-XXXX-XXXX
     - [Auto-generate SKU] button
   
   - Barcode/QR code (text input, optional)
     - Can be scanned using [Scan] button
   
   - Item photo (upload, optional)
     - Drag & drop or browse
     - Max 3MB, JPG/PNG/WebP
   
   **Stock Information:**
   
   - Initial quantity * (number input)
     - Default: 0
   
   - Unit of measure * (dropdown)
     - Pieces (pcs)
     - Kilograms (kg)
     - Liters (L)
     - Meters (m)
     - Sets
     - Boxes
   
   - Minimum stock level * (number input)
     - Threshold for low stock alerts
     - Recommended: 5-10 units
   
   - Maximum stock level (optional)
     - Upper limit for reorder
   
   **Pricing:**
   
   - Unit cost price * (currency input)
     - Cost per unit from supplier
   
   - Selling price (optional)
     - If items are sold separately
   
   - Currency: PHP (₱)
   
   **Supplier Information:**
   
   - Supplier name (text input, optional)
   
   - Supplier contact (text input, optional)
   
   - Lead time (number + dropdown: Days/Weeks)
     - Time to restock
   
   **Storage:**
   
   - Storage location * (dropdown)
     - Main warehouse
     - Service vehicle 1
     - Service vehicle 2
     - Office storage
     - Custom location (text input)
   
   - Shelf/Bin number (text input, optional)
   
   **Additional Settings:**
   
   - Track serial numbers (checkbox)
     - For individual item tracking
   
   - Expiration date (date picker, optional)
     - For items with shelf life
   
   - Notes (textarea, optional)
     - Internal notes
   
   **Action Buttons:**
   - Cancel
   - Save & Add Another
   - Save Item (primary blue)
   ↓
4. Admin fills form
   ↓
5. Admin clicks "Save Item"
   ↓
6. Client-side validation:
   - All required fields filled
   - Quantity >= 0
   - Min stock level > 0
   - Unit price > 0
   ↓
   ├─ Validation fails
   │  └─> Show field errors
   │      Focus first invalid field
   │      → Return to step 4
   │
   └─ Validation passes
      ↓
7. Submit to API: POST /api/admin/inventory
   - Show loading overlay
   ↓
8. Server creates inventory item:
   - Generate item ID
   - Upload photo (if provided)
   - Generate QR code (if barcode not provided)
   - Create initial stock record
   - Set initial stock value (quantity × cost)
   - Create audit log entry:
     "Item created: [Name] with initial stock: [Qty]"
   ↓
9. API responds with item details
   ↓
10. Close modal
    ↓
11. Show success toast:
    "Item added successfully! ✓"
    ↓
12. Add item to inventory table
    ↓
13. If quantity < min stock level:
    └─> Trigger low stock alert immediately
    → END
```

**Auto-generate SKU Format:**

```
KJAC-[Category Code]-[Sequential Number]

Examples:
KJAC-PART-0001  (Parts)
KJAC-TOOL-0001  (Tools)
KJAC-CONS-0001  (Consumables)

Sequential number resets per category
```

---

## Update Stock

### Adjust Stock Levels

**Trigger:** Click "Update Stock" on item row OR click item to view details

**Flow:**

```
1. Admin clicks "Update Stock" button
   ↓
2. Stock update modal opens
   ↓
3. Modal displays:
   
   **Item Information (Read-only):**
   - [Item Photo]
   - Item name: R410A Refrigerant
   - SKU: KJAC-PART-0001
   - Current stock: 15 kg
   
   **Stock Adjustment:**
   
   - Adjustment type * (radio buttons):
     ○ Add stock (purchase/restock)
     ○ Remove stock (used/damaged/sold)
     ○ Set stock (manual correction)
   
   - Quantity * (number input)
     - If "Add": Positive number
     - If "Remove": Positive number (will subtract)
     - If "Set": New total quantity
   
   - Unit: kg (read-only, from item)
   
   **Transaction Details:**
   
   - Reason * (dropdown):
     
     If "Add stock":
     - Purchase/Restock
     - Return from job
     - Found inventory
     - Transfer from other location
     - Other (requires note)
     
     If "Remove stock":
     - Used in service (select booking)
     - Damaged/Expired
     - Lost/Stolen
     - Transfer to other location
     - Sold separately
     - Other (requires note)
     
     If "Set stock":
     - Inventory count correction
     - System error correction
     - Other (requires note)
   
   - Related booking (dropdown, if "Used in service")
     - Search by reference ID
     - Shows: #KJ-2026-001234 - Juan Dela Cruz
   
   - Date/Time * (datetime picker)
     - Defaults to now
     - Can backdate adjustments
   
   - Location (dropdown)
     - Current: Main warehouse
     - Update to: [Select new location if moving]
   
   - Cost per unit (currency, if adding stock)
     - Update if price changed
     - Default: Current unit cost
   
   - Reference document (text input, optional)
     - Invoice #, PO #, etc.
   
   - Notes * (textarea, required)
     - Explain the adjustment
     - Min 10 characters
   
   **Preview:**
   ```
   Current stock: 15 kg
   Adjustment: -5 kg
   New stock: 10 kg
   
   Status: Low Stock ⚠️ (threshold: 10 kg)
   ```
   
   **Action Buttons:**
   - Cancel
   - Update Stock (primary blue)
   ↓
4. Admin fills adjustment details
   ↓
5. Admin clicks "Update Stock"
   ↓
6. Confirmation modal (if setting stock below threshold):
   "Stock will be below minimum level"
   - "New stock: 10 kg"
   - "Minimum: 10 kg"
   - "Low stock alert will be triggered"
   - Cancel / Confirm buttons
   ↓
7. Admin confirms
   ↓
8. Submit to API: POST /api/admin/inventory/{item_id}/adjust-stock
   - adjustment_type: "remove"
   - quantity: 5
   - reason: "used_in_service"
   - booking_id: uuid (if applicable)
   - notes: "Used for Aircon Repair job"
   - Show loading overlay
   ↓
9. Server processes adjustment:
   - Calculate new quantity:
     - Add: current + quantity
     - Remove: current - quantity
     - Set: quantity
   - Update item quantity
   - Create stock movement record:
     - item_id, type, quantity, reason, notes
     - performed_by (admin ID)
     - timestamp, related_booking
   - Update total value (if cost changed)
   - Create audit log entry:
     "Stock adjusted: R410A Refrigerant 15kg → 10kg
      Reason: Used in service (Booking #KJ-2026-001234)"
   - If new quantity <= min stock level:
     └─> Trigger low stock alert
   - If quantity changed from 0 to > 0:
     └─> Clear "out of stock" alert
   ↓
10. API responds with updated item
    ↓
11. Close modal
    ↓
12. Show success toast:
    "Stock updated! ✓"
    - If low stock: "Low stock alert sent to admin"
    ↓
13. Update inventory table:
    - New quantity
    - New status badge (if changed)
    - "Last updated" timestamp
    → END
```

**Bulk Stock Update:**

```
1. Admin selects multiple items (checkboxes)
   ↓
2. Admin clicks "Bulk Update Stock"
   ↓
3. Bulk update modal:
   - List of selected items
   - Global adjustment type
   - Individual quantity inputs per item
   - Global reason & notes
   ↓
4. Admin fills & submits
   ↓
5. Process all adjustments
   ↓
6. Show summary:
   "5 items updated successfully ✓"
   → END
```

---

## QR/Barcode Scanning

### Scan Item for Quick Actions

**Trigger:** Click "Scan Item" button OR open scanner from mobile app

**Flow:**

```
1. Admin clicks "Scan Item" button
   ↓
2. Camera scanner opens (full-screen modal)
   ↓
   **Scanner Interface:**
   
   - Live camera feed
   - Scan frame (square in center)
   - "Point camera at QR code or barcode"
   - Torch/Flash toggle button
   - Manual entry button (if scan fails)
   - Close button
   ↓
3. Admin points camera at item's QR/barcode
   ↓
4. Scanner detects code
   - Beep sound
   - Vibration (mobile)
   - Green checkmark animation
   ↓
5. Submit code to API: POST /api/admin/inventory/scan
   - code: scanned value
   - Show loading
   ↓
6. Server looks up item by code
   ↓
   ├─ Item not found
   │  └─> Error modal:
   │      "Item Not Found"
   │      - Code: [scanned value]
   │      - "This code isn't in the system"
   │      - [Scan Again] [Add New Item] [Cancel]
   │      → If "Add New Item":
   │         Open add item modal with code pre-filled
   │      → END
   │
   └─ Item found
      ↓
7. Close scanner
   ↓
8. Show item quick actions modal:
   
   ┌─────────────────────────────────────┐
   │ [Item Photo]                         │
   │                                      │
   │ R410A Refrigerant                    │
   │ SKU: KJAC-PART-0001                 │
   │ ─────────────────────────────────── │
   │ Current Stock: 15 kg                 │
   │ Status: ✓ In Stock                  │
   │ Location: Main warehouse             │
   │ ─────────────────────────────────── │
   │                                      │
   │ Quick Actions:                       │
   │                                      │
   │ [Update Stock] (large button)        │
   │ [View Details] (outline)             │
   │ [Move Location] (outline)            │
   │ [Print Label] (outline)              │
   │                                      │
   │ [Close] (text link)                  │
   └─────────────────────────────────────┘
   ↓
9. Admin selects action:
   
   If "Update Stock":
   └─> Open stock update modal (pre-filled with item)
   
   If "View Details":
   └─> Navigate to item details page
   
   If "Move Location":
   └─> Open location transfer modal
   
   If "Print Label":
   └─> Generate & print QR label
   
   → END
```

**QR Code Generation:**

When item doesn't have barcode:
- System auto-generates QR code
- Encodes: `KJAC:INVENTORY:[item_id]`
- Admin can print label with QR code

**Print Label Flow:**

```
1. Admin clicks "Print Label"
   ↓
2. Label preview modal:
   
   ┌─────────────────────────────────────┐
   │ Label Preview                        │
   │ ─────────────────────────────────── │
   │                                      │
   │  [QR Code]                          │
   │                                      │
   │  R410A Refrigerant                  │
   │  SKU: KJAC-PART-0001                │
   │  Min Stock: 10 kg                   │
   │                                      │
   │ ─────────────────────────────────── │
   │ Label size: (dropdown)               │
   │ - Small (2" × 1")                   │
   │ - Medium (3" × 2") [selected]       │
   │ - Large (4" × 3")                   │
   │                                      │
   │ Quantity: [1] labels                 │
   │                                      │
   │ [Cancel] [Print] [Download PDF]      │
   └─────────────────────────────────────┘
   ↓
3. Admin clicks "Print"
   ↓
4. Generate PDF with labels
   ↓
5. Open print dialog
   → END
```

---

## Stock Movements

### View Movement History

**Trigger:** View item details → "Movement History" tab

**Page Layout:**

**Filters:**
- Date range picker
- Movement type (All, Added, Removed, Adjusted)
- Performed by (Admin dropdown)
- Related to booking (checkbox + search)

**Movement Table:**

Columns:
1. Date/Time
2. Type badge (Added / Removed / Adjusted)
3. Quantity change (with +/- and color)
4. Stock before
5. Stock after
6. Reason
7. Performed by (admin name)
8. Related booking (if applicable)
9. Notes
10. Actions (View, Revert - if recent)

**Movement Card Example:**

```
┌─────────────────────────────────────┐
│ Sept 10, 2026 at 10:30 AM            │
│ [Removed Badge]                      │
│ ─────────────────────────────────── │
│ Quantity: -5 kg (red)                │
│ Stock: 15 kg → 10 kg                │
│ ─────────────────────────────────── │
│ Reason: Used in service              │
│ Booking: #KJ-2026-001234             │
│ Customer: Juan Dela Cruz             │
│ ─────────────────────────────────── │
│ Performed by: Admin (Maria)          │
│ Notes: "Used for Aircon Repair job"  │
│ ─────────────────────────────────── │
│ [View Booking] [Revert] (if <24hrs)  │
└─────────────────────────────────────┘
```

**Revert Movement (Undo):**

```
1. Admin clicks "Revert" (only available <24 hours)
   ↓
2. Confirmation modal:
   "Revert this stock adjustment?"
   
   - This will undo the change
   - Stock will return to: 15 kg
   - A reversal record will be created
   - Cannot be undone again
   
   - Reason for reversal * (textarea, required)
   
   - Cancel / Confirm Reversal
   ↓
3. Admin confirms
   ↓
4. Submit to API: POST /api/admin/inventory/movements/{id}/revert
   ↓
5. Server:
   - Reverse the adjustment
   - Create reversal movement record
   - Update current stock
   - Create audit log entry
   ↓
6. Show success toast:
   "Movement reverted. Stock restored to 15 kg"
   → END
```

---

## Low Stock Alerts

### Automated Alert System

**Trigger Conditions:**

1. Stock drops to or below minimum level
2. Daily check (runs at 8 AM) for all items below threshold
3. Item added with initial stock below minimum

**Alert Flow:**

```
1. System detects stock <= min level
   ↓
2. Check if alert already sent (within last 24 hours)
   ↓
   ├─ Alert recently sent
   │  └─> Skip (prevent spam)
   │      → END
   │
   └─ No recent alert
      ↓
3. Create alert record
   ↓
4. Send notifications:
   
   **Push Notification (to all admins):**
   Title: "Low Inventory Alert"
   Message: "R410A Refrigerant: 10 kg (min: 10 kg)"
   Priority: High
   
   **Email (to admin@kjac.com):**
   Subject: "[KJAC] Low Inventory Alert: R410A Refrigerant"
   Body:
   - Item details
   - Current stock vs minimum
   - Last used in: [Booking #]
   - Supplier info (if available)
   - [Restock Now] button → Opens update stock page
   
   **In-App Notification:**
   - Appears in notification center
   - Red badge on inventory nav item
   ↓
5. Mark item with "Low Stock" status
   ↓
6. Add to "Low Stock Items" list on dashboard
   → END
```

**Low Stock Dashboard Widget:**

```
┌─────────────────────────────────────┐
│ ⚠️ Low Stock Items (12)              │
│ ─────────────────────────────────── │
│                                      │
│ R410A Refrigerant                    │
│ 10 kg / 10 kg min                   │
│ [Restock] button                     │
│ ─────────────────────────────────── │
│ Copper Tubing 1/4"                  │
│ 3 m / 5 m min                       │
│ [Restock] button                     │
│ ─────────────────────────────────── │
│ ...                                  │
│ [View All Low Stock Items]           │
└─────────────────────────────────────┘
```

**Alert Dismissal:**

Alert automatically dismissed when:
- Stock updated above minimum level
- Item deleted
- Minimum level adjusted below current stock

---

## Usage Tracking

### Track Parts Used Per Job

**Integration with Booking Completion:**

When technician completes service and reports parts used:

```
1. Technician completes job
   ↓
2. Completion form includes "Parts Used" section
   ↓
3. Technician searches & adds parts:
   
   [Search inventory items]
   
   Selected Parts:
   - R410A Refrigerant: [2] kg
   - Copper Tubing 1/4": [3] m
   - Filter (HEPA): [1] pc
   
   [Add More Parts]
   ↓
4. Technician submits completion
   ↓
5. API processes completion:
   
   For each part used:
   - Deduct from inventory stock
   - Create stock movement record:
     - Type: "Removed"
     - Reason: "Used in service"
     - Booking ID: linked
   - Update job cost calculation
   ↓
6. Admin sees parts usage in booking details
   ↓
7. Inventory automatically updated
   → If any item goes below minimum:
      Trigger low stock alert
   → END
```

**Usage Reports:**

Admin can view:
- Parts used per job
- Most used items (last 30/90 days)
- Usage trends (chart)
- Cost per job breakdown

---

## Inventory Reports

### Generate Inventory Reports

**Report Types:**

**1. Current Stock Report**

```
Contents:
- All items with current quantities
- Stock status (in stock, low, out)
- Total value per item
- Total inventory value

Filters:
- Category
- Location
- Stock status

Export: PDF, Excel, CSV

Chart:
- Stock levels by category (bar chart)
```

**2. Stock Movement Report**

```
Contents:
- All movements in date range
- By item or by booking
- Additions vs removals

Filters:
- Date range
- Item
- Movement type
- Admin

Export: PDF, Excel, CSV

Chart:
- Movement trend over time (line chart)
```

**3. Usage Report**

```
Contents:
- Parts used in services
- Frequency of use
- Cost per booking

Filters:
- Date range
- Item
- Service type

Export: PDF, Excel, CSV

Chart:
- Top 10 most used items (pie chart)
```

**4. Valuation Report**

```
Contents:
- Total inventory value
- Value by category
- Cost of goods sold (COGS)

Filters:
- Date range
- Category

Export: PDF, Excel

Chart:
- Inventory value trend (line chart)
```

**5. Reorder Report**

```
Contents:
- Items at or below minimum
- Items out of stock
- Suggested reorder quantities
- Supplier information

Export: PDF, Excel

Actions:
- Send to supplier (email)
- Generate purchase order
```

**Report Generation Flow:**

```
1. Admin navigates to Inventory → Reports
   ↓
2. Select report type
   ↓
3. Configure filters & date range
   ↓
4. Click "Generate Report"
   ↓
5. Show loading (may take time for large datasets)
   ↓
6. Report preview displays
   ↓
7. Admin reviews
   ↓
8. Admin clicks export format (PDF/Excel/CSV)
   ↓
9. Download file
   → END
```

---

## Stock Audit

### Physical Inventory Count

**Purpose:** Verify physical stock matches system records

**Audit Flow:**

```
1. Admin clicks "Start Stock Audit"
   ↓
2. Audit creation modal:
   
   - Audit name * (text)
     - E.g., "Monthly Audit - Sept 2026"
   
   - Audit type * (radio)
     ○ Full audit (all items)
     ○ Partial audit (select items/categories)
   
   - Location (dropdown, if partial)
   
   - Assigned to (dropdown, select admin/staff)
   
   - Scheduled date * (date picker)
   
   - Notes (textarea, optional)
   
   - [Cancel] [Start Audit]
   ↓
3. Admin clicks "Start Audit"
   ↓
4. System creates audit record
   - Status: "In Progress"
   - Locks inventory (no adjustments during audit)
   ↓
5. Audit page displays:
   
   **Header:**
   - Audit name
   - Status badge
   - Progress: 0/150 items counted
   
   **Item List (with count fields):**
   
   ┌─────────────────────────────────────┐
   │ R410A Refrigerant                    │
   │ System: 15 kg                        │
   │ Physical count: [____] kg            │
   │ Difference: (calculated)             │
   │ [Count Complete] checkbox            │
   └─────────────────────────────────────┘
   
   Repeat for all items...
   
   **Actions:**
   - Save Progress (saves current counts)
   - Complete Audit (finalizes and applies)
   ↓
6. Staff physically counts items
   - Uses scanner to identify items
   - Enters physical count
   - Checks "Count Complete"
   ↓
7. System calculates discrepancies:
   - Difference = Physical - System
   - Highlights items with variances (yellow/red)
   ↓
8. Admin reviews discrepancies
   ↓
9. Admin clicks "Complete Audit"
   ↓
10. Audit summary modal:
    
    **Audit Summary:**
    
    - Items counted: 150
    - Matches: 135 (90%)
    - Discrepancies: 15 (10%)
    
    **Significant Discrepancies:**
    - R410A Refrigerant: -2 kg
    - Copper Tubing: +5 m
    - Filter (HEPA): -3 pcs
    
    **Actions:**
    ○ Apply adjustments to inventory
    ○ Review discrepancies first
    
    **Confirmation Required:**
    ☐ I confirm the physical counts are accurate
    
    [Cancel] [Apply Adjustments]
    ↓
11. Admin confirms & applies
    ↓
12. System applies adjustments:
    - For each discrepancy:
      → Adjust stock to physical count
      → Create "Audit Adjustment" movement record
      → Add note: "Audit: [Audit Name]"
    - Close audit (Status: "Completed")
    - Unlock inventory
    - Create audit report (PDF)
    ↓
13. Show success:
    "Audit completed. 15 adjustments applied."
    [Download Audit Report]
    → END
```

**Audit Report (Auto-generated PDF):**

```
KJAC Inventory Audit Report

Audit Name: Monthly Audit - Sept 2026
Date: September 10, 2026
Performed by: Admin Maria Santos
Duration: 2 hours 15 minutes

Summary:
- Total items audited: 150
- Items matching: 135 (90%)
- Discrepancies found: 15 (10%)
- Total value variance: ₱2,450.00

Discrepancies Detail:
[Table of all items with variances]

Adjustments Applied:
[List of all stock adjustments made]

Signatures:
Auditor: _________________
Supervisor: _________________
Date: _________________
```

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_ADMIN.md` - Admin inventory management workflows
- `FLOW_TECHNICIAN.md` - Parts usage reporting
- `FLOW_NOTIFICATION.md` - Low stock alerts
- `API.md` - Inventory API endpoints
- `DATABASE_TABLES.md` - Inventory tables schema