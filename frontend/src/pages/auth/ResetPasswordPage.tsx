import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { resetSchema, type ResetFormValues } from "@/schemas/auth.schema";
import { getSupabase } from "@/lib/supabase";
import { toast } from "@/stores/toast.store";

/** Landed from the Supabase reset email link — sets the new password direct. */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLinkError("Authentication is not configured.");
      return;
    }
    // Supabase parses the recovery token from the URL hash automatically.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setLinkError("This reset link is invalid or expired. Request a new one.");
        return;
      }
      setReady(true);
    });
  }, []);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const supabase = getSupabase();
    if (!supabase) {
      setServerError("Authentication is not configured.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    toast.success("Password updated", "Log in with your new password.");
    void navigate("/admin/login", { replace: true });
  });

  return (
    <>
      <h1 className="text-balance text-center text-xl font-bold text-gray-900">
        Set a new password
      </h1>
      {linkError ? (
        <div className="mt-6 text-center">
          <p role="alert" className="text-sm font-medium text-error-600">
            {linkError}
          </p>
          <Link
            to="/admin/forgot-password"
            className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-primary-600 hover:underline"
          >
            Request a new link
          </Link>
        </div>
      ) : !ready ? (
        <p role="status" className="mt-6 text-center text-sm text-gray-500">
          Checking your reset link…
        </p>
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate aria-label="Set new password" className="mt-6">
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="reset-password">New password *</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={!!formState.errors.password}
                {...register("password")}
              />
              <FieldError message={formState.errors.password?.message} />
            </div>
            <div>
              <Label htmlFor="reset-confirm">Confirm password *</Label>
              <Input
                id="reset-confirm"
                type="password"
                placeholder="Repeat the new password"
                autoComplete="new-password"
                aria-invalid={!!formState.errors.confirm}
                {...register("confirm")}
              />
              <FieldError message={formState.errors.confirm?.message} />
            </div>
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
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      )}
    </>
  );
}
