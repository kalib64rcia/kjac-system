import { Button } from "@/components/ui/button";

/** Sticky tab-level actions. Enabled only when the active tab is dirty. */
export function TabGlobalActions({
  dirtyCount,
  saving,
  onSaveAll,
  onResetAll,
}: {
  dirtyCount: number;
  saving: boolean;
  onSaveAll: () => void;
  onResetAll: () => void;
}) {
  const dirty = dirtyCount > 0;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-center text-xs text-gray-600 sm:mr-auto sm:text-left" aria-live="polite">
          {dirty
            ? `* ${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"} in this tab`
            : "No unsaved changes"}
        </p>
        <Button type="button" variant="outline" onClick={onResetAll} disabled={!dirty || saving}>
          Reset All
        </Button>
        <Button type="button" onClick={onSaveAll} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
