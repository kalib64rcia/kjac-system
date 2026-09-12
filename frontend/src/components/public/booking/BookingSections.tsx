import type { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useBrands, useService, useServices } from "@/hooks/usePublic";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Input id="bf-fn" autoComplete="given-name" aria-invalid={!!e.customer_first_name} {...register("customer_first_name")} />
        <FieldError message={e.customer_first_name?.message} />
      </div>
      <div>
        <Label htmlFor="bf-ln">Last name *</Label>
        <Input id="bf-ln" autoComplete="family-name" aria-invalid={!!e.customer_last_name} {...register("customer_last_name")} />
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="bf-brand">Aircon brand *</Label>
        <Select
          value={brandId > 0 ? String(brandId) : ""}
          onValueChange={(v) => setValue("brand_id", Number(v), { shouldValidate: true })}
          disabled={brands.isLoading}
        >
          <SelectTrigger id="bf-brand" aria-invalid={!!e.brand_id} aria-busy={brands.isLoading}>
            {brands.isLoading ? (
              <span className="inline-flex items-center gap-2 text-gray-500">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Loading…
              </span>
            ) : (
              <SelectValue placeholder="Select brand" />
            )}
          </SelectTrigger>
          <SelectContent>
            {(brands.data ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}{b.is_partner ? " ★ Official Partner" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={e.brand_id?.message} />
      </div>
      <div>
        <Label htmlFor="bf-service">Service type *</Label>
        <Select
          value={serviceId > 0 ? String(serviceId) : ""}
          onValueChange={(v) => setValue("service_id", Number(v), { shouldValidate: true })}
          disabled={services.isLoading}
        >
          <SelectTrigger id="bf-service" aria-invalid={!!e.service_id} aria-busy={services.isLoading}>
            {services.isLoading ? (
              <span className="inline-flex items-center gap-2 text-gray-500">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Loading…
              </span>
            ) : (
              <SelectValue placeholder="Select service" />
            )}
          </SelectTrigger>
          <SelectContent>
            {(services.data ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={e.service_id?.message} />
      </div>
      {detail.data && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 sm:col-span-2">
          <p className="font-semibold text-gray-900">{detail.data.name}</p>
          <p className="mt-1 text-sm text-gray-600">{detail.data.description}</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Down payment due now:{" "}
            <span className="font-technical">{formatPeso(detail.data.down_payment_amount)}</span>
            {" "}via GCash
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
