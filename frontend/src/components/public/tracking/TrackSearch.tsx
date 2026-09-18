import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { trackSchema, type TrackFormValues } from "@/schemas/booking.schema";
import { toast } from "@/stores/toast.store";
import { useLocalStorageDraft } from "@/hooks/useLocalStorageDraft";

/** Reference + email search (R1 proof). */
export function TrackSearch({
  pending,
  onSearch,
}: {
  pending: boolean;
  onSearch: (values: TrackFormValues) => void;
}) {
  const { loadDraft, hasMeaningfulData, draftToastShown } = useLocalStorageDraft(
    'kjac-track-draft',
    { reference_id: "", email: "" },
    (data) => !!(data.reference_id?.trim() || data.email?.trim())
  );

  const { register, handleSubmit, formState, reset, watch } = useForm<TrackFormValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: loadDraft(),
    mode: "onSubmit",
  });

  const tracked = watch();
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem('kjac-track-draft', JSON.stringify(tracked));
      } catch {
        /* ignore */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [tracked]);

  useEffect(() => {
    try {
      if (!draftToastShown.current && hasMeaningfulData()) {
        draftToastShown.current = true;
        toast.info("Search restored", "Your previous search was restored.");
      }
    } catch {
      /* ignore */
    }
  }, [draftToastShown, hasMeaningfulData]);

  const submit = handleSubmit(onSearch, () => {
    document
      .querySelector<HTMLElement>('#track-ref[aria-invalid="true"], #track-email[aria-invalid="true"]')
      ?.focus();
  });

  const onClear = () => {
    const hadData = hasMeaningfulData();
    reset({ reference_id: "", email: "" });
    try {
      localStorage.removeItem('kjac-track-draft');
    } catch {
      /* ignore */
    }
    if (hadData) {
      toast.success("Search cleared", "All fields have been reset.");
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Track booking">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="track-ref">Booking reference ID *</Label>
          <Input
            id="track-ref"
            placeholder="KJAC-YYYY-XXXXXX"
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
      <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button type="submit" disabled={pending}>
          {pending ? "Tracking…" : "Track Booking"}
        </Button>
        <Button type="button" variant="outline" onClick={onClear} disabled={pending}>
          Clear
        </Button>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Your reference ID is in your booking confirmation. Both must match.
      </p>
    </form>
  );
}
