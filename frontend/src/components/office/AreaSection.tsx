import { DetailRow } from "@/components/shared/DetailRow";

interface AddressParts {
  street?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
}

/**
 * Render geographical address components (Region → Province → City → Barangay)
 * as separate DetailRow entries. Returns fragment of rows, not a container.
 */
export function AreaSection({ addressParts }: { addressParts: AddressParts | null | undefined }) {
  if (!addressParts) return null;

  // Check if there are any geographical components to display
  const hasAnyPart = addressParts.region || addressParts.province || addressParts.city || addressParts.barangay;
  if (!hasAnyPart) return null;

  return (
    <>
      {/* Region */}
      {addressParts.region && (
        <DetailRow label="Region" value={addressParts.region} />
      )}

      {/* Province */}
      {addressParts.province && (
        <DetailRow label="Province" value={addressParts.province} />
      )}

      {/* City / Municipality */}
      {addressParts.city && (
        <DetailRow label="City" value={addressParts.city} />
      )}

      {/* Barangay */}
      {addressParts.barangay && (
        <DetailRow label="Barangay" value={addressParts.barangay} />
      )}
    </>
  );
}
