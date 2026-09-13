import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  loginSchema,
  profileSchema,
  twoFaSchema,
  type LoginFormValues,
  type ProfileFormValues,
  type TwoFaFormValues,
} from "@/schemas/auth.schema";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";

function CredentialsStep() {
  const signIn = useAuthStore((s) => s.signIn);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values.email.trim(), values.password);
      // success sets the 2FA state in the store → parent swaps to CodeStep
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Admin log in">
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="login-email">Email *</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="admin@kjac.ph"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={!!formState.errors.email}
            {...register("email")}
          />
          <FieldError message={formState.errors.email?.message} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password *</Label>
            <Link
              to="/admin/forgot-password"
              className="cursor-pointer text-sm font-semibold text-primary-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!formState.errors.password}
            {...register("password")}
          />
          <FieldError message={formState.errors.password?.message} />
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
            Logging in…
          </>
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}

function ProfileStep() {
  const completeProfile = useAuthStore((s) => s.completeProfile);
  const backToCredentials = useAuthStore((s) => s.backToCredentials);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: "", last_name: "", phone: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await completeProfile(values.first_name, values.last_name, values.phone);
      // success sets the 2FA state in the store → parent swaps to CodeStep
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save profile.");
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Complete your profile">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-lg font-bold text-gray-900">One last step</h2>
        <p className="mt-1 text-sm text-gray-600">
          This log-in isn&apos;t linked to a profile yet. Tell us who you are —
          accounts created here wait for owner approval unless invited.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="profile-first">First name *</Label>
          <Input id="profile-first" autoComplete="given-name"
            aria-invalid={!!formState.errors.first_name} {...register("first_name")} />
          <FieldError message={formState.errors.first_name?.message} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="profile-last">Last name *</Label>
          <Input id="profile-last" autoComplete="family-name"
            aria-invalid={!!formState.errors.last_name} {...register("last_name")} />
          <FieldError message={formState.errors.last_name?.message} />
        </div>
      </div>
      <div className="mt-3">
        <Label htmlFor="profile-phone">Phone *</Label>
        <Input id="profile-phone" placeholder="09XXXXXXXXX" autoComplete="tel"
          aria-invalid={!!formState.errors.phone} {...register("phone")} />
        <FieldError message={formState.errors.phone?.message} />
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
            Saving…
          </>
        ) : (
          "Continue"
        )}
      </Button>
      <button
        type="button"
        onClick={backToCredentials}
        className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>
    </form>
  );
}

function CodeStep() {
  const twoFa = useAuthStore((s) => s.twoFa);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const requestCode = useAuthStore((s) => s.requestCode);
  const backToCredentials = useAuthStore((s) => s.backToCredentials);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const { register, handleSubmit, formState } = useForm<TwoFaFormValues>({
    resolver: zodResolver(twoFaSchema),
    defaultValues: { code: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await verifyCode(values.code.trim());
      toast.success("Welcome back", "Two-step verification passed.");
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      const roleHome = useAuthStore.getState().user?.role === "staff"
        ? "/staff/dashboard"
        : "/owner/dashboard";
      const dest = from && from !== "/admin/login" && from !== "/admin/dashboard" && from !== "/admin"
        ? from
        : roleHome;
      void navigate(dest, { replace: true });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Verification failed.");
    }
  });

  const resend = async () => {
    setServerError(null);
    try {
      await requestCode();
      setResent(true);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not resend the code.");
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Two-step verification">
      <div className="flex flex-col items-center text-center">
        <span className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <MailCheck size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-gray-900">Check your email</h2>
        <p className="mt-1 text-sm text-gray-600">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-900">{twoFa?.maskedEmail ?? "your email"}</span>
          {twoFa ? ` (valid ${twoFa.expiresInMinutes} minutes).` : "."} Open your Gmail inbox,
          then enter the code below.
        </p>
      </div>
      <div className="mt-4">
        <Label htmlFor="login-code">6-digit code *</Label>
        <Input
          id="login-code"
          inputMode="numeric"
          placeholder="123456"
          autoComplete="one-time-code"
          spellCheck={false}
          maxLength={6}
          className="text-center font-technical text-xl tracking-[0.5em]"
          aria-invalid={!!formState.errors.code}
          {...register("code")}
        />
        <FieldError message={formState.errors.code?.message} />
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
            Verifying…
          </>
        ) : (
          "Verify & Continue"
        )}
      </Button>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={backToCredentials}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          className="min-h-[44px] cursor-pointer font-semibold text-primary-600 hover:underline"
        >
          Resend code
        </button>
      </div>
      {resent && (
        <p role="status" className="mt-1 text-right text-xs text-success-600">
          New code sent.
        </p>
      )}
    </form>
  );
}

/** Sprint 4: Supabase-direct credentials + backend email-code 2FA. */
export function LoginPage() {
  const twoFa = useAuthStore((s) => s.twoFa);
  const needsProfile = useAuthStore((s) => s.needsProfile);
  const step = twoFa ? "code" : needsProfile ? "profile" : "credentials";
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <img
          src="/assets/business/kjac-logo.png"
          alt=""
          aria-hidden="true"
          className="h-14 w-14 rounded-full"
        />
        <h1 className="mt-3 text-balance text-xl font-bold text-gray-900">Admin access</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
          <ShieldCheck size={15} aria-hidden="true" className="text-primary-600" />
          {step === "code" ? "Two-step verification" : step === "profile" ? "First-time setup" : "Log in with your admin account"}
        </p>
      </div>
      <div className="mt-6">
        {step === "code" ? <CodeStep /> : step === "profile" ? <ProfileStep /> : <CredentialsStep />}
      </div>
    </>
  );
}
