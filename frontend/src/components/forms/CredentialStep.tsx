import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase";

const credentialSchema = z
  .object({
    password: z.string().min(8, "Password needs at least 8 characters").max(128),
    confirm: z.string().min(1, "Repeat the password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type CredentialValues = z.infer<typeof credentialSchema>;

/** Shared Step 2 (staff + technician): Supabase-direct sign-up, token-gated.
 *  The password travels browser → Supabase only; the backend never sees it.
 *  Safe to abandon and resume: the invite link reopens at this step. */
export function CredentialStep({ email, onDone }: { email: string; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, formState } = useForm<CredentialValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const supabase = getSupabase();
    if (!supabase) {
      setServerError("Authentication is not configured.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password: v.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  });

  const resend = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setResending(true);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-success-50 text-success-600">
          <MailCheck size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-gray-900">Check your inbox</h2>
        <p className="mt-1 max-w-md text-sm text-gray-600">
          We sent a confirmation link to <span className="font-semibold text-gray-900">{email}</span>.
          Click it, then wait for the owner to approve your application — you can
          sign in right after. You may safely close this page.
        </p>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending}
          className="mt-3 min-h-[44px] cursor-pointer text-sm font-semibold text-primary-600 hover:underline disabled:opacity-50"
        >
          {resending ? "Resending…" : "Resend confirmation email"}
        </button>
        <Button className="mt-4" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Create your log-in">
      <div className="flex flex-col items-center text-center">
        <span className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <KeyRound size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-gray-900">Step 2 of 2 — Create your log-in</h2>
        <p className="mt-1 max-w-md text-sm text-gray-600">
          Details saved. Now choose a password for{" "}
          <span className="font-semibold text-gray-900">{email}</span>. It goes
          straight to the login service — KJAC never sees or stores it. You may
          close this page and return with the same link anytime.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cred-password">Password *</Label>
          <Input id="cred-password" type="password" placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!formState.errors.password} {...register("password")} />
          <FieldError message={formState.errors.password?.message} />
        </div>
        <div>
          <Label htmlFor="cred-confirm">Repeat password *</Label>
          <Input id="cred-confirm" type="password" placeholder="Repeat the password"
            autoComplete="new-password"
            aria-invalid={!!formState.errors.confirm} {...register("confirm")} />
          <FieldError message={formState.errors.confirm?.message} />
        </div>
      </div>
      {serverError && (
        <p role="alert" className="mt-3 text-sm font-medium text-error-600">
          {serverError}
          {serverError.toLowerCase().includes("already") && (
            <> If you already created a log-in, just wait for approval — no need to repeat this step.</>
          )}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Creating…
          </>
        ) : (
          "Create Sign-in"
        )}
      </Button>
    </form>
  );
}
