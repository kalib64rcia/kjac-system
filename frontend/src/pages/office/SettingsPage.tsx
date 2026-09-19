import { useMemo } from "react";
import {
  Activity,
  Archive,
  BellRing,
  CalendarCheck,
  Clock3,
  Compass,
  Gauge,
  KeyRound,
  MessageCircle,
  Phone,
  Play,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/api/errors";
import { useAdminSettings, useReminderRun } from "@/hooks/useOffice";
import { useSettingsForm } from "@/hooks/useSettingsForm";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import { SettingField } from "@/components/office/settings/SettingField";
import { SettingSection } from "@/components/office/settings/SettingSection";
import { SettingsTabs } from "@/components/office/settings/SettingsTabs";
import { TabGlobalActions } from "@/components/office/settings/TabGlobalActions";
import { BusinessHoursField } from "@/components/office/settings/BusinessHoursField";
import { FAQSection } from "@/components/office/settings/FAQSection";
import {
  FAQ_ITEMS_KEY,
  HOURS_KEYS,
  LONG_TEXT_KEYS,
  SECTIONS,
  SHOW_FAQ_KEY,
  SUNDAY_KEY,
  type SectionDef,
} from "@/components/office/settings/settingsConfig";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  contact: Phone,
  hours: Clock3,
  mission: Compass,
  faq: MessageCircle,
  booking: CalendarCheck,
  payment: Wallet,
  bookingRate: Gauge,
  reminders: BellRing,
  session: KeyRound,
  apiLimits: Activity,
  archive: Archive,
};

/** Settings board: owner-only. Tabbed sections with section-level and
 *  tab-level save/reset. Every save PATCHes keys into system_settings,
 *  so public pages pick values up from the database. */
export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const settings = useAdminSettings(user?.role === "owner");
  const reminders = useReminderRun();
  const form = useSettingsForm(settings.data);

  const sections = useMemo(
    () => SECTIONS.filter((s) => s.tab === form.activeTab),
    [form.activeTab],
  );

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
      <PageHeader title="Settings" description="Public site content, booking rules, and limits. Owner only." />
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
          <SettingsTabs active={form.activeTab} onChange={form.setActiveTab} isDirty={form.isTabDirty} />
          {sections.map((s) => (
            <SectionCard key={s.id} def={s} form={form} onRunReminders={() => void runReminders()} runBusy={reminders.isPending} />
          ))}
          <TabGlobalActions
            dirtyCount={form.tabDirtyCount(form.activeTab)}
            saving={form.saving}
            onSaveAll={() => form.askSaveTab(form.activeTab)}
            onResetAll={() => form.askResetTab(form.activeTab)}
          />
        </div>
      )}
      <ConfirmDialog spec={form.confirm} onClose={form.closeConfirm} />
    </div>
  );
}

type Form = ReturnType<typeof useSettingsForm>;

function SectionCard({ def, form, onRunReminders, runBusy }: {
  def: SectionDef;
  form: Form;
  onRunReminders: () => void;
  runBusy: boolean;
}) {
  const Icon = SECTION_ICONS[def.id] ?? Phone;
  const dirty = form.isSectionDirty(def);

  if (def.custom === "hours") {
    const missing = HOURS_KEYS.some((k) => !form.byKey.has(k));
    return (
      <SettingSection
        icon={<Icon size={18} />}
        title={def.title}
        dirty={dirty}
        saving={form.saving}
        onSave={() => form.askSaveSection(def)}
        onReset={() => form.askResetSection(def)}
      >
        {missing ? (
          <p className="text-sm text-gray-600">Business-hours settings are being provisioned. Reload after the update.</p>
        ) : (
          <BusinessHoursField
            daysValue={form.draftOf(HOURS_KEYS[0])}
            openValue={form.draftOf(HOURS_KEYS[1])}
            closeValue={form.draftOf(HOURS_KEYS[2])}
            onChange={(p) => {
              if (p.days !== undefined) form.setDraft(HOURS_KEYS[0], p.days);
              if (p.open !== undefined) form.setDraft(HOURS_KEYS[1], p.open);
              if (p.close !== undefined) form.setDraft(HOURS_KEYS[2], p.close);
            }}
            disabled={form.saving}
          />
        )}
      </SettingSection>
    );
  }

  if (def.custom === "faq") {
    const itemsRow = form.byKey.get(FAQ_ITEMS_KEY);
    const showRow = form.byKey.get(SHOW_FAQ_KEY);
    if (!itemsRow) return null;
    return (
      <SettingSection
        icon={<Icon size={18} />}
        title={def.title}
        dirty={dirty}
        saving={form.saving}
        saveLabel="Save All FAQs"
        onSave={() => form.askSaveSection(def)}
        onReset={() => form.askResetSection(def)}
      >
        <FAQSection
          value={form.draftOf(FAQ_ITEMS_KEY)}
          onChange={(v) => form.setDraft(FAQ_ITEMS_KEY, v)}
          showValue={form.draftOf(SHOW_FAQ_KEY) === "true"}
          onShowChange={(v) => showRow && form.setDraft(SHOW_FAQ_KEY, v ? "true" : "false")}
          disabled={form.saving}
        />
      </SettingSection>
    );
  }

  const fields = def.keys
    .map((k) => form.byKey.get(k))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);
  if (fields.length === 0) return null;

  return (
    <SettingSection
      icon={<Icon size={18} />}
      title={def.title}
      dirty={dirty}
      saving={form.saving}
      onSave={() => form.askSaveSection(def)}
      onReset={() => form.askResetSection(def)}
      extra={def.id === "reminders" ? (
        <Button type="button" variant="outline" size="sm" onClick={onRunReminders} disabled={runBusy} className="sm:mr-auto">
          <Play size={16} aria-hidden="true" data-icon="inline-start" />
          {runBusy ? "Running…" : "Run now"}
        </Button>
      ) : undefined}
    >
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {fields.map((row) => {
          const sundayLocked = row.setting_key === SUNDAY_KEY && !form.sundayInHours;
          const wide = row.data_type === "boolean" || LONG_TEXT_KEYS.has(row.setting_key) || row.setting_key === "contact_address";
          return (
            <div key={row.setting_key} className={cn(wide && "sm:col-span-2")}>
              <SettingField
                row={row}
                value={form.draftOf(row.setting_key)}
                onChange={(v) => form.setDraft(row.setting_key, v)}
                disabled={form.saving || sundayLocked}
              />
              {sundayLocked && (
                <p className="mt-1 text-xs text-gray-600">Enable Sunday in Business Hours first.</p>
              )}
            </div>
          );
        })}
      </div>
    </SettingSection>
  );
}
