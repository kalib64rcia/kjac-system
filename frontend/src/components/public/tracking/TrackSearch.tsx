import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { trackSchema, type TrackFormValues } from "@/schemas/booking.schema";

/** Reference + email search (R1 proof). */
export function TrackSearch({
  initial,
  pending,
  onSearch,
}: {
  initial: { reference_id: string; email: string };
  pending: boolean;
  onSearch: (values: TrackFormValues) => void;
}) {
  const { register, handleSubmit, formState } = useForm<TrackFormValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: initial,
  });

  const submit = handleSubmit(onSearch, () => {
    document
      .querySelector<HTMLElement>('#track-ref[aria-invalid="true"], #track-email[aria-invalid="true"]')
      ?.focus();
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Track booking">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="track-ref">Booking reference ID *</Label>
          <Input
            id="track-ref"
            placeholder="KJAC-2026-XXXXXX"
            autoComplete="off"
            spellCheck={false}
            className="font-technical uppercase"
            aria-invalid={!!formState.errors.reference_id}
            {...register("reference_id")}
          />
          <FieldError message={formState.errors.reference_id?.message} />
        </div>
        <div>
          <Label htmlFor="track-email">Booking email *</Label>
          <Input
            id="track-email"
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={!!formState.errors.email}
            {...register("email")}
          />
          <FieldError message={formState.errors.email?.message} />
        </div>
      </div>
      <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={pending}>
        {pending ? "Tracking…" : "Track Booking"}
      </Button>
      <p className="mt-2 text-sm text-gray-500">
        Your reference ID is in your booking confirmation. Both must match.
      </p>
    </form>
  );
}
