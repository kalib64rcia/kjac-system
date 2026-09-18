import { useEffect, useMemo, useState } from "react";
import { Lock, Play } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/api/errors";
import type { AdminSetting } from "@/types/booking.types";
import { useAdminSettings, usePatchSetting, useReminderRun } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";

const GROUP_ORDER = ["booking", "payment", "rate_limiting", "auth", "business", "system"];

function groupTitle(category: string | null): string {
  switch (category) {
    case "booking": return "Booking";
    case "payment": return "Payments (GCash)";
    case "rate_limiting": return "Rate limits";
    case "auth": return "Sessions & login";
    case "business": return "Business info";
    case "system": return "System";
    default: return category ? category.charAt(0).toUpperCase() + category.slice(1) : "Other";
  }
}

function parseBool(value: string): boolean {
  return value.toLowerCase() === "true" || value === "1";
}

/** Settings board: owner-only. Every row PATCHes one key (type-coerced server-side). */
export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const settings = useAdminSettings(user?.role === "owner");
  const patch = usePatchSetting();
  const reminders = useReminderRun();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) {
      setDrafts((prev) => {
        const next = { ...prev };
        for (const s of settings.data ?? []) {
          if (!(s.setting_key in next)) next[s.setting_key] = s.setting_value;
        }
        return next;
      });
    }
  }, [settings.data]);

  const groups = useMemo(() => {
    const items = settings.data ?? [];
    const byCat = new Map<string, AdminSetting[]>();
    for (const s of items) {
      const cat = s.category ?? "other";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)?.push(s);
    }
    const cats = [...byCat.keys()].sort(
      (a, b) => (GROUP_ORDER.indexOf(a) === -1 ? 99 : GROUP_ORDER.indexOf(a)) - (GROUP_ORDER.indexOf(b) === -1 ? 99 : GROUP_ORDER.indexOf(b)),
    );
    return cats.map((cat) => ({ cat, items: byCat.get(cat) ?? [] }));
  }, [settings.data]);

  const save = async (key: string) => {
    setSavingKey(key);
    try {
      await patch.mutateAsync({ key, value: drafts[key] ?? "" });
      toast.success("Setting saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save setting.");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleBool = async (row: AdminSetting, checked: boolean) => {
    const value = checked ? "true" : "false";
    setDrafts((d) => ({ ...d, [row.setting_key]: value }));
    setSavingKey(row.setting_key);
    try {
      await patch.mutateAsync({ key: row.setting_key, value });
      toast.success("Setting saved.");
    } catch (err) {
      setDrafts((d) => ({ ...d, [row.setting_key]: row.setting_value }));
      toast.error(err instanceof ApiError ? err.message : "Could not save setting.");
    } finally {
      setSavingKey(null);
    }
  };

  const runReminders = async () => {
    try {
      const result = await reminders.mutateAsync();
      toast.success("Reminders sent.", `${result.tomorrow_sent ?? 0} upcoming · ${result.payment_sent ?? 0} expiring.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not run reminders.");
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Settings" description="Business rules, GCash details, and limits. Owner only — changes apply immediately." />
      {settings.isLoading && !settings.data && (
        <div aria-busy="true" aria-label="Loading settings">{[0, 1].map((i) => (<CardSkeleton key={i} />))}</div>
      )}
      {settings.isError && (
        <ErrorCard message={settings.error instanceof Error ? settings.error.message : "Could not load settings."} onRetry={() => void settings.refetch()} />
      )}
      {settings.data && settings.data.length === 0 && (
        <EmptyState title="No settings found" description="The settings table is empty. Contact support." />
      )}
      {(settings.data ?? []).length > 0 && (
        <div className="flex min-w-0 flex-col gap-4">
          {groups.map(({ cat, items }) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>{groupTitle(cat)}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-gray-100">
                  {items.map((row) => (
                    <SettingRow
                      key={row.setting_key}
                      row={row}
                      draft={drafts[row.setting_key] ?? row.setting_value}
                      saving={savingKey === row.setting_key}
                      onDraft={(v) => setDrafts((d) => ({ ...d, [row.setting_key]: v }))}
                      onSave={() => void save(row.setting_key)}
                      onToggle={(v) => void toggleBool(row, v)}
                    />
                  ))}
                </ul>
                {cat === "booking" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">Guest reminders</p>
                      <p className="text-xs text-gray-600">One manual pass: tomorrow&apos;s bookings + payments expiring within 2 hours. Never resends.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void runReminders()} disabled={reminders.isPending}>
                      <Play size={16} aria-hidden="true" data-icon="inline-start" />
                      {reminders.isPending ? "Running…" : "Run now"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({ row, draft, saving, onDraft, onSave, onToggle }: {
  row: AdminSetting;
  draft: string;
  saving: boolean;
  onDraft: (v: string) => void;
  onSave: () => void;
  onToggle: (v: boolean) => void;
}) {
  const dirty = draft !== row.setting_value;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-technical text-sm font-semibold tabular-nums text-gray-900">{row.setting_key}</p>
        {row.description && <p className="mt-0.5 text-xs text-gray-600">{row.description}</p>}
        {!row.is_editable && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-600">
            <Lock size={12} aria-hidden="true" /> Locked by the system
          </p>
        )}
      </div>
      {row.is_editable ? (
        <div className="flex shrink-0 items-center gap-2">
          {row.data_type === "boolean" ? (
            <Switch checked={parseBool(draft)} onCheckedChange={onToggle} aria-label={row.setting_key} />
          ) : (
            <>
              <Label htmlFor={`setting-${row.setting_key}`} className="sr-only">{row.setting_key}</Label>
              <Input
                id={`setting-${row.setting_key}`}
                value={draft}
                inputMode={row.data_type === "integer" ? "numeric" : undefined}
                onChange={(e) => onDraft(e.target.value)}
                className="w-44 font-technical tabular-nums"
              />
              <Button type="button" size="sm" onClick={onSave} disabled={!dirty || saving || draft.trim() === ""}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <p className="shrink-0 font-technical text-sm tabular-nums text-gray-600">{row.setting_value}</p>
      )}
    </li>
  );
}
