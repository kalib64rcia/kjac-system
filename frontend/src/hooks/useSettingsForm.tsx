import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import type { AdminSetting } from "@/types/booking.types";
import { toast } from "@/stores/toast.store";
import { officeKeys, usePatchSetting } from "./useOffice";
import {
  FAQ_ITEMS_KEY,
  HOURS_KEYS,
  HOURS_LEGACY_KEY,
  SECTIONS,
  SHOW_FAQ_KEY,
  labelFor,
  type SectionDef,
  type SettingsTabId,
} from "@/components/office/settings/settingsConfig";
import {
  composeHoursPreview,
  parseDays,
} from "@/components/office/settings/BusinessHoursField";

function short(v: string | undefined, max = 42): string {
  const s = (v ?? "—").trim() || "(empty)";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Tab-scoped form state over AdminSetting rows.
 *
 *  drafts hold edits; snapshot is the last server state. Dirty = differs.
 *  Saves PATCH dirty keys one by one (no batch endpoint); resets only
 *  discard local edits back to the snapshot (never any API call).
 */
export function useSettingsForm(rows: AdminSetting[] | undefined) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<SettingsTabId>("public");
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [saving, setSaving] = useState(false);
  const patch = usePatchSetting();
  const qc = useQueryClient();

  const snapshot = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rows ?? []) m[r.setting_key] = r.setting_value;
    return m;
  }, [rows]);

  const byKey = useMemo(() => {
    const m = new Map<string, AdminSetting>();
    for (const r of rows ?? []) m.set(r.setting_key, r);
    return m;
  }, [rows]);

  // Seed drafts once per key; later refetches only move the snapshot,
  // so saved keys go clean and failed keys stay dirty for retry.
  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const r of rows) {
        if (!(r.setting_key in next)) {
          next[r.setting_key] = r.setting_value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const draftOf = (key: string): string => drafts[key] ?? snapshot[key] ?? "";
  const setDraft = (key: string, value: string) =>
    setDrafts((p) => ({ ...p, [key]: value }));

  const sectionKeys = (s: SectionDef): string[] => {
    if (s.custom === "hours") return [...HOURS_KEYS, HOURS_LEGACY_KEY];
    if (s.custom === "faq") return [FAQ_ITEMS_KEY, SHOW_FAQ_KEY];
    return s.keys;
  };

  const tabKeys = (tab: SettingsTabId): string[] =>
    SECTIONS.filter((s) => s.tab === tab).flatMap(sectionKeys);

  /** Keys with a server row whose effective value differs. */
  const dirtyOf = (keys: string[], overrides?: Record<string, string>): string[] =>
    keys.filter(
      (k) =>
        k in snapshot &&
        (overrides?.[k] ?? draftOf(k)) !== snapshot[k],
    );

  const isSectionDirty = (s: SectionDef) => dirtyOf(sectionKeys(s)).length > 0;
  const isTabDirty = (tab: SettingsTabId) => dirtyOf(tabKeys(tab)).length > 0;
  const tabDirtyCount = (tab: SettingsTabId) => dirtyOf(tabKeys(tab)).length;

  const resetKeys = (keys: string[]) =>
    setDrafts((p) => {
      const next = { ...p };
      for (const k of keys) {
        if (k in snapshot) next[k] = snapshot[k];
        else delete next[k];
      }
      return next;
    });

  /** Legacy display string the contact page still reads. */
  const hoursOverride = (): Record<string, string> => ({
    [HOURS_LEGACY_KEY]: composeHoursPreview(
      parseDays(draftOf(HOURS_KEYS[0])),
      draftOf(HOURS_KEYS[1]) || "08:00",
      draftOf(HOURS_KEYS[2]) || "17:00",
    ),
  });

  const saveKeys = async (keys: string[], overrides?: Record<string, string>) => {
    const valid: string[] = [];
    for (const k of keys) {
      const row = byKey.get(k);
      if (!row || !row.is_editable) continue;
      const v = overrides?.[k] ?? draftOf(k);
      if (row.data_type === "integer" && !/^-?\d+$/.test(v.trim())) {
        toast.error("Invalid value.", `${labelFor(k)} must be a whole number.`);
        continue;
      }
      if (row.data_type === "json") {
        try {
          JSON.parse(v);
        } catch {
          toast.error("Invalid value.", `${labelFor(k)} must be valid JSON.`);
          continue;
        }
      }
      if (row.data_type === "string" && v.trim() === "" && k !== "contact_phone_secondary" && k !== "mission_text" && k !== "vision_text" && k !== "gcash_account_name") {
        toast.error("Invalid value.", `${labelFor(k)} cannot be empty.`);
        continue;
      }
      valid.push(k);
    }
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        valid.map((k) => patch.mutateAsync({ key: k, value: overrides?.[k] ?? draftOf(k) })),
      );
      // Sync drafts only for keys the server accepted.
      setDrafts((p) => {
        const next = { ...p };
        valid.forEach((k, i) => {
          if (results[i].status === "fulfilled") next[k] = overrides?.[k] ?? draftOf(k);
        });
        return next;
      });
      await qc.invalidateQueries({ queryKey: officeKeys.adminSettings });
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (fail === 0) {
        toast.success("Settings saved.", `${ok} change${ok === 1 ? "" : "s"} applied.`);
      } else if (ok === 0) {
        toast.error("Could not save settings.");
      } else {
        toast.warning("Partially saved.", `${ok} saved · ${fail} failed. Failed entries kept for retry.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const diffBody = (keys: string[], overrides?: Record<string, string>) => (
    <ul className="mt-1 flex flex-col gap-1">
      {keys.map((k) => (
        <li key={k} className="font-technical text-[13px] tabular-nums">
          {labelFor(k)}: {short(snapshot[k])} → {short(overrides?.[k] ?? draftOf(k))}
        </li>
      ))}
    </ul>
  );

  const askSaveKeys = (title: string, keys: string[], overrides?: Record<string, string>) => {
    const dirty = dirtyOf(keys, overrides);
    if (dirty.length === 0) return;
    setConfirm({
      title,
      body: diffBody(dirty, overrides),
      confirmLabel: "Save changes",
      onConfirm: () => saveKeys(dirty, overrides),
    });
  };

  const askResetKeys = (title: string, keys: string[]) => {
    const dirty = dirtyOf(keys);
    if (dirty.length === 0) return;
    setConfirm({
      title,
      body: `Discard ${dirty.length} unsaved change${dirty.length === 1 ? "" : "s"}? Values return to the last saved state. Nothing is written.`,
      confirmLabel: "Discard changes",
      onConfirm: () => resetKeys(dirty),
    });
  };

  const askSaveSection = (s: SectionDef) =>
    askSaveKeys(
      `Save ${s.title}?`,
      sectionKeys(s),
      s.id === "hours" ? hoursOverride() : undefined,
    );
  const askResetSection = (s: SectionDef) =>
    askResetKeys(`Discard changes in ${s.title}?`, sectionKeys(s));
  const askSaveTab = (tab: SettingsTabId) => {
    const label = tab === "public" ? "Public" : tab === "operations" ? "Operations" : "System";
    askSaveKeys(`Save all changes in ${label}?`, tabKeys(tab), tab === "public" ? hoursOverride() : undefined);
  };
  const askResetTab = (tab: SettingsTabId) => {
    const label = tab === "public" ? "Public" : tab === "operations" ? "Operations" : "System";
    askResetKeys(`Discard all changes in ${label}?`, tabKeys(tab));
  };

  // Sunday toggle (Operations) is only meaningful when Sunday is in hours.
  const hoursLoaded = HOURS_KEYS[0] in snapshot;
  const sundayInHours = hoursLoaded ? parseDays(draftOf(HOURS_KEYS[0]))[6] : true;

  return {
    activeTab,
    setActiveTab,
    confirm,
    closeConfirm: () => setConfirm(null),
    saving,
    byKey,
    draftOf,
    setDraft,
    sectionKeys,
    tabKeys,
    isSectionDirty,
    isTabDirty,
    tabDirtyCount,
    askSaveSection,
    askResetSection,
    askSaveTab,
    askResetTab,
    sundayInHours,
  };
}
