import { useState } from "react";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { useOfficeUsers, useRatingMutation, useTechRatings } from "@/hooks/useOffice";
import { toastMutation } from "@/stores/toast.store";
import { formatAuditDay } from "@/utils/format";

/** Ratings board: shared by owner + staff routes. Lookup per technician (no admin list endpoint). */
export function RatingsPage() {
  const [technician, setTechnician] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const techs = useOfficeUsers({ role: "technician", status: "active" });
  const wall = useTechRatings(technician ? Number(technician) : null, page);
  const mutations = useRatingMutation();

  const techOptions = (techs.data?.items ?? []).map((u) => ({
    id: String(u.id),
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
  }));

  const remove = async () => {
    if (confirmDelete == null) return;
    const removed = await toastMutation(() => mutations.remove.mutateAsync(confirmDelete), {
      success: "Review deleted.",
      successDetail: "The technician average was recalculated.",
      error: "Could not delete review.",
    });
    if (removed === null) return;
    setConfirmDelete(null);
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Ratings" description="Customer reviews per technician. Delete only flagged or inappropriate reviews." />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterPopover
          label="technicians"
          display={technician ? techOptions.find((o) => o.id === technician)?.name ?? "Technician" : "Select technician…"}
          options={techOptions}
          isLoading={techs.isLoading}
          value={technician}
          onPick={(v) => { setTechnician(v); setPage(1); }}
        />
        {wall.data && (
          <p className="text-sm text-gray-600" role="status">
            Average <span className="font-technical font-semibold tabular-nums text-gray-900">{Number(wall.data.average_rating).toFixed(2)} ★</span>
            {" "}· <span className="font-semibold tabular-nums text-gray-900">{wall.data.total}</span> {wall.data.total === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2">
        {technician === "" && (
          <EmptyState
            icon={<Star size={32} aria-hidden="true" />}
            title="Pick a technician"
            description="Reviews are stored per booking. Choose a technician to read their wall."
          />
        )}
        {technician !== "" && wall.isLoading && !wall.data && (
          <div aria-busy="true" aria-label="Loading reviews">{[0, 1].map((i) => (<CardSkeleton key={i} />))}</div>
        )}
        {technician !== "" && wall.isError && (
          <ErrorCard message={wall.error instanceof Error ? wall.error.message : "Could not load reviews."} onRetry={() => void wall.refetch()} />
        )}
        {technician !== "" && wall.data && wall.data.items.length === 0 && (
          <EmptyState title="No reviews yet" description="Completed jobs will collect stars here once customers rate them." />
        )}
        {(wall.data?.items ?? []).map((r) => (
          <Card key={r.id}>
            <CardContent>
              <div className="flex flex-wrap items-start gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <p className="font-technical text-sm font-semibold tabular-nums text-warning-500" aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    <span className="ml-2 text-gray-900">{r.rating}/5</span>
                  </p>
                  {r.review_text && <p className="mt-1 text-sm text-gray-900">{r.review_text}</p>}
                  <p className="mt-1 font-technical text-xs tabular-nums text-gray-600">
                    {formatAuditDay(r.created_at)}
                  </p>
                </div>
                <Button type="button" variant="destructiveOutline" size="sm" onClick={() => setConfirmDelete(r.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {wall.data && wall.data.items.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm tabular-nums text-gray-600">Page {page}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1 || wall.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={wall.isFetching || wall.data.items.length < 20} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        spec={confirmDelete != null ? {
          title: "Delete this review?",
          body: "The review is removed and the technician average is recalculated. This is logged in the audit trail.",
          confirmLabel: "Delete",
          destructive: true,
          onConfirm: () => void remove(),
        } : null}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
