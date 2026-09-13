import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label }from "@/components/ui/input";
import { AddressSelector } from "@/components/forms/AddressSelector";
import { acceptInvite, type InviteKind } from "@/hooks/useInviteAccept";
import { cn } from "@/lib/utils";

const PHONE_RE = /^(09|\+639)\d{9}$/;

/** Uniform employee Step 1 (staff + technician): PSGC area only, gender,
 *  birthdate, consent. No street/landmark (doorstep data stays customer-only).
 *  No password here — credentials are Step 2, Supabase-direct. */
export const employeeAcceptSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  middle_name: z.string().trim().max(100).optional().or(z.literal("")),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().regex(PHONE_RE, "Use 09XXXXXXXXX or +639XXXXXXXXX"),
  position: z.string().trim().max(100).optional().or(z.literal("")),
  gender: z.enum(["male", "female"], { error: "Select a gender" }),
  date_of_birth: z.string().min(1, "Birthdate is required").refine(
    (s) => {
      const dob = new Date(`${s}T00:00:00`);
      if (Number.isNaN(dob.getTime())) return false;
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      return age >= 18;
    },
    { message: "Must be 18 or older" },
  ),
  region_code: z.string().min(1, "Select a region"),
  province_code: z.string().min(1, "Select a province"),
  city_municipality_code: z.string().min(1, "Select a city/municipality"),
  barangay_code: z.string().min(1, "Select a barangay"),
  privacy_consent: z.literal(true, { error: "Privacy consent is required" }),
});

export type EmployeeAcceptValues = z.infer<typeof employeeAcceptSchema>;

function empty(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export function EmployeeAcceptForm({
  kind,
  token,
  defaultEmail,
  onDone,
}: {
  kind: InviteKind;
  token: string;
  defaultEmail: string;
  onDone: (email: string) => void;
}) {
  const { register, handleSubmit, watch, setValue, setError, formState } = useForm<EmployeeAcceptValues>({
    resolver: zodResolver(employeeAcceptSchema),
    defaultValues: {
      first_name: "", middle_name: "", last_name: "", email: defaultEmail,
      phone: "", position: "", gender: undefined,
      date_of_birth: "", region_code: "", province_code: "",
      city_municipality_code: "", barangay_code: "",
      privacy_consent: undefined as unknown as true,
    },
  });
  const region = watch("region_code") || null;
  const province = watch("province_code") || null;
  const city = watch("city_municipality_code") || null;
  const barangay = watch("barangay_code") || "";
  const gender = watch("gender");

  const submit = handleSubmit(async (v) => {
    try {
      await acceptInvite(kind, {
        token,
        first_name: v.first_name.trim(),
        middle_name: empty(v.middle_name) ?? undefined,
        last_name: v.last_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        position: empty(v.position) ?? undefined,
        gender: v.gender,
        date_of_birth: v.date_of_birth,
        region_code: v.region_code,
        province_code: v.province_code,
        city_municipality_code: v.city_municipality_code,
        barangay_code: v.barangay_code,
        privacy_consent: true,
      });
      onDone(v.email.trim());
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Could not submit. The link may have expired — ask for a fresh invite.",
      });
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Employee application">
      <h2 className="text-lg font-bold text-gray-900">Step 1 of 2 — Your details</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ea-first">First name *</Label>
          <Input id="ea-first" placeholder="Juan" autoComplete="given-name"
            aria-invalid={!!formState.errors.first_name} {...register("first_name")} />
          <FieldError message={formState.errors.first_name?.message} />
        </div>
        <div>
          <Label htmlFor="ea-last">Last name *</Label>
          <Input id="ea-last" placeholder="Dela Cruz" autoComplete="family-name"
            aria-invalid={!!formState.errors.last_name} {...register("last_name")} />
          <FieldError message={formState.errors.last_name?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ea-middle">Middle name</Label>
          <Input id="ea-middle" placeholder="Santos (optional)" {...register("middle_name")} />
        </div>
        <div>
          <Label htmlFor="ea-email">Email *</Label>
          <Input id="ea-email" type="email" placeholder="Must match your invite"
            autoComplete="email" spellCheck={false}
            aria-invalid={!!formState.errors.email} {...register("email")} />
          <FieldError message={formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="ea-phone">Phone *</Label>
          <Input id="ea-phone" placeholder="09XXXXXXXXX" autoComplete="tel"
            aria-invalid={!!formState.errors.phone} {...register("phone")} />
          <FieldError message={formState.errors.phone?.message} />
        </div>
        <div>
          <Label htmlFor="ea-position">Position title</Label>
          <Input id="ea-position"
            placeholder={kind === "staff" ? "e.g. Dispatcher" : "e.g. Senior Technician"}
            {...register("position")} />
        </div>
        <div>
          <Label htmlFor="ea-dob">Birthdate *</Label>
          <Input id="ea-dob" type="date"
            aria-invalid={!!formState.errors.date_of_birth} {...register("date_of_birth")} />
          <FieldError message={formState.errors.date_of_birth?.message} />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 block text-sm font-semibold text-gray-700">
            Gender *
          </legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Gender"
            aria-invalid={!!formState.errors.gender}>
            {(["male", "female"] as const).map((g) => (
              <label
                key={g}
                className={cn(
                  "flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                  gender === g
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary-300",
                )}
              >
                <input type="radio" value={g} {...register("gender")} className="sr-only" />
                {g === "male" ? "Male" : "Female"}
              </label>
            ))}
          </div>
          <FieldError message={formState.errors.gender?.message} />
        </fieldset>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-900">Work area *</h3>
        <p className="mb-2 text-xs text-gray-500">Your home base area, used for dispatch planning.</p>
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
          errors={{
            region_code: formState.errors.region_code?.message,
            province_code: formState.errors.province_code?.message,
            city_municipality_code: formState.errors.city_municipality_code?.message,
            barangay_code: formState.errors.barangay_code?.message,
          }}
          street="" landmark="" onText={() => undefined} textErrors={{}}
          areaOnly
        />
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <input
          type="checkbox"
          {...register("privacy_consent")}
          aria-invalid={!!formState.errors.privacy_consent}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-primary-600"
        />
        <span className="text-sm text-gray-700">
          I consent to KJAC collecting my name, contact, birthdate, gender, and
          work area for employment and dispatch purposes, as described in the{" "}
          <Link to="/privacy" target="_blank" rel="noreferrer"
            className="font-semibold text-primary-600 hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" target="_blank" rel="noreferrer"
            className="font-semibold text-primary-600 hover:underline">
            Terms of Service
          </Link>
          . *
        </span>
      </label>
      <FieldError message={formState.errors.privacy_consent?.message} />
      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Submitting…" : "Continue to Sign-in Setup"}
      </Button>
      {formState.errors.root?.message && (
        <p role="alert" className="mt-2 text-sm font-medium text-error-600">
          {formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
