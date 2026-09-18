# Testing Checklist - Booking Card Spanning Fix

## Pre-Test Setup
- [ ] Browser open to admin panel
- [ ] DevTools (F12) ready
- [ ] Console tab visible

---

## Test 1: Verify Backend is Serving New Field

**Steps:**
1. Open DevTools → Network tab
2. Create or edit a booking with end time 11:30 AM
3. Find request to `/admin/bookings` in Network tab
4. Click it, go to Response tab
5. Search for: `"estimated_duration_minutes"`

**Expected Result:**
```json
{
  "id": 123,
  "reference_id": "REF-ABC123",
  "estimated_duration_minutes": 150,      ← Should see this field
  "service_estimated_duration_minutes": 60,
  ...
}
```

**Status:** 
- [ ] Field present in response
- [ ] Value is correct (150 for 9:00-11:30)

---

## Test 2: Verify Frontend Console Logging

**Steps:**
1. Open DevTools → Console tab
2. Create booking: 9:00 AM - 11:30 AM (150 min duration)
3. Look in console for debug message

**Expected Result:**
```javascript
[Booking REF-ABC123] Duration calculation: {
  estimated_duration_minutes: 150,
  service_estimated_duration_minutes: 60,
  finalDuration: 150,
  calculation: "(150 / 30) * 32 = 160px"
}
```

**Status:**
- [ ] Console shows debug message
- [ ] finalDuration shows 150 (not 60)
- [ ] calculation shows 160px (not 128px)

---

## Test 3: Visual Verification - 9:00-11:30 AM Booking

**Steps:**
1. Open Schedule page (no filters)
2. Look for booking showing "9:00 AM - 11:30 AM" text
3. Visually measure the card height against time labels

**Expected Result:**
- Card starts at 9:00 AM line
- Card ends at 11:30 AM line (not 11:00 AM)
- Card spans exactly 5 rows of the 30-min grid

**Visual Check:**
```
9:00 AM   ┌─────────────────┐ ← Starts here
9:30 AM   │ Joshua Testing  │
10:00 AM  │ 9:00-11:30 AM   │
10:30 AM  │                 │
11:00 AM  │                 │ 
11:30 AM  └─────────────────┘ ← Ends here (NOT at 11:00 AM)
```

**Status:**
- [ ] Card starts at 9:00 AM
- [ ] Card ends at 11:30 AM (not 11:00 AM)
- [ ] Card height is clearly larger than before

---

## Test 4: Visual Verification - Other Durations

**Booking 1: 30 minutes (8:00-8:30)**
- [ ] Card spans exactly 1 row (32px)
- [ ] Card fits within 8:00 and 8:30 lines

**Booking 2: 60 minutes (9:00-10:00)**
- [ ] Card spans exactly 2 rows (64px)
- [ ] Card fits within 9:00 and 10:00 lines

**Booking 3: 90 minutes (10:00-11:30)**
- [ ] Card spans exactly 3 rows (96px)
- [ ] Card fits within 10:00 and 11:30 lines

**Booking 4: 120 minutes (1:00-3:00 PM)**
- [ ] Card spans exactly 4 rows (128px)
- [ ] Card fits within 1:00 PM and 3:00 PM lines

---

## Test 5: Edge Cases

**Case 1: Booking at end of day (4:30-5:00 PM)**
- [ ] Card spans exactly 1 row (30 min)
- [ ] Card doesn't overflow below 5:00 PM

**Case 2: Booking with service default (no admin override)**
- Create booking, don't set end time, rely on service estimate
- [ ] Console shows: `estimated_duration_minutes: null`
- [ ] Console shows: `service_estimated_duration_minutes: 60` (or service value)
- [ ] Card height uses service duration correctly

**Case 3: Multiple overlapping bookings**
- [ ] All cards span correctly (no height collision issues)
- [ ] Each card shows correct end time

---

## Test 6: Performance Check

**Steps:**
1. Load schedule with 10+ bookings
2. Check page load time
3. Check for console errors

**Expected Result:**
- [ ] Page loads in < 2 seconds
- [ ] No console errors (only debug logs should appear)
- [ ] All cards render correctly
- [ ] No visual glitches or flickering

---

## Test 7: Interaction Check

**Steps:**
1. Click on a booking card (9:00-11:30)
2. Verify hour drawer opens
3. Check that all booking details display correctly

**Expected Result:**
- [ ] Hour drawer opens
- [ ] Booking shows correct time range
- [ ] All details (customer name, service, etc.) are correct

---

## Test 8: Mobile/Responsive Check (if applicable)

**Steps:**
1. Open DevTools → Device toolbar
2. Switch to mobile view (iPhone 12, etc.)
3. Verify schedule board displays correctly

**Expected Result:**
- [ ] Time labels still visible
- [ ] Booking cards still span correctly
- [ ] Text is readable (no truncation issues)

---

## Rollback Plan (If Issues)

If cards are still not spanning correctly after these tests:

### Issue 1: Console shows null/undefined duration
```
estimated_duration_minutes: null
```
**Action:**
1. Restart backend: `python -m uvicorn app.main:app --reload`
2. Wait 5 seconds
3. Refresh browser (Ctrl+F5)
4. Create new booking and test again

### Issue 2: Console shows wrong calculation
```
calculation: "(60 / 30) * 32 = 64px"  ← Wrong (should be 160)
```
**Action:**
1. Check if booking was actually saved with 150 min duration
2. Verify in database: `SELECT estimated_duration_minutes FROM bookings WHERE id = 123;`
3. If NULL in database, duration wasn't saved - check set_booking_slot in backend

### Issue 3: Card height is still 128px
```
Console shows: calculation: "(150 / 30) * 32 = 160px"
But card looks short
```
**Action:**
1. Open DevTools inspector
2. Click the card
3. Check style attribute: should show `height: 160px;`
4. If not, check CSS in SchedulePage.tsx for any `max-height` constraints

---

## Success Criteria

All of the following must be true:

✅ **Backend Test:** API response includes `estimated_duration_minutes` field  
✅ **Frontend Test:** Console shows `finalDuration: 150` (not 60)  
✅ **Height Test:** Console shows `calculation: "(150 / 30) * 32 = 160px"`  
✅ **Visual Test:** 9:00-11:30 card spans from 9:00 line to 11:30 line  
✅ **Other Durations:** 30/60/90/120 min bookings all span correctly  
✅ **No Errors:** No console errors, only debug logs appear  

---

## Sign-Off

When all tests pass, this issue is **RESOLVED** ✅

**Tested By:** _____________  
**Date:** _____________  
**Time Spent:** _____________  

---

## Quick Reference

**Console Debug Log Location:**
- Open: F12 → Console tab
- Look for: `[Booking REF-*] Duration calculation:`
- Values to check:
  - `estimated_duration_minutes` - should be 150 (or admin-set value)
  - `finalDuration` - should be 150 (or admin-set value)
  - `calculation` - should show 160px (not 128px)

**Visual Reference:**
- 1 row = 32px = 30 min
- 5 rows = 160px = 150 min
- 9:00 AM - 11:30 AM = exactly 5 rows

**Key Files:**
- Backend: `backend/app/schemas/booking.py` line 200
- Frontend: `frontend/src/pages/office/SchedulePage.tsx` lines 393-407
