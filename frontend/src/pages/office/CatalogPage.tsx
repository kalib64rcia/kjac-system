import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/shared/FilterPopover";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/shared/DrawerHeader";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/api/errors";
import type { Brand, ServiceDetail } from "@/types/catalog.types";
import { useAdminBrands, useAdminServices, useCatalogMutation } from "@/hooks/useOffice";
import { toast, toastMutation } from "@/stores/toast.store";
import { formatPeso } from "@/utils/format";

type Tab = "services" | "brands";

/** Catalog board: shared by owner + staff routes. Services + brands CRUD (public site reads live). */
export function CatalogPage() {
  const [tab, setTab] = useState<Tab>("services");

  return (
    <div className="min-w-0">
      <PageHeader title="Catalog" description="Services and brands shown on the public site. Changes go live immediately." />
      <div className="flex gap-2">
        <PillTabs
          label="Catalog sections"
          options={[
            { id: "services" as Tab, name: "Services" },
            { id: "brands" as Tab, name: "Brands" },
          ]}
          value={tab}
          onPick={setTab}
        />
      </div>
      <div className="mt-4" role="tabpanel">
        {tab === "services" ? <ServicesPanel /> : <BrandsPanel />}
      </div>
    </div>
  );
}

/* ------------------------------- Services ------------------------------- */

function ServicesPanel() {
  const services = useAdminServices();
  const mutations = useCatalogMutation();
  const [editing, setEditing] = useState<ServiceDetail | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServiceDetail | null>(null);

  const remove = async () => {
    if (!confirmDelete) return;
    const removed = await toastMutation(() => mutations.deleteService.mutateAsync(confirmDelete.id), {
      success: "Service deleted.",
      error: "Could not delete service.",
    });
    if (removed === null) return;
    setConfirmDelete(null);
    setEditing(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {services.data ? `${services.data.length} ${services.data.length === 1 ? "service" : "services"}` : "Loading services…"}
        </p>
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden="true" data-icon="inline-start" /> Add service
        </Button>
      </div>
      {services.isLoading && !services.data && (
        <div aria-busy="true" aria-label="Loading services">{[0, 1].map((i) => (<CardSkeleton key={i} />))}</div>
      )}
      {services.isError && (
        <ErrorCard message={services.error instanceof Error ? services.error.message : "Could not load services."} onRetry={() => void services.refetch()} />
      )}
      {services.data && services.data.length === 0 && (
        <EmptyState title="No services" description="Add the first service to show it on the public site." actionLabel="Add service" onAction={() => setEditing("new")} />
      )}
      {(services.data ?? []).map((s) => (
        <Card key={s.id}>
          <CardContent>
            <div className="flex flex-wrap items-start gap-3 pt-6">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {s.name}
                  {s.badge_text && <Badge variant="info">{s.badge_text}</Badge>}
                  {!s.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {s.is_featured && <Badge variant="default">Featured</Badge>}
                </p>
                <p className="mt-0.5 truncate font-technical text-xs tabular-nums text-gray-600">{s.slug}</p>
                <p className="mt-1 text-sm tabular-nums text-gray-900">
                  Base <span className="font-technical font-semibold">{s.base_price == null ? "—" : formatPeso(s.base_price)}</span>
                  {" "}· down <span className="font-technical font-semibold">{s.down_payment_amount == null ? "—" : formatPeso(s.down_payment_amount)}</span>
                  <span className="text-gray-600"> ({s.down_payment_type === "percentage" ? "of base" : "fixed"})</span>
                  {s.estimated_duration_display && <span className="text-gray-600"> · {s.estimated_duration_display}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>
                <Button type="button" variant="destructiveOutline" size="sm" onClick={() => setConfirmDelete(s)}>Delete</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <ServiceSheet
        service={editing === "new" ? null : editing}
        creating={editing === "new"}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        spec={confirmDelete ? {
          title: "Delete this service?",
          body: `“${confirmDelete.name}” will disappear from the public site. Existing bookings keep their snapshot.`,
          confirmLabel: "Delete",
          destructive: true,
          onConfirm: () => void remove(),
        } : null}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ServiceSheet({ service, creating, onClose }: { service: ServiceDetail | null; creating: boolean; onClose: () => void }) {
  const open = creating || service !== null;
  const mutations = useCatalogMutation();
  const [form, setForm] = useState({
    name: "", slug: "", description: "", base_price: "", down_payment_amount: "",
    down_payment_type: "fixed", estimated_duration_minutes: "", icon_name: "", badge_text: "",
    is_active: true, is_featured: false,
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        slug: service.slug,
        description: service.description,
        base_price: String(service.base_price),
        down_payment_amount: String(service.down_payment_amount),
        down_payment_type: service.down_payment_type,
        estimated_duration_minutes: service.estimated_duration_minutes == null ? "" : String(service.estimated_duration_minutes),
        icon_name: service.icon_name ?? "",
        badge_text: service.badge_text ?? "",
        is_active: service.is_active,
        is_featured: service.is_featured,
      });
    } else if (creating) {
      setForm({
        name: "", slug: "", description: "", base_price: "", down_payment_amount: "",
        down_payment_type: "fixed", estimated_duration_minutes: "", icon_name: "", badge_text: "",
        is_active: true, is_featured: false,
      });
    }
  }, [service, creating]);

  const busy = mutations.createService.isPending || mutations.updateService.isPending;
  const slugOk = /^[a-z0-9-]+$/.test(form.slug.trim());
  const valid = form.name.trim() !== "" && slugOk && form.description.trim() !== "" &&
    form.base_price !== "" && Number(form.base_price) >= 0 &&
    form.down_payment_amount !== "" && Number(form.down_payment_amount) >= 0;

  const submit = async () => {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      base_price: Number(form.base_price),
      down_payment_amount: Number(form.down_payment_amount),
      down_payment_type: form.down_payment_type,
      estimated_duration_minutes: form.estimated_duration_minutes === "" ? null : Number(form.estimated_duration_minutes),
      icon_name: form.icon_name.trim() || null,
      badge_text: form.badge_text.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
    };
    try {
      if (creating) {
        await mutations.createService.mutateAsync(payload);
        toast.success("Service created.");
      } else if (service) {
        const { slug: _slug, ...rest } = payload;
        await mutations.updateService.mutateAsync({ id: service.id, payload: rest });
        toast.success("Service saved.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save service.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent label={creating ? "Add service" : "Edit service"} side="right" onClose={onClose} className="w-[440px] max-w-[94vw] p-0">
        <DrawerHeader title={creating ? "Add service" : "Edit service"} onClose={onClose} />
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug {creating ? "*" : "(locked after creation)"}</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={busy || !creating} placeholder="ac-repair" className="font-technical" aria-invalid={form.slug !== "" && !slugOk} />
            {form.slug !== "" && !slugOk && <p role="alert" className="text-sm text-error-600">Lowercase letters, numbers, dashes only.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Base price (₱) *</Label>
              <Input type="number" min={0} step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} disabled={busy} className="font-technical tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Down payment *</Label>
              <Input type="number" min={0} step="0.01" value={form.down_payment_amount} onChange={(e) => setForm({ ...form, down_payment_amount: e.target.value })} disabled={busy} className="font-technical tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Down type</Label>
              <select value={form.down_payment_type} onChange={(e) => setForm({ ...form, down_payment_type: e.target.value })} disabled={busy} className="min-h-[44px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary-600 focus:outline-none">
                <option value="fixed">Fixed amount</option>
                <option value="percentage">% of base</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={1} value={form.estimated_duration_minutes} onChange={(e) => setForm({ ...form, estimated_duration_minutes: e.target.value })} placeholder="Optional" disabled={busy} className="font-technical tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Icon name</Label>
              <Input value={form.icon_name} onChange={(e) => setForm({ ...form, icon_name: e.target.value })} placeholder="wrench" disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Badge</Label>
              <Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="Popular" disabled={busy} />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-sm font-medium text-gray-900">
              Active on public site
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} aria-label="Active on public site" />
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-sm font-medium text-gray-900">
              Featured
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} aria-label="Featured service" />
            </label>
          </div>
          <Button type="button" onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? "Saving…" : creating ? "Create service" : "Save changes"}
          </Button>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Brands -------------------------------- */

function BrandsPanel() {
  const brands = useAdminBrands();
  const mutations = useCatalogMutation();
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_partner: false, badge_text: "", is_active: true });

  useEffect(() => {
    const current = editing === "new" ? null : editing;
    if (current) {
      setForm({ name: current.name, slug: current.slug, description: current.description ?? "", is_partner: current.is_partner, badge_text: current.badge_text ?? "", is_active: current.is_active });
    } else if (editing === "new") {
      setForm({ name: "", slug: "", description: "", is_partner: false, badge_text: "", is_active: true });
    }
  }, [editing]);

  const busy = mutations.createBrand.isPending || mutations.updateBrand.isPending;
  const slugOk = /^[a-z0-9-]+$/.test(form.slug.trim());
  const valid = form.name.trim() !== "" && slugOk;

  const submit = async () => {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      is_partner: form.is_partner,
      badge_text: form.badge_text.trim() || null,
      is_active: form.is_active,
    };
    try {
      if (editing === "new") {
        await mutations.createBrand.mutateAsync(payload);
        toast.success("Brand created.");
      } else if (editing) {
        const { slug: _slug, ...rest } = payload;
        await mutations.updateBrand.mutateAsync({ id: editing.id, payload: rest });
        toast.success("Brand saved.");
      }
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save brand.");
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const removed = await toastMutation(() => mutations.deleteBrand.mutateAsync(confirmDelete.id), {
      success: "Brand deleted.",
      error: "Could not delete brand.",
    });
    if (removed === null) return;
    setConfirmDelete(null);
  };

  const open = editing !== null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {brands.data ? `${brands.data.length} ${brands.data.length === 1 ? "brand" : "brands"}` : "Loading brands…"}
        </p>
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden="true" data-icon="inline-start" /> Add brand
        </Button>
      </div>
      {brands.isLoading && !brands.data && (
        <div aria-busy="true" aria-label="Loading brands">{[0, 1].map((i) => (<CardSkeleton key={i} />))}</div>
      )}
      {brands.isError && (
        <ErrorCard message={brands.error instanceof Error ? brands.error.message : "Could not load brands."} onRetry={() => void brands.refetch()} />
      )}
      {brands.data && brands.data.length === 0 && (
        <EmptyState title="No brands" description="Add the first brand to offer it in bookings." actionLabel="Add brand" onAction={() => setEditing("new")} />
      )}
      {(brands.data ?? []).map((b) => (
        <Card key={b.id}>
          <CardContent>
            <div className="flex flex-wrap items-start gap-3 pt-6">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {b.name}
                  {b.is_partner && <Badge variant="default">Official partner</Badge>}
                  {b.badge_text && !b.is_partner && <Badge variant="info">{b.badge_text}</Badge>}
                  {!b.is_active && <Badge variant="secondary">Inactive</Badge>}
                </p>
                <p className="mt-0.5 truncate font-technical text-xs tabular-nums text-gray-600">{b.slug}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(b)}>Edit</Button>
                <Button type="button" variant="destructiveOutline" size="sm" onClick={() => setConfirmDelete(b)}>Delete</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Sheet open={open} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <SheetContent label={editing === "new" ? "Add brand" : "Edit brand"} side="right" onClose={() => setEditing(null)} className="w-[400px] max-w-[92vw] p-0">
          <DrawerHeader title={editing === "new" ? "Add brand" : "Edit brand"} onClose={() => setEditing(null)} />
          <div className="thin-scroll flex-1 overflow-y-auto p-6">
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Slug {editing === "new" ? "*" : "(locked after creation)"}</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={busy || editing !== "new"} placeholder="daikin" className="font-technical" aria-invalid={form.slug !== "" && !slugOk} />
              {form.slug !== "" && !slugOk && <p role="alert" className="text-sm text-error-600">Lowercase letters, numbers, dashes only.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Badge</Label>
              <Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="Official Partner" disabled={busy} />
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-sm font-medium text-gray-900">
                Official partner
                <Switch checked={form.is_partner} onCheckedChange={(v) => setForm({ ...form, is_partner: v })} aria-label="Official partner" />
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-sm font-medium text-gray-900">
                Active in bookings
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} aria-label="Active in bookings" />
              </label>
            </div>
            <Button type="button" onClick={() => void submit()} disabled={!valid || busy}>
              {busy ? "Saving…" : editing === "new" ? "Create brand" : "Save changes"}
            </Button>
          </div>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        spec={confirmDelete ? {
          title: "Delete this brand?",
          body: `“${confirmDelete.name}” will disappear from booking options. Existing bookings keep their snapshot.`,
          confirmLabel: "Delete",
          destructive: true,
          onConfirm: () => void remove(),
        } : null}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
