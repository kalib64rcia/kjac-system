# Booking Service - Address Parts API Response

## Change Made
Updated `list_admin_bookings()` in `booking_service.py` to populate the `address_parts` field in the API response.

## Before
```python
"address_text": ", ".join(p for p in address_parts if p),
"landmark": b.landmark,
```

The response included:
- ✓ `address_text`: Compiled single-line string like "Street, Barangay, City, Province, Region"
- ✗ `address_parts`: Not populated (always None)

## After
```python
"address_text": ", ".join(p for p in address_parts if p),
"address_parts": {
    "street": b.street_address,
    "barangay": barangay_map.get(b.barangay_code or ""),
    "city": city_map.get(b.city_municipality_code or ""),
    "province": province_map.get(b.province_code or ""),
    "region": region_map.get(b.region_code or ""),
},
"landmark": b.landmark,
```

The response now includes:
- ✓ `address_text`: Compiled single-line string (kept for backward compatibility)
- ✓ `address_parts`: Object with individual fields

## Frontend Behavior

### BookingDetailSheet.tsx:
```tsx
{booking.address_parts ? (
  <>
    {booking.address_parts.street && (
      <DetailRow label="Street" value={booking.address_parts.street} />
    )}
    <AreaSection addressParts={booking.address_parts} />
  </>
) : (
  <DetailRow label="Area" value={booking.address_text ?? "—"} />
)}
```

- When `address_parts` is populated: Uses AreaSection component to render each geographical level
- When `address_parts` is null: Falls back to compiled `address_text` display

### AreaSection.tsx:
```tsx
export function AreaSection({ addressParts }) {
  return (
    <>
      {addressParts.region && <DetailRow label="Region" value={...} />}
      {addressParts.province && <DetailRow label="Province" value={...} />}
      {addressParts.city && <DetailRow label="City" value={...} />}
      {addressParts.barangay && <DetailRow label="Barangay" value={...} />}
    </>
  );
}
```

Results in clean, separated rows:
```
Address
├─ Street        123 Main St
├─ Region        Calabarzo
├─ Province      Laguna
├─ City          Pinagsanjan
├─ Barangay      Anon Anonuevo
└─ Landmark      Church
```

## Files Modified
- `backend/app/services/booking_service.py` (line 1321-1327)
