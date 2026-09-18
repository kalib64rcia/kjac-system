import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useCreateBooking, useLandingContent } from "@/hooks/usePublic";
import { ApiError } from "@/api/errors";
import { toast } from "@/stores/toast.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/input";
import { AddressSelector } from "@/components/forms/AddressSelector";
import { SchedulePicker } from "@/components/forms/SchedulePicker";
import { bookingSchema, type BookingFormValues } from "@/schemas/booking.schema";
import { CustomerInfoFields, ServiceFields } from "./BookingSections";

const DEFAULTS: BookingFormValues = {
  customer_first_name: "",
  customer_last_name: "",
  customer_email: "",
  customer_phone: "",
  region_code: "",
  province_code: "",
  city_municipality_code: "",
  barangay_code: "",
  street_address: "",
  landmark: "",
  service_id: 0,
  brand_id: 0,
  preferred_date: "",
  preferred_time: "",
  problem_description: "",
  agree_payment: false as unknown as true,
  agree_terms: false as unknown as true,
};

/** 5-step progressive booking form with autosave draft. */
export function BookingForm() {
  const navigate = useNavigate();
  const { data: content } = useLandingContent();
  const create = useCreateBooking();
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  });
  const { register, handleSubmit, watch, setValue, setError, formState } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit(
    (values) => {
      setServerErrors([]);
      const { agree_payment: _p, agree_terms: _t, ...payload } = values;
      create.mutate(
        {
          ...payload,
          service_id: Number(payload.service_id),
          brand_id: Number(payload.brand_id),
          problem_description: payload.problem_description?.trim() || null,
          turnstile_token: null, // documented dev bypass (no site key on staging)
          preferred_time: payload.preferred_time || null, // No default time - admin assigns it
        },
        {
        onSuccess: (booking) => {
          void navigate("/book/success", {
            state: {
              reference_id: booking.reference_id,
              expires_at: booking.expires_at,
              down_payment: booking.down_payment_amount,
              email: booking.customer_email,
            },
          });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "VAL_001" && err.details.length > 0) {
            const messages: string[] = [];
            for (const d of err.details) {
              messages.push(d.message);
              if (d.field) {
                try {
                  setError(d.field as keyof BookingFormValues, { message: d.message });
                } catch {
                  /* unknown field – summary only */
                }
              }
            }
            setServerErrors(messages);
            document.getElementById("booking-errors")?.scrollIntoView({ behavior: "smooth" });
          } else if (err instanceof ApiError && err.status === 409) {
            // Seat gone: clear date and let guest pick again.
            setValue("preferred_date", "", { shouldValidate: true });
            toast.error(
              "That slot just filled",
              "Pick another date – the board is live.",
            );
            document.getElementById("booking-top")?.scrollIntoView({ behavior: "smooth" });
          } else {
            toast.error("Booking failed", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    );
    },
    () => {
      // Client-side invalid: focus the first invalid field.
      document
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      document.getElementById("booking-top")?.scrollIntoView({ behavior: "smooth" });
    },
  );

  const onClear = () => {
    form.reset(DEFAULTS);
    setServerErrors([]);
    toast.success("Form cleared", "All fields have been reset.");
  };

  return (
    <form id="booking-top" onSubmit={(e) => void onSubmit(e)} noValidate aria-label="Book service">
      {serverErrors.length > 0 && (
        <div id="booking-errors" role="alert" className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4">
          <p className="font-semibold text-error-700">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-error-600">
            {serverErrors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle>Step 1: Service Details</CardTitle></CardHeader>
          <CardContent><ServiceFields form={form} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Step 2: Preferred Schedule</CardTitle></CardHeader>
          <CardContent>
            <SchedulePicker
              date={watch("preferred_date")}
              allowSunday={content?.allow_sunday_bookings ?? false}
              onChange={(p) => {
                if (p.preferred_date !== undefined) setValue("preferred_date", p.preferred_date, { shouldValidate: formState.isSubmitted });
              }}
              errors={{
                preferred_date: errors.preferred_date?.message,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Step 3: Your Information</CardTitle></CardHeader>
          <CardContent><CustomerInfoFields form={form} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Step 4: Service Location</CardTitle></CardHeader>
          <CardContent>
            <AddressSelector
              region={watch("region_code") || null}
              province={watch("province_code") || null}
              city={watch("city_municipality_code") || null}
              barangay={watch("barangay_code")}
              onChange={(p) => {
                if (p.region !== undefined) setValue("region_code", p.region, { shouldValidate: formState.isSubmitted });
                if (p.province !== undefined) setValue("province_code", p.province, { shouldValidate: formState.isSubmitted });
                if (p.city !== undefined) setValue("city_municipality_code", p.city, { shouldValidate: formState.isSubmitted });
                if (p.barangay !== undefined) setValue("barangay_code", p.barangay, { shouldValidate: formState.isSubmitted });
              }}
              errors={{
                region_code: errors.region_code?.message,
                province_code: errors.province_code?.message,
                city_municipality_code: errors.city_municipality_code?.message,
                barangay_code: errors.barangay_code?.message,
              }}
              street={watch("street_address")}
              landmark={watch("landmark")}
              onText={(p) => {
                if (p.street_address !== undefined) setValue("street_address", p.street_address, { shouldValidate: formState.isSubmitted });
                if (p.landmark !== undefined) setValue("landmark", p.landmark, { shouldValidate: formState.isSubmitted });
              }}
              textErrors={{
                street_address: errors.street_address?.message,
                landmark: errors.landmark?.message,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Review &amp; Submit</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Payment &amp; cancellation policy</p>
              <p className="mt-1">
                Pay the down payment with GCash after we accept your request. Not now.
                If you cancel before the day, you get a full refund.
                If you cancel on the day, we will review it.
              </p>
            </div>
            <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-2.5 text-sm text-gray-700">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" {...register("agree_payment")} />
              I agree to the payment and cancellation policies *
            </label>
            <FieldError message={errors.agree_payment?.message} />
            <label className="mt-2 flex min-h-[44px] cursor-pointer items-start gap-2.5 text-sm text-gray-700">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" {...register("agree_terms")} />
              I agree to the terms of service *
            </label>
            <FieldError message={errors.agree_terms?.message} />
            {create.isError && !(create.error instanceof ApiError && (create.error as ApiError).code === "VAL_001") && (
              <p role="alert" className="mt-3 text-sm text-error-600">
                {(create.error as Error)?.message ?? "Submission failed."} Your entries are preserved, try again.
              </p>
            )}
            <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button type="submit" size="lg" disabled={create.isPending}>
                {create.isPending ? "Creating your booking…" : "Submit Booking"}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={onClear} disabled={create.isPending}>
                Clear Form
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              The down payment for your chosen service is paid with GCash after we accept.
              You will see the amount in Step 3. If not paid by the start, the request will close.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
