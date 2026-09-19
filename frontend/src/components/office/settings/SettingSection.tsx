import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Section card: icon + title header, fields, dirty-gated footer actions. */
export function SettingSection({
  icon,
  title,
  dirty,
  saving,
  onSave,
  onReset,
  saveLabel = "Save Changes",
  extra,
  children,
}: {
  icon: ReactNode;
  title: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-gray-500" aria-hidden="true">{icon}</span>
          {title}
          {dirty && (
            <span className="ml-1 inline-block size-2 rounded-full bg-warning-500" aria-label="Unsaved changes" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {extra}
          <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={!dirty || saving}>
            Reset
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
