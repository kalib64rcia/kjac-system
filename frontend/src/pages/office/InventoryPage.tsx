import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Package, PackageX, Search, Warehouse } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, RowsSelect, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/api/errors";
import type { InventoryItem } from "@/api/office-ext.api";
import { useInventory, useInventoryMutation, useMovements } from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { id: "aircon_unit", name: "Aircon units" },
  { id: "replacement_part", name: "Replacement parts" },
  { id: "tool", name: "Tools" },
  { id: "consumable", name: "Consumables" },
];

const TYPE_LABELS: Record<string, string> = {
  aircon_unit: "Aircon unit",
  replacement_part: "Part",
  tool: "Tool",
  consumable: "Consumable",
};

const MOVEMENT_OPTIONS = [
  { id: "stock_in", name: "Stock in (+)" },
  { id: "stock_out", name: "Stock out (−)" },
  { id: "adjustment", name: "Adjustment" },
  { id: "transfer", name: "Transfer" },
  { id: "damaged", name: "Damaged" },
  { id: "returned", name: "Returned" },
];

function stockTone(item: InventoryItem): "success" | "warning" | "destructive" | "secondary" {
  if (item.quantity <= 0) return "destructive";
  if (item.quantity <= item.minimum_stock_level) return "warning";
  return "success";
}

function stockLabel(item: InventoryItem): string {
  if (item.quantity <= 0) return "Out of stock";
  if (item.quantity <= item.minimum_stock_level) return "Low stock";
  return "In stock";
}

/** Inventory board: shared by owner + staff routes (office + 2FA). */
export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, itemType, lowOnly, pageSize]);

  const list = useInventory({
    search: debouncedSearch.trim() || undefined,
    item_type: itemType || undefined,
    low_stock: lowOnly || undefined,
    page,
    limit: pageSize,
  });
  // Unfiltered total for the stat card (one cheap row).
  const totals = useInventory({ page: 1, limit: 1 });
  const lowTotals = useInventory({ low_stock: true, page: 1, limit: 1 });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const filtersActive = search.trim() !== "" || itemType !== "" || lowOnly;
  const clearFilters = () => {
    setSearch("");
    setItemType("");
    setLowOnly(false);
  };

  const columnHelper = createColumnHelper<InventoryItem>();
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "row",
        header: "#",
        cell: ({ row }) => (
          <span className="font-technical text-sm tabular-nums text-gray-500">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.display({
        id: "item",
        header: "Item",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="min-w-0 max-w-56">
              <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="truncate font-technical text-xs tabular-nums text-gray-600" title={item.sku}>
                {item.sku} · {TYPE_LABELS[item.item_type] ?? item.item_type}
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <p className="whitespace-nowrap font-technical text-sm tabular-nums text-gray-900">
              {item.quantity}
              <span className="text-gray-600"> / min {item.minimum_stock_level}</span>
            </p>
          );
        },
      }),
      columnHelper.display({
        id: "price",
        header: "Unit cost",
        cell: ({ row }) => (
          <p className="whitespace-nowrap font-technical text-sm tabular-nums text-gray-900">
            ₱{Number(row.original.unit_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={stockTone(item)}>{stockLabel(item)}</Badge>
              {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedId(row.original.id); setCreating(false); }}>
            View
          </Button>
        ),
      }),
    ],
    [page, pageSize],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    pageCount,
    state: { pagination: { pageIndex: page - 1, pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader title="Inventory" description="Stock levels, low-stock alerts, and every movement." />
      {(lowTotals.data?.total ?? 0) > 0 && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning-500/30 bg-warning-50 px-4 py-3">
          <AlertTriangle size={18} aria-hidden="true" className="shrink-0 text-warning-700" />
          <p className="min-w-0 flex-1 text-sm text-gray-900">
            <span className="font-semibold tabular-nums">{lowTotals.data?.total}</span>{" "}
            {lowTotals.data?.total === 1 ? "item is" : "items are"} at or below minimum stock.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setLowOnly(true); setPage(1); }}
          >
            Review
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total SKUs" value={String(totals.data?.total ?? "—")} icon={Warehouse} hint="Tracked items" tint="sky" />
        <StatCard title="Low stock" value={String(lowTotals.data?.total ?? "—")} icon={AlertTriangle} hint="At or below minimum" tint="warning" />
        <StatCard title="Out of stock" value={String(items.filter((i) => i.quantity <= 0).length)} icon={PackageX} hint="On this page" tint="success" />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-52">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU or name…" aria-label="Search inventory" className="pl-10" />
        </div>
        <FilterPopover
          label="types"
          display={TYPE_LABELS[itemType] ?? "All types"}
          options={TYPE_OPTIONS}
          isLoading={false}
          value={itemType}
          onPick={setItemType}
        />
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900">
          <Switch checked={lowOnly} onCheckedChange={(v) => setLowOnly(v)} aria-label="Show low stock only" />
          Low stock only
        </label>
        <Button type="button" onClick={() => { setCreating(true); setSelectedId(null); }}>
          <Package size={16} aria-hidden="true" data-icon="inline-start" />
          Add item
        </Button>
      </div>

      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {list.data ? (
            <>Showing <span className="font-semibold tabular-nums text-gray-900">{items.length}</span> of <span className="font-semibold tabular-nums text-gray-900">{total}</span> {total === 1 ? "item" : "items"}</>
          ) : ("Loading inventory…")}
        </p>
        {filtersActive && (<Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>)}
      </div>

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {list.isLoading && !list.data && (
          <div aria-busy="true" aria-label="Loading inventory">{[0, 1, 2].map((i) => (<CardSkeleton key={i} />))}</div>
        )}
        {list.isError && (
          <ErrorCard message={list.error instanceof Error ? list.error.message : "Could not load inventory."} onRetry={() => void list.refetch()} />
        )}
        {list.data && items.length === 0 && (
          <EmptyState
            title={filtersActive ? "No items match these filters" : "No inventory yet"}
            description={filtersActive ? "Try another search, type, or clear the low-stock toggle." : "Add your first SKU to start tracking stock."}
            actionLabel={filtersActive ? "Clear filters" : "Add item"}
            onAction={filtersActive ? clearFilters : () => setCreating(true)}
          />
        )}
        {items.length > 0 && (
          <>
            <div className="thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white [&::-webkit-scrollbar]:h-1.5">
              <TableLoadingBar active={list.isFetching && items.length > 0} label="Refreshing inventory" />
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                      {hg.headers.map((h) => (
                        <th key={h.id} scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="min-w-0 px-3 py-2.5 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RowsSelect value={pageSize} onChange={(n) => { setPageSize(n); setPage(1); }} />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <p className="text-sm text-gray-600">
                  Page <span className="font-semibold tabular-nums text-gray-900">{page}</span> of <span className="font-semibold tabular-nums text-gray-900">{pageCount}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1 || list.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                    <ChevronLeft size={16} aria-hidden="true" /> Prev
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={page >= pageCount || list.isFetching} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} aria-label="Next page">
                    Next <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <ItemSheet
        item={selected}
        creating={creating}
        onClose={() => { setSelectedId(null); setCreating(false); }}
        onSaved={() => { setSelectedId(null); setCreating(false); toast.success("Inventory updated."); }}
      />
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

function ItemSheet({ item, creating, onClose, onSaved }: {
  item: InventoryItem | null;
  creating: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = creating || item !== null;
  const mutations = useInventoryMutation();
  const movements = useMovements(item?.id ?? null);

  const [form, setForm] = useState({ sku: "", item_type: "replacement_part", name: "", quantity: "0", minimum_stock_level: "10", unit_cost: "", selling_price: "", storage_location: "" });
  const [edit, setEdit] = useState({ minimum_stock_level: "", unit_cost: "", selling_price: "", storage_location: "" });
  const [adjust, setAdjust] = useState({ movement_type: "stock_in", quantity: "", reason: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setEdit({
        minimum_stock_level: String(item.minimum_stock_level),
        unit_cost: String(item.unit_cost),
        selling_price: item.selling_price == null ? "" : String(item.selling_price),
        storage_location: "",
      });
      setAdjust({ movement_type: "stock_in", quantity: "", reason: "" });
    }
    if (creating) {
      setForm({ sku: "", item_type: "replacement_part", name: "", quantity: "0", minimum_stock_level: "10", unit_cost: "", selling_price: "", storage_location: "" });
    }
  }, [item, creating]);

  const busy = mutations.create.isPending || mutations.update.isPending || mutations.adjust.isPending || mutations.remove.isPending;

  const submitCreate = async () => {
    try {
      await mutations.create.mutateAsync({
        sku: form.sku.trim(),
        item_type: form.item_type,
        name: form.name.trim(),
        quantity: Number(form.quantity) || 0,
        minimum_stock_level: Number(form.minimum_stock_level) || 0,
        unit_cost: Number(form.unit_cost),
        selling_price: form.selling_price === "" ? null : Number(form.selling_price),
        storage_location: form.storage_location.trim() || null,
      });
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create item.");
    }
  };

  const submitEdit = async () => {
    if (!item) return;
    try {
      await mutations.update.mutateAsync({
        id: item.id,
        payload: {
          minimum_stock_level: edit.minimum_stock_level === "" ? undefined : Number(edit.minimum_stock_level),
          unit_cost: edit.unit_cost === "" ? undefined : Number(edit.unit_cost),
          selling_price: edit.selling_price === "" ? null : Number(edit.selling_price),
          storage_location: edit.storage_location.trim() === "" ? undefined : edit.storage_location.trim(),
        },
      });
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save changes.");
    }
  };

  const submitAdjust = async () => {
    if (!item) return;
    try {
      await mutations.adjust.mutateAsync({
        id: item.id,
        payload: {
          movement_type: adjust.movement_type,
          quantity: Number(adjust.quantity),
          reason: adjust.reason.trim() || null,
        },
      });
      toast.success("Stock adjusted.");
      setAdjust({ movement_type: "stock_in", quantity: "", reason: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not adjust stock.");
    }
  };

  const submitDelete = async () => {
    if (!item) return;
    try {
      await mutations.remove.mutateAsync(item.id);
      setConfirmDelete(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete item.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent label={creating ? "Add inventory item" : "Inventory item details"} side="right" onClose={onClose} className="w-[420px] max-w-[92vw] overflow-y-auto p-6">
        <SheetTitle className="text-lg font-semibold text-gray-900">
          {creating ? "Add item" : item ? <span className="font-technical">{item.sku}</span> : ""}
        </SheetTitle>
        {creating ? (
          <div className="mt-4 flex flex-col gap-4">
            <Field label="SKU *"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="CAP-001" disabled={busy} /></Field>
            <Field label="Type *">
              <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} disabled={busy} className="min-h-[44px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary-600 focus:outline-none">
                {TYPE_OPTIONS.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </Field>
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Capacitor 35µF" disabled={busy} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity"><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} disabled={busy} /></Field>
              <Field label="Minimum"><Input type="number" min={0} value={form.minimum_stock_level} onChange={(e) => setForm({ ...form, minimum_stock_level: e.target.value })} disabled={busy} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit cost (₱) *"><Input type="number" min={0} step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} disabled={busy} /></Field>
              <Field label="Sell price (₱)"><Input type="number" min={0} step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="Optional" disabled={busy} /></Field>
            </div>
            <Field label="Storage location"><Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder="Shelf A-1" disabled={busy} /></Field>
            <Button type="button" onClick={() => void submitCreate()} disabled={busy || !form.sku.trim() || !form.name.trim() || form.unit_cost === ""}>
              {mutations.create.isPending ? "Adding…" : "Add item"}
            </Button>
          </div>
        ) : item ? (
          <div className="mt-4 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={stockTone(item)}>{stockLabel(item)}</Badge>
              <Badge variant="secondary">{TYPE_LABELS[item.item_type] ?? item.item_type}</Badge>
              {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-sm text-gray-600">
              On hand <span className="font-technical font-semibold tabular-nums text-gray-900">{item.quantity}</span>
              {" "}· minimum <span className="font-technical tabular-nums text-gray-900">{item.minimum_stock_level}</span>
            </p>

            <section aria-label="Edit item" className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-900">Edit details</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum"><Input type="number" min={0} value={edit.minimum_stock_level} onChange={(e) => setEdit({ ...edit, minimum_stock_level: e.target.value })} disabled={busy} /></Field>
                <Field label="Unit cost (₱)"><Input type="number" min={0} step="0.01" value={edit.unit_cost} onChange={(e) => setEdit({ ...edit, unit_cost: e.target.value })} disabled={busy} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sell price (₱)"><Input type="number" min={0} step="0.01" value={edit.selling_price} onChange={(e) => setEdit({ ...edit, selling_price: e.target.value })} placeholder="None" disabled={busy} /></Field>
                <Field label="Location"><Input value={edit.storage_location} onChange={(e) => setEdit({ ...edit, storage_location: e.target.value })} placeholder="Unchanged" disabled={busy} /></Field>
              </div>
              <Button type="button" variant="outline" onClick={() => void submitEdit()} disabled={busy}>
                {mutations.update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </section>

            <section aria-label="Adjust stock" className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-900">Adjust stock</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Movement">
                  <select value={adjust.movement_type} onChange={(e) => setAdjust({ ...adjust, movement_type: e.target.value })} disabled={busy} className="min-h-[44px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary-600 focus:outline-none">
                    {MOVEMENT_OPTIONS.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                  </select>
                </Field>
                <Field label="Qty (signed)" hint="e.g. 10 or -2">
                  <Input type="number" step="1" value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} placeholder="+10 / -2" disabled={busy} />
                </Field>
              </div>
              <Field label="Reason"><Input value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="PO-123, booking #456…" disabled={busy} /></Field>
              <Button type="button" onClick={() => void submitAdjust()} disabled={busy || adjust.quantity.trim() === "" || Number.isNaN(Number(adjust.quantity))}>
                {mutations.adjust.isPending ? "Adjusting…" : "Apply adjustment"}
              </Button>
            </section>

            <section aria-label="Movements" className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Recent movements</h3>
              {movements.isLoading && <p className="text-sm text-gray-600">Loading…</p>}
              {movements.data && movements.data.items.length === 0 && (
                <p className="text-sm text-gray-600">No movements recorded yet.</p>
              )}
              <ul className="flex flex-col gap-1.5">
                {(movements.data?.items ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-gray-900">{m.movement_type.replaceAll("_", " ")}</span>
                    <span className={cn("shrink-0 font-technical tabular-nums", m.quantity >= 0 ? "text-success-700" : "text-error-600")}>
                      {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <Button type="button" variant="destructiveOutline" onClick={() => setConfirmDelete(true)} disabled={busy}>
              Delete item
            </Button>
            <ConfirmDialog
              spec={confirmDelete ? {
                title: "Delete this item?",
                body: `“${item.name}” (${item.sku}) will be removed from intake. Movement history is kept.`,
                confirmLabel: "Delete",
                destructive: true,
                onConfirm: () => void submitDelete(),
              } : null}
              onClose={() => setConfirmDelete(false)}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
