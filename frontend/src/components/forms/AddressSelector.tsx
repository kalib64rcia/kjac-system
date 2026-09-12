import { Loader2 } from "lucide-react";
import { useBarangays, useCities, useProvinces, useRegions } from "@/hooks/usePublic";
import { FieldError, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}) {
  return (
    <div>
      <Label htmlFor={id}>{label} {required && "*"}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
        <SelectTrigger id={id} aria-invalid={!!error} aria-busy={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Loading…
            </span>
          ) : (
            <SelectValue placeholder={disabled ? disabledHint : placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
          {(items ?? []).map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.name}
            </SelectItem>
          ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
  const cities = useCities(province);
  const barangays = useBarangays(city);

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
      />
      <CascadeSelect
        id="city"
        label="City / Municipality"
        value={city ?? ""}
        placeholder="Select city"
        disabledHint="Select a province first"
        disabled={!province}
        loading={!!province && cities.isLoading}
        loadError={!!province && cities.isError}
        onRetry={() => void cities.refetch()}
        items={cities.data}
        onValueChange={(v) => onChange({ city: v, barangay: "" })}
        error={errors.city_municipality_code}
      />
      <CascadeSelect
        id="barangay"
        label="Barangay"
        value={barangay}
        placeholder="Select barangay"
        disabledHint="Select a city first"
        disabled={!city}
        loading={!!city && barangays.isLoading}
        loadError={!!city && barangays.isError}
        onRetry={() => void barangays.refetch()}
        items={barangays.data}
        onValueChange={(v) => onChange({ barangay: v })}
        error={errors.barangay_code}
      />
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
    </div>
  );
}
