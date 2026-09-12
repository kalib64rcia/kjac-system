import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { AddressSelector } from "@/components/forms/AddressSelector";
import { invitesApi } from "@/api/users.api";

const PHONE_RE = /^(09|\+639)\d{9}$/;

/** Uniform employee form (mirrors technician accept + position title). */
const acceptSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  middle_name: z.string().trim().max(100).optional().or(z.literal("")),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().regex(PHONE_RE, "Use 09XXXXXXXXX or +639XXXXXXXXX"),
  position: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  region_code: z.string().optional().or(z.literal("")),
  province_code: z.string().optional().or(z.literal("")),
  city_municipality_code: z.string().optional().or(z.literal("")),
  barangay_code: z.string().optional().or(z.literal("")),
  street_address: z.string().trim().max(500).optional().or(z.literal("")),
  landmark: z.string().trim().max(255).optional().or(z.literal("")),
});

type AcceptValues = z.infer<typeof acceptSchema>;

function toPayload(token: string, v: AcceptValues): Record<string, unknown> {
  const pick = (s: string | undefined) => (s && s.length > 0 ? s : null);
  return {
    token,
    first_name: v.first_name.trim(),
    middle_name: pick(v.middle_name),
    last_name: v.last_name.trim(),
    email: v.email.trim(),
    phone: v.phone.trim(),
    position: pick(v.position),
    date_of_birth: pick(v.date_of_birth),
    region_code: pick(v.region_code),
    province_code: pick(v.province_code),
    city_municipality_code: pick(v.city_municipality_code),
    barangay_code: pick(v.barangay_code),
    street_address: pick(v.street_address),
    landmark: pick(v.landmark),
  };
}

export function StaffAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, formState } = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      first_name: "", middle_name: "", last_name: "", email: "", phone: "",
      position: "", date_of_birth: "", region_code: "", province_code: "",
      city_municipality_code: "", barangay_code: "", street_address: "", landmark: "",
    },
  });
  const region = watch("region_code") || null;
  const province = watch("province_code") || null;
  const city = watch("city_municipality_code") || null;
  const barangay = watch("barangay_code") || "";
  const street = watch("street_address") || "";
  const landmark = watch("landmark") || "";

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await invitesApi.staffAccept(toPayload(token, v));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    }
  });

  return (
    <AuthLayout>
      <h1 className="text-balance text-center text-xl font-bold text-gray-900">
        Join KJAC office staff
      </h1>
      {!token ? (
        <p role="alert" className="mt-4 text-center text-sm font-medium text-error-600">
          This link is missing its token. Ask the owner for a fresh invite.
        </p>
      ) : done ? (
        <div className="mt-6 flex flex-col items-center text-center">
          <CheckCircle2 size={44} className="text-success-500" aria-hidden="true" />
          <p className="mt-3 font-semibold text-gray-900">Application submitted</p>
          <p className="mt-1 text-sm text-gray-600">
            The owner will review it. You&apos;ll be able to sign in once approved.
          </p>
          <Link to="/" className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-primary-600 hover:underline">
            Back to homepage
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate aria-label="Staff application" className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="sa-first">First name *</Label>
              <Input id="sa-first" autoComplete="given-name" aria-invalid={!!formState.errors.first_name} {...register("first_name")} />
              <FieldError message={formState.errors.first_name?.message} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="sa-last">Last name *</Label>
              <Input id="sa-last" autoComplete="family-name" aria-invalid={!!formState.errors.last_name} {...register("last_name")} />
              <FieldError message={formState.errors.last_name?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="sa-middle">Middle name</Label>
            <Input id="sa-middle" {...register("middle_name")} />
          </div>
          <div>
            <Label htmlFor="sa-email">Email *</Label>
            <Input id="sa-email" type="email" placeholder="Must match your invite"
              autoComplete="email" spellCheck={false}
              aria-invalid={!!formState.errors.email} {...register("email")} />
            <FieldError message={formState.errors.email?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sa-phone">Phone *</Label>
              <Input id="sa-phone" placeholder="09XXXXXXXXX" autoComplete="tel"
                aria-invalid={!!formState.errors.phone} {...register("phone")} />
              <FieldError message={formState.errors.phone?.message} />
            </div>
            <div>
              <Label htmlFor="sa-position">Position title</Label>
              <Input id="sa-position" placeholder="Dispatcher" {...register("position")} />
            </div>
          </div>
          <div>
            <Label htmlFor="sa-dob">Birthdate</Label>
            <Input id="sa-dob" type="date" {...register("date_of_birth")} />
          </div>
          <AddressSelector
            region={region} province={province} city={city} barangay={barangay}
            onChange={(p) => {
              if (p.region !== undefined) {
                setValue("region_code", p.region);
                setValue("province_code", ""); setValue("city_municipality_code", ""); setValue("barangay_code", "");
              }
              if (p.province !== undefined) {
                setValue("province_code", p.province);
                setValue("city_municipality_code", ""); setValue("barangay_code", "");
              }
              if (p.city !== undefined) {
                setValue("city_municipality_code", p.city); setValue("barangay_code", "");
              }
              if (p.barangay !== undefined) setValue("barangay_code", p.barangay);
            }}
            errors={{}}
            street={street} landmark={landmark}
            onText={(p) => {
              if (p.street_address !== undefined) setValue("street_address", p.street_address);
              if (p.landmark !== undefined) setValue("landmark", p.landmark);
            }}
            textErrors={{}}
          />
          {error && <p role="alert" className="text-sm font-medium text-error-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Submitting…</>
            ) : "Submit Application"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
