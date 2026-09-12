import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { forgotSchema, type ForgotFormValues } from "@/schemas/auth.schema";
import { getSupabase } from "@/lib/supabase";

/** Supabase-direct password reset email (backend never sees passwords). */
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const supabase = getSupabase();
    if (!supabase) {
      setServerError("Authentication is not configured.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  });

  return (
    <>
      <h1 className="text-balance text-center text-xl font-bold text-gray-900">
        Reset admin password
      </h1>
      {sent ? (
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-success-50 text-success-600">
            <MailCheck size={24} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm text-gray-600">
            If an account exists for that email, a reset link is on its way. Check your inbox
            (and spam folder).
          </p>
          <Link
            to="/admin/login"
            className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate aria-label="Forgot password" className="mt-6">
          <p className="text-sm text-gray-600">
            Enter your admin email and we&apos;ll send you a password reset link.
          </p>
          <div className="mt-4">
            <Label htmlFor="forgot-email">Email *</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="admin@kjac.ph"
              autoComplete="email"
              spellCheck={false}
              aria-invalid={!!formState.errors.email}
              {...register("email")}
            />
            <FieldError message={formState.errors.email?.message} />
          </div>
          {serverError && (
            <p role="alert" className="mt-3 text-sm font-medium text-error-600">
              {serverError}
            </p>
          )}
          <Button type="submit" className="mt-5 w-full" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
          <Link
            to="/admin/login"
            className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </Link>
        </form>
      )}
    </>
  );
}
