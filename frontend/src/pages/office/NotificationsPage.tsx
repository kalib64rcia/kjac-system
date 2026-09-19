import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FilterPopover, RowsSelect, SwitchChip, TableLoadingBar } from "@/components/shared/FilterPopover";
import type { OfficeNotification } from "@/api/office-ext.api";
import { useNotificationMutation, useNotifications } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toastMutation } from "@/stores/toast.store";

const TYPE_OPTIONS = [
  { id: "booking", name: "Bookings" },
  { id: "payment", name: "Payments" },
  { id: "refund", name: "Refunds" },
  { id: "technician", name: "Technicians" },
  { id: "inventory", name: "Inventory" },
  { id: "system", name: "System" },
];

function typeTone(type: string): "info" | "success" | "warning" | "secondary" | "teal" {
  if (type.includes("refund") || type.includes("cancel")) return "warning";
  if (type.includes("confirm") || type.includes("complet") || type.includes("verif") || type.includes("approv")) return "success";
  if (type.includes("technician") || type.includes("assign")) return "teal";
  if (type.includes("payment") || type.includes("booking")) return "info";
  return "secondary";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** Notifications center: shared by owner + staff routes (badge polls every 60s). */
export function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const base = user?.role === "owner" ? "/owner" : "/staff";
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const mutations = useNotificationMutation();

  const feed = useNotifications({ unreadOnly, page, limit: pageSize });

  const items = (feed.data?.items ?? []).filter((n) =>
    typeFilter === "" || n.type.toLowerCase().includes(typeFilter),
  );
  const unread = feed.data?.unread_count ?? 0;

  const openTarget = (n: OfficeNotification) => {
    if (!n.is_read) void mutations.markRead.mutateAsync(n.id).catch(() => undefined);
    if (n.booking_id != null) {
      navigate(`${base}/bookings`);
    } else if (n.type.includes("refund")) {
      navigate(`${base}/refunds`);
    } else if (n.type.includes("technician") || n.type.includes("approval")) {
      navigate(`${base}/team`);
    } else if (n.type.includes("stock") || n.type.includes("inventory")) {
      navigate(`${base}/inventory`);
    } else if (n.type.includes("payment")) {
      navigate(`${base}/payments`);
    }
  };

  const markAll = async () => {
    await toastMutation(() => mutations.markAllRead.mutateAsync(), {
      success: "All caught up.",
      successDetail: (result) => `${result.marked_read} marked as read.`,
      error: "Could not mark all as read.",
    });
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Notifications" description={unread > 0 ? `${unread} unread.` : "You're all caught up."} />
        <Button type="button" variant="outline" size="sm" onClick={() => void markAll()} disabled={mutations.markAllRead.isPending || unread === 0}>
          <CheckCheck size={16} aria-hidden="true" data-icon="inline-start" />
          {mutations.markAllRead.isPending ? "Marking…" : "Mark all read"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SwitchChip label="Unread only" checked={unreadOnly} onCheckedChange={(v) => { setUnreadOnly(v); setPage(1); }} />
        <FilterPopover
          label="types"
          display={typeFilter ? TYPE_OPTIONS.find((o) => o.id === typeFilter)?.name ?? typeFilter : "All types"}
          options={TYPE_OPTIONS}
          isLoading={false}
          value={typeFilter}
          onPick={(v) => { setTypeFilter(v); setPage(1); }}
        />
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2">
        {feed.isLoading && !feed.data && (
          <div aria-busy="true" aria-label="Loading notifications">{[0, 1, 2].map((i) => (<CardSkeleton key={i} />))}</div>
        )}
        {feed.isError && (
          <ErrorCard message={feed.error instanceof Error ? feed.error.message : "Could not load notifications."} onRetry={() => void feed.refetch()} />
        )}
        {feed.data && items.length === 0 && (
          <EmptyState
            icon={<BellOff size={32} aria-hidden="true" />}
            title={unreadOnly ? "No unread notifications" : "No notifications"}
            description={unreadOnly ? "Everything here is read. Toggle the filter to see history." : "Booking updates, payments, and alerts will appear here."}
          />
        )}
        {items.length > 0 && (
          <Card>
            <CardContent>
              <div className="relative">
                <TableLoadingBar active={feed.isFetching} label="Refreshing notifications" />
                <ul className="flex flex-col divide-y divide-gray-100">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openTarget(n)}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-primary-50/60 ${!n.is_read ? "bg-primary-50/40" : ""}`}
                      >
                        {!n.is_read && (
                          <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-500" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={typeTone(n.type)}>{n.type.replaceAll("_", " ")}</Badge>
                            {n.booking_id != null && (
                              <span className="font-technical text-xs tabular-nums text-gray-600">#{n.booking_id}</span>
                            )}
                            <span className="ml-auto shrink-0 text-xs tabular-nums text-gray-600">{timeAgo(n.created_at)}</span>
                          </span>
                          <span className={`mt-1 block text-sm ${!n.is_read ? "font-semibold text-gray-900" : "font-medium text-gray-900"}`}>
                            {n.title}
                          </span>
                          <span className="mt-0.5 block text-sm text-gray-600">{n.message}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <RowsSelect value={pageSize} onChange={(n) => { setPageSize(n); setPage(1); }} />
                <div className="flex items-center gap-2">
                  <p className="text-sm tabular-nums text-gray-600">Page {page}</p>
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1 || feed.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={feed.isFetching || items.length < pageSize}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
