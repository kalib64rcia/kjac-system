import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { CredentialStep } from "@/components/forms/CredentialStep";
import { EmployeeAcceptForm } from "@/components/forms/EmployeeAcceptForm";
import { useInviteState, type InviteKind } from "@/hooks/useInviteAccept";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Wide two-column accept shell shared by staff + technician links. */
function WideShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full items-start justify-center px-4 py-10 sm:items-center">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center text-center">
              <img
                src="/assets/business/kjac-logo.png"
                alt=""
                aria-hidden="true"
                className="h-12 w-12 rounded-full"
              />
              <h1 className="mt-3 text-balance text-xl font-bold text-gray-900">{title}</h1>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function StateMessage({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      {icon}
      <p className="mt-3 font-semibold text-gray-900">{title}</p>
      <div className="mt-1 max-w-md text-sm text-gray-600">{body}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Full invite flow: invalid/expired → form → credentials → waiting/decided. */
export function AcceptFlow({ kind }: { kind: InviteKind }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { step, email, status, refetch } = useInviteState(kind, token);
  const [formEmail, setFormEmail] = useState<string | null>(null);
  const title = kind === "staff" ? "Join KJAC office staff" : "Join KJAC as a technician";
  const signInHref = kind === "staff" ? "/admin/login" : "/";

  if (step === "loading") {
    return (
      <WideShell title={title}>
        <p role="status" className="py-6 text-center text-sm text-gray-500">
          Checking your invite link…
        </p>
      </WideShell>
    );
  }

  if (step === "invalid") {
    return (
      <WideShell title={title}>
        <StateMessage
          icon={<XCircle size={44} className="text-error-500" aria-hidden="true" />}
          title="This link doesn't work"
          body="It may be mistyped, expired (links live 7 days), revoked, or already used. Ask the office for a fresh invite."
          action={
            <Link to="/" className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-primary-600 hover:underline">
              Back to homepage
            </Link>
          }
        />
      </WideShell>
    );
  }

  if (step === "waiting_approval") {
    return (
      <WideShell title={title}>
        <StateMessage
          icon={<Clock3 size={44} className="text-warning-500" aria-hidden="true" />}
          title="Waiting for owner approval"
          body={
            <>
              Application received for <span className="font-semibold text-gray-900">{email}</span>.
              You can sign in right after approval — no need to fill anything again.
            </>
          }
        />
      </WideShell>
    );
  }

  if (step === "decided") {
    const active = status === "active";
    return (
      <WideShell title={title}>
        <StateMessage
          icon={active
            ? <CheckCircle2 size={44} className="text-success-500" aria-hidden="true" />
            : <XCircle size={44} className="text-error-500" aria-hidden="true" />}
          title={active ? "Account active" : "Application not approved"}
          body={active
            ? "You're all set — log in to continue."
            : "This application was not approved. Contact the office for details."}
          action={active ? (
            <Link to={signInHref} className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-primary-600 hover:underline">
              Go to log in
            </Link>
          ) : undefined}
        />
      </WideShell>
    );
  }

  if (step === "needs_login") {
    return (
      <WideShell title={title}>
        <CredentialStep
          email={email ?? formEmail ?? ""}
          onDone={() => void refetch()}
        />
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Refresh status
          </Button>
        </div>
      </WideShell>
    );
  }

  // step === "new": show the form, then credentials inline (same visit).
  return (
    <WideShell title={title}>
      {formEmail === null ? (
        <EmployeeAcceptForm
          kind={kind}
          token={token}
          defaultEmail={email ?? ""}
          onDone={(submittedEmail) => {
            setFormEmail(submittedEmail);
            void refetch();
          }}
        />
      ) : (
        <CredentialStep email={formEmail} onDone={() => void refetch()} />
      )}
    </WideShell>
  );
}
