import { TABS, type SettingsTabId } from "./settingsConfig";
import { cn } from "@/lib/utils";

/** Tab buttons with per-tab dirty dots. Drafts live above tabs, so
 *  switching never loses edits. */
export function SettingsTabs({
  active,
  onChange,
  isDirty,
}: {
  active: SettingsTabId;
  onChange: (t: SettingsTabId) => void;
  isDirty: (t: SettingsTabId) => boolean;
}) {
  return (
    <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {TABS.map((t) => {
        const selected = t.id === active;
        const dirty = isDirty(t.id);
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 px-4 text-sm font-semibold outline-none transition-colors",
              selected ? "text-primary-700" : "text-gray-600 hover:text-gray-900",
            )}
          >
            {t.label.toUpperCase()}
            {dirty && (
              <span className="inline-block size-1.5 rounded-full bg-warning-500" aria-label="Unsaved changes" />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full",
                selected ? "bg-primary-600" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
