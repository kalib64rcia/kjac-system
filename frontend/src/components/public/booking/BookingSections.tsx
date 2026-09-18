import type { UseFormReturn } from "react-hook-form";
import { useBrands, useService, useServices } from "@/hooks/usePublic";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { formatPeso } from "@/utils/format";
import type { BookingFormValues } from "@/schemas/booking.schema";

type Form = UseFormReturn<BookingFormValues>;

/** Step 1: customer information fields. */
export function CustomerInfoFields({ form }: { form: Form }) {
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="bf-fn">First name *</Label>
        <Input id="bf-fn" autoComplete="given-name" placeholder="Enter your first name"
          aria-invalid={!!e.customer_first_name} {...register("customer_first_name")} />
        <FieldError message={e.customer_first_name?.message} />
      </div>
      <div>
        <Label htmlFor="bf-ln">Last name *</Label>
        <Input id="bf-ln" autoComplete="family-name" placeholder="Enter your last name"
          aria-invalid={!!e.customer_last_name} {...register("customer_last_name")} />
        <FieldError message={e.customer_last_name?.message} />
      </div>
      <div>
        <Label htmlFor="bf-email">Email *</Label>
        <Input id="bf-email" type="email" autoComplete="email" placeholder="you@email.com"
          aria-invalid={!!e.customer_email} {...register("customer_email")} />
        <FieldError message={e.customer_email?.message ?? "We'll send booking confirmation here."} />
      </div>
      <div>
        <Label htmlFor="bf-phone">Contact number *</Label>
        <Input id="bf-phone" type="tel" autoComplete="tel" placeholder="09XX-XXX-XXXX"
          aria-invalid={!!e.customer_phone} {...register("customer_phone")} />
        <FieldError message={e.customer_phone?.message} />
      </div>
    </div>
  );
}

/** Step 3: service + brand selects with down-payment-only details card. */
export function ServiceFields({ form }: { form: Form }) {
  const { register, setValue, watch, formState } = form;
  const e = formState.errors;
  const services = useServices();
  const brands = useBrands();
  const serviceId = watch("service_id");
  const brandId = watch("brand_id");
  const detail = useService(typeof serviceId === "number" && serviceId > 0 ? serviceId : null);
  const selectedBrand = (brands.data ?? []).find((b) => b.id === brandId);
  const brandName = selectedBrand
    ? (selectedBrand.is_partner ? `${selectedBrand.name} (Official Partner)` : selectedBrand.name)
    : undefined;
  const serviceName = (services.data ?? []).find((s) => s.id === serviceId)?.name;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="bf-brand">Aircon brand *</Label>
        <FilterPopover
          id="bf-brand"
          fluid
          allowClear={false}
          label="brands"
          display={brandName ?? "Select brand"}
          options={(brands.data ?? []).map((b) => ({
            id: String(b.id),
            name: b.is_partner ? `${b.name} (Official Partner)` : b.name,
          }))}
          isLoading={brands.isLoading}
          value={brandId > 0 ? String(brandId) : ""}
          onPick={(v) => setValue("brand_id", Number(v), { shouldValidate: formState.isSubmitted })}
          disabled={brands.isLoading}
        />
        <FieldError message={e.brand_id?.message} />
      </div>
      <div>
        <Label htmlFor="bf-service">Service type *</Label>
        <FilterPopover
          id="bf-service"
          fluid
          allowClear={false}
          label="services"
          display={serviceName ?? "Select service"}
          options={(services.data ?? []).map((s) => ({ id: String(s.id), name: s.name }))}
          isLoading={services.isLoading}
          value={serviceId > 0 ? String(serviceId) : ""}
          onPick={(v) => setValue("service_id", Number(v), { shouldValidate: formState.isSubmitted })}
          disabled={services.isLoading}
        />
        <FieldError message={e.service_id?.message} />
      </div>
      {detail.data && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 sm:col-span-2">
          <p className="font-semibold text-gray-900">{detail.data.name}</p>
          <p className="mt-1 text-sm text-gray-600">{detail.data.description}</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Reserve with{" "}
            <span className="font-technical">{formatPeso(detail.data.down_payment_amount)}</span>
            {" "}via GCash. Pay this after we accept. Not now.
          </p>
          {detail.data.estimated_duration_display && (
            <p className="mt-1 text-sm text-gray-600">Duration: {detail.data.estimated_duration_display}</p>
          )}
        </div>
      )}
      <div className="sm:col-span-2">
        <Label htmlFor="bf-problem">Problem description (optional)</Label>
        <Textarea id="bf-problem" rows={3} maxLength={1000} placeholder="Describe the issue with your aircon"
          {...register("problem_description")} />
        <FieldError message={e.problem_description?.message} />
      </div>
    </div>
  );
}
