import { useQuery } from "@tanstack/react-query";
import { invitesApi } from "@/api/users.api";

export type InviteStep =
  | "loading"
  | "invalid"
  | "new"
  | "needs_login"
  | "waiting_approval"
  | "decided";

export type InviteKind = "staff" | "tech";

/** Resume probe: same token rules as accept, step hint only. */
export function useInviteState(kind: InviteKind, token: string) {
  const query = useQuery({
    queryKey: ["invite-state", kind, token],
    queryFn: () =>
      kind === "staff" ? invitesApi.staffState(token) : invitesApi.techState(token),
    enabled: token.length >= 10,
    retry: false,
    staleTime: 30_000,
  });
  const step: InviteStep = !token || token.length < 10
    ? "invalid"
    : query.isPending
      ? "loading"
      : query.isError
        ? "invalid"
        : (query.data?.state as InviteStep) ?? "invalid";
  return {
    step,
    email: query.data?.email,
    status: query.data?.status,
    refetch: query.refetch,
  };
}

export function acceptInvite(kind: InviteKind, payload: Record<string, unknown>) {
  return kind === "staff"
    ? invitesApi.staffAccept(payload)
    : invitesApi.techAccept(payload);
}
