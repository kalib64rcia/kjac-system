import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Minus, Package, PackageX, Plus, Warehouse } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FilteredEmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, ListLoading, PaginationFooter, ResultCount, SearchField, SortHeaderButton, SwitchChip, TABLE_BASE, TableShell, TD_CELL, TH_CELL, THEAD_ROW, TR_ROW, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/shared/DrawerHeader";
import type { InventoryItem } from "@/api/office-ext.api";
import { useInventory, useInventoryMutation, useMovements } from "@/hooks/useOffice";
import { pageCountOf, usePaginationState } from "@/hooks/usePaginationState";
import { toast, toastMutation } from "@/stores/toast.store";
import { formatPeso } from "@/utils/format";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "name" | "quantity";
const SORT_FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  newest: "desc",
  name: "asc",
  quantity: "asc",
};

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

type AdjustDirection = "stock_in" | "stock_out";

const DIRECTION_OPTIONS: { id: AdjustDirection; label: string }[] = [
  { id: "stock_in", label: "Stock in (+)" },
  { id: "stock_out", label: "Stock out (\u2212)" },
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
  const { page, setPage, pageSize, setPageSize, resetPage, prevPage, nextPage } = usePaginationState();
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, itemType, lowOnly, pageSize, sortBy, sortDir, resetPage]);

  const list = useInventory({
    search: debouncedSearch.trim() || undefined,
    item_type: itemType || undefined,
    low_stock: lowOnly || undefined,
    page,
    limit: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  // Unfiltered total for the stat card (one cheap row).
  const totals = useInventory({ page: 1, limit: 1 });
  const lowTotals = useInventory({ low_stock: true, page: 1, limit: 1 });
  // Out-of-stock count from the low-stock slice (out ⊆ low while min ≥ 0).
  const lowItems = useInventory({ low_stock: true, page: 1, limit: 100 });
  const outCount = (lowItems.data?.items ?? []).filter((i) => i.quantity <= 0).length;
  const inStock = Math.max(0, (totals.data?.total ?? 0) - (lowTotals.data?.total ?? 0));

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pageCount = pageCountOf(total, pageSize);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const filtersActive = search.trim() !== "" || itemType !== "" || lowOnly;
  const clearFilters = () => {
    setSearch("");
    setItemType("");
    setLowOnly(false);
  };

  const columnHelper = createColumnHelper<InventoryItem>();

  const onSort = (key: Exclude<SortKey, "newest">) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir(SORT_FIRST_DIR[key]);
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

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
        header: () => (
          <SortHeaderButton label="Item" active={sortBy === "name"} ascending={sortDir === "asc"} onSort={() => onSort("name")} />
        ),
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
        header: () => (
          <SortHeaderButton label="Stock" active={sortBy === "quantity"} ascending={sortDir === "asc"} onSort={() => onSort("quantity")} />
        ),
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
            {formatPeso(row.original.unit_cost)}
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
    [page, pageSize, sortBy, sortDir],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    manualSorting: true,
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
            onClick={() => { setLowOnly(true); resetPage(); }}
          >
            Review
          </Button>
        </div>
      )}
      <StatsGrid>
        <StatCard title="Total SKUs" value={String(totals.data?.total ?? "")} icon={Warehouse} hint="Tracked items" tint="sky" loading={totals.isLoading && !totals.data} />
        <StatCard title="Out of stock" value={String(lowItems.data ? outCount : "")} icon={PackageX} hint="Needs urgent reorder" tint="warning" loading={lowItems.isLoading && !lowItems.data} />
        <StatCard title="Low stock" value={String(lowTotals.data?.total ?? "")} icon={AlertTriangle} hint="At or below minimum" tint="teal" loading={lowTotals.isLoading && !lowTotals.data} />
        <StatCard title="In stock" value={String(totals.data ? inStock : "")} icon={Package} hint="Healthy levels" tint="success" loading={(totals.isLoading && !totals.data) || (lowTotals.isLoading && !lowTotals.data)} />
      </StatsGrid>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField value={search} onChange={setSearch} placeholder="Search SKU or name" label="Search inventory" />
        <FilterPopover
          label="types"
          display={TYPE_LABELS[itemType] ?? "All types"}
          options={TYPE_OPTIONS}
          isLoading={false}
          value={itemType}
          onPick={setItemType}
        />
        <SwitchChip label="Low stock only" checked={lowOnly} onCheckedChange={setLowOnly} />
        <Button type="button" onClick={() => { setCreating(true); setSelectedId(null); }}>
          <Package size={16} aria-hidden="true" data-icon="inline-start" />
          Add item
        </Button>
      </div>

      <ResultCount shown={items.length} total={total} noun="item" nounPlural="items" isLoading={!list.data} loadingLabel="Loading inventory" filtersActive={filtersActive} onClear={clearFilters} />

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {list.isLoading && !list.data && (
          <ListLoading label="Loading inventory" />
        )}
        {list.isError && (
          <ErrorCard message={list.error instanceof Error ? list.error.message : "Could not load inventory."} onRetry={() => void list.refetch()} />
        )}
        {list.data && items.length === 0 && (
          <FilteredEmptyState
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            filteredTitle="No items match these filters"
            filteredDescription="Try another search, type, or clear the low-stock toggle."
            emptyTitle="No inventory yet"
            emptyDescription="Add your first SKU to start tracking stock."
            actionLabel="Add item"
            onAction={() => setCreating(true)}
          />
        )}
        {items.length > 0 && (
          <>
            <TableShell>
              <TableLoadingBar active={list.isFetching && items.length > 0} label="Refreshing inventory" />
              <table className={cn(TABLE_BASE, "min-w-[840px]")}>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className={THEAD_ROW}>
                      {hg.headers.map((h) => (
                        <th key={h.id} scope="col" className={TH_CELL}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className={TR_ROW}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={TD_CELL}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
            <PaginationFooter page={page} pageCount={pageCount} isFetching={list.isFetching} onPrev={prevPage} onNext={() => nextPage(pageCount)} pageSize={pageSize} onPageSize={setPageSize} />
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
  const [adjust, setAdjust] = useState<{ direction: AdjustDirection; qty: string; reason: string }>({ direction: "stock_in", qty: "1", reason: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setEdit({
        minimum_stock_level: String(item.minimum_stock_level),
        unit_cost: String(item.unit_cost),
        selling_price: item.selling_price == null ? "" : String(item.selling_price),
        storage_location: "",
      });
      setAdjust({ direction: "stock_in", qty: "1", reason: "" });
    }
    if (creating) {
      setForm({ sku: "", item_type: "replacement_part", name: "", quantity: "0", minimum_stock_level: "10", unit_cost: "", selling_price: "", storage_location: "" });
    }
  }, [item, creating]);

  const busy = mutations.create.isPending || mutations.update.isPending || mutations.adjust.isPending || mutations.remove.isPending;

  const submitCreate = async () => {
    const created = await toastMutation(() => mutations.create.mutateAsync({
      sku: form.sku.trim(),
      item_type: form.item_type,
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
      minimum_stock_level: Number(form.minimum_stock_level) || 0,
      unit_cost: Number(form.unit_cost),
      selling_price: form.selling_price === "" ? null : Number(form.selling_price),
      storage_location: form.storage_location.trim() || null,
    }), { error: "Could not create item." });
    if (created === null) return;
    onSaved();
  };

  const submitEdit = async () => {
    if (!item) return;
    const updated = await toastMutation(() => mutations.update.mutateAsync({
      id: item.id,
      payload: {
        minimum_stock_level: edit.minimum_stock_level === "" ? undefined : Number(edit.minimum_stock_level),
        unit_cost: edit.unit_cost === "" ? undefined : Number(edit.unit_cost),
        selling_price: edit.selling_price === "" ? null : Number(edit.selling_price),
        storage_location: edit.storage_location.trim() === "" ? undefined : edit.storage_location.trim(),
      },
    }), { error: "Could not save changes." });
    if (updated === null) return;
    onSaved();
  };

  const adjustMagnitude = Math.abs(Math.floor(Number(adjust.qty))) || 0;
  const adjustSigned = adjust.direction === "stock_in" ? adjustMagnitude : -adjustMagnitude;
  const adjustPreview = item ? item.quantity + adjustSigned : 0;
  const adjustQtyValid = adjust.qty.trim() !== "" && Number.isInteger(adjustMagnitude) && adjustMagnitude >= 1;
  const adjustOverdraw = item != null && adjust.direction === "stock_out" && adjustQtyValid && adjustMagnitude > item.quantity;

  const clampQty = (next: number) => {
    const clamped = Math.max(1, Math.floor(next) || 1);
    setAdjust((prev) => ({ ...prev, qty: String(clamped) }));
  };

  const submitAdjust = async () => {
    if (!item || !adjustQtyValid || adjustOverdraw) return;
    const adjusted = await toastMutation(() => mutations.adjust.mutateAsync({
      id: item.id,
      payload: {
        movement_type: adjust.direction,
        quantity: adjustSigned,
        reason: adjust.reason.trim() || null,
      },
    }), { success: "Stock adjusted.", error: "Could not adjust stock." });
    if (adjusted === null) return;
    setAdjust({ direction: "stock_in", qty: "1", reason: "" });
  };

  const submitDelete = async () => {
    if (!item) return;
    const removed = await toastMutation(() => mutations.remove.mutateAsync(item.id), { error: "Could not delete item." });
    if (removed === null) return;
    setConfirmDelete(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent label={creating ? "Add inventory item" : "Inventory item details"} side="right" onClose={onClose} className="w-[420px] max-w-[92vw] p-0">
        <DrawerHeader
          title={creating ? "Add item" : item ? <span className="font-technical">{item.sku}</span> : ""}
          onClose={onClose}
        />
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
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
              {mutations.create.isPending ? "Adding..." : "Add item"}
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
                {mutations.update.isPending ? "Saving..." : "Save changes"}
              </Button>
            </section>

            <section aria-label="Adjust stock" className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-900">Adjust stock</h3>
              <Field label="Movement">
                <div role="group" aria-label="Movement direction" className="grid grid-cols-2 gap-2">
                  {DIRECTION_OPTIONS.map((o) => {
                    const active = adjust.direction === o.id;
                    return (
                      <Button
                        key={o.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
                        onClick={() => setAdjust((prev) => ({ ...prev, direction: o.id }))}
                        disabled={busy}
                      >
                        {o.label}
                      </Button>
                    );
                  })}
                </div>
              </Field>
              <Field
                label="Quantity"
                hint={adjust.direction === "stock_in" ? "Adds to stock." : `On hand ${item.quantity}.`}
              >
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Decrease quantity"
                    onClick={() => clampQty(adjustMagnitude - 1)}
                    disabled={busy || adjustMagnitude <= 1}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    aria-label="Quantity"
                    value={adjust.qty}
                    onChange={(e) => setAdjust((prev) => ({ ...prev, qty: e.target.value.replace(/[^\d]/g, "").slice(0, 5) }))}
                    onBlur={() => { if (adjust.qty.trim() !== "") clampQty(adjustMagnitude); }}
                    placeholder="1"
                    disabled={busy}
                    className="text-center font-technical tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Increase quantity"
                    onClick={() => clampQty((adjustMagnitude || 0) + 1)}
                    disabled={busy}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </Button>
                </div>
                {adjustOverdraw && (
                  <p role="alert" className="text-xs text-error-600">
                    Only {item.quantity} on hand — lower the quantity.
                  </p>
                )}
              </Field>
              <p className="text-xs text-gray-600" aria-live="polite">
                On hand <span className="font-technical font-semibold tabular-nums text-gray-900">{item.quantity}</span>
                {" → new "}
                <span className={cn("font-technical font-semibold tabular-nums", adjustSigned >= 0 ? "text-success-700" : "text-error-600")}>
                  {adjustQtyValid ? adjustPreview : "—"} ({adjustSigned >= 0 ? `+${adjustSigned}` : adjustSigned})
                </span>
              </p>
              <Field label="Reason"><Input value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="PO-123, booking #456" disabled={busy} /></Field>
              <Button type="button" onClick={() => void submitAdjust()} disabled={busy || !adjustQtyValid || adjustOverdraw}>
                {mutations.adjust.isPending ? "Adjusting..." : adjust.direction === "stock_in" ? "Apply stock in" : "Apply stock out"}
              </Button>
            </section>

            <section aria-label="Movements" className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Recent movements</h3>
              {movements.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
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
                body: `"${item.name}" (${item.sku}) will be removed from intake. Movement history is kept.`,
                confirmLabel: "Delete",
                destructive: true,
                onConfirm: () => void submitDelete(),
              } : null}
              onClose={() => setConfirmDelete(false)}
            />
          </div>
        ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
