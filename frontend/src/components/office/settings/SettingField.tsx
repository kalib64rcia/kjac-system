import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label, FieldError, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AdminSetting } from "@/types/booking.types";
import { LONG_TEXT_KEYS, helperFor, labelFor } from "./settingsConfig";
import { cn } from "@/lib/utils";

function parseBool(value: string): boolean {
  return value.toLowerCase() === "true" || value === "1";
}

/** One setting row: label + control + one-line helper. No API calls inside. */
export function SettingField({
  row,
  value,
  onChange,
  disabled = false,
  error,
  className,
}: {
  row: AdminSetting;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}) {
  const id = `setting-${row.setting_key}`;
  const label = labelFor(row.setting_key);
  const helper = helperFor(row.setting_key);
  const locked = !row.is_editable;
  const off = disabled || locked;

  if (row.data_type === "boolean") {
    return (
      <div className={cn("flex items-start justify-between gap-4", className)}>
        <div className="min-w-0">
          <Label id={`${id}-label`}>{label}</Label>
          {helper && <p className="mt-0.5 text-xs text-gray-600">{helper}</p>}
          {locked && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-600">
              <Lock size={12} aria-hidden="true" /> Locked
            </p>
          )}
        </div>
        <Switch
          checked={parseBool(value)}
          onCheckedChange={(v) => onChange(v ? "true" : "false")}
          disabled={off}
          aria-labelledby={`${id}-label`}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {row.data_type === "integer" ? (
        <Input
          id={id}
          value={value}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value)}
          disabled={off}
          aria-invalid={!!error}
          className="w-32 font-technical tabular-nums"
        />
      ) : LONG_TEXT_KEYS.has(row.setting_key) ? (
        <Textarea
          id={id}
          rows={4}
          maxLength={2000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={off}
          aria-invalid={!!error}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={off}
          aria-invalid={!!error}
          className="w-full"
        />
      )}
      <FieldError message={error} />
      {helper && <p className="mt-1 text-xs text-gray-600">{helper}</p>}
      {locked && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-600">
          <Lock size={12} aria-hidden="true" /> Locked
        </p>
      )}
    </div>
  );
}
