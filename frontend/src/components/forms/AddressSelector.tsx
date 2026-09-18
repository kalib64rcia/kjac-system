import { useEffect } from "react";
import { useBarangays, useCities, useProvinces, useRegions } from "@/hooks/usePublic";
import { FieldError, Label } from "@/components/ui/input";
import { FilterPopover } from "@/components/shared/FilterPopover";
import type { PsgcItem } from "@/types/catalog.types";

interface AddressSelectorProps {
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string;
  onChange: (patch: { region?: string; province?: string; city?: string; barangay?: string }) => void;
  errors: { region_code?: string; province_code?: string; city_municipality_code?: string; barangay_code?: string };
  street: string;
  landmark: string;
  onText: (patch: { street_address?: string; landmark?: string }) => void;
  textErrors: { street_address?: string; landmark?: string };
  /** Employees give PSGC area only (no doorstep data): hides street/landmark. */
  areaOnly?: boolean;
}

function CascadeSelect({
  id,
  label,
  value,
  placeholder,
  disabledHint,
  disabled,
  loading,
  loadError,
  onRetry,
  items,
  onValueChange,
  error,
  required = true,
  /** Shown as the only option when the parent has zero children (e.g. NCR → No province). */
  noneLabel,
  /** The parent level is picked (so an empty result means "none", not "not yet"). */
  parentPicked,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabledHint: string;
  disabled: boolean;
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  items: PsgcItem[] | undefined;
  onValueChange: (v: string) => void;
  error?: string;
  required?: boolean;
  noneLabel: string;
  parentPicked: boolean;
}) {
  // Childless level (loaded fine, zero children): "No X" is the input.
  const showNone =
    parentPicked && !loading && !loadError && (items?.length ?? 0) === 0;
  const effectiveItems = showNone
    ? [{ code: "", name: noneLabel } as PsgcItem]
    : items;
  useEffect(() => {
    if (showNone && value !== "") onValueChange("");
  }, [showNone, value]);
  const selectedName = (effectiveItems ?? []).find((item) => item.code === value)?.name;
  const display = loading ? "Loading…" : (selectedName ?? (disabled ? disabledHint : placeholder));
  return (
    <div>
      <Label htmlFor={id}>{label} {required && "*"}</Label>
      <FilterPopover
        id={id}
        fluid
        allowClear={false}
        label={label.toLowerCase()}
        display={display}
        options={(effectiveItems ?? []).map((item) => ({ id: item.code, name: item.name }))}
        isLoading={loading}
        value={value}
        onPick={onValueChange}
        disabled={disabled || loading}
      />
      {loadError && !loading && (
        <p className="mt-1.5 text-sm text-error-600">
          Couldn&apos;t load options.{" "}
          <button type="button" onClick={onRetry} className="cursor-pointer font-semibold underline">
            Retry
          </button>
        </p>
      )}
      <FieldError message={error} />
    </div>
  );
}

/** PSGC cascade: region → province → city → barangay + street/landmark. */
export function AddressSelector(props: AddressSelectorProps) {
  const { region, province, city, barangay, onChange, errors } = props;
  const regions = useRegions();
  const provinces = useProvinces(region);
  // Childless region (e.g. NCR): cities load straight from the region.
  const provincesEmpty =
    !!region && !provinces.isLoading && !provinces.isError &&
    (provinces.data?.length ?? 0) === 0;
  const cityParent = province || (provincesEmpty ? region : null);
  const cities = useCities(province || null, provincesEmpty ? region : null);
  const citiesEmpty =
    !!cityParent && !cities.isLoading && !cities.isError &&
    (cities.data?.length ?? 0) === 0;
  const barangays = useBarangays(city || null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CascadeSelect
        id="region"
        label="Region"
        value={region ?? ""}
        placeholder="Select region"
        disabledHint="Select region"
        disabled={false}
        loading={regions.isLoading}
        loadError={regions.isError}
        onRetry={() => void regions.refetch()}
        items={regions.data}
        onValueChange={(v) => onChange({ region: v, province: "", city: "", barangay: "" })}
        error={errors.region_code}
        noneLabel="No region"
        parentPicked={false}
      />
      <CascadeSelect
        id="province"
        label="Province"
        value={province ?? ""}
        placeholder="Select province"
        disabledHint="Select a region first"
        disabled={!region}
        loading={!!region && provinces.isLoading}
        loadError={!!region && provinces.isError}
        onRetry={() => void provinces.refetch()}
        items={provinces.data}
        onValueChange={(v) => onChange({ province: v, city: "", barangay: "" })}
        error={errors.province_code}
        noneLabel="No province"
        parentPicked={!!region}
      />
      <CascadeSelect
        id="city"
        label="City / Municipality"
        value={city ?? ""}
        placeholder="Select city"
        disabledHint={provincesEmpty ? "Select a region first" : "Select a province first"}
        disabled={!cityParent}
        loading={!!cityParent && cities.isLoading}
        loadError={!!cityParent && cities.isError}
        onRetry={() => void cities.refetch()}
        items={cities.data}
        onValueChange={(v) => onChange({ city: v, barangay: "" })}
        error={errors.city_municipality_code}
        noneLabel="No city"
        parentPicked={!!cityParent}
      />
      <CascadeSelect
        id="barangay"
        label="Barangay"
        value={barangay}
        placeholder="Select barangay"
        disabledHint="Select a city first"
        disabled={!city && !citiesEmpty}
        loading={(!!city || citiesEmpty) && barangays.isLoading}
        loadError={(!!city || citiesEmpty) && barangays.isError}
        onRetry={() => void barangays.refetch()}
        items={barangays.data}
        onValueChange={(v) => onChange({ barangay: v })}
        error={errors.barangay_code}
        noneLabel="No barangay"
        parentPicked={!!city || citiesEmpty}
      />
      {!props.areaOnly && (
        <div className="sm:col-span-2">
          <Label htmlFor="street">Street address *</Label>
          <input
            id="street"
            name="street_address"
            className="flex min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base placeholder:text-gray-400 focus:border-primary-600 focus:outline-none aria-[invalid=true]:border-error-500"
            placeholder="House #, Street, Subdivision"
            value={props.street}
            aria-invalid={!!props.textErrors.street_address}
            onChange={(e) => props.onText({ street_address: e.target.value })}
          />
          <FieldError message={props.textErrors.street_address} />
        </div>
      )}
      {!props.areaOnly && (
        <div className="sm:col-span-2">
          <Label htmlFor="landmark">Landmark *</Label>
          <input
            id="landmark"
            name="landmark"
            className="flex min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base placeholder:text-gray-400 focus:border-primary-600 focus:outline-none aria-[invalid=true]:border-error-500"
            placeholder="e.g., Near McDonald's, green gate"
            value={props.landmark}
            aria-invalid={!!props.textErrors.landmark}
            onChange={(e) => props.onText({ landmark: e.target.value })}
          />
          <FieldError message={props.textErrors.landmark} />
        </div>
      )}
    </div>
  );
}
