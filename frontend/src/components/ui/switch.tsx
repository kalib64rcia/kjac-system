import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Accessible toggle switch (button + aria-checked) in KJAC tokens.
 *  Track: primary-400 on, gray-300 off. Thumb slides. 44px hit area. */
export function Switch({ checked, onCheckedChange, disabled = false, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary-500" : "bg-gray-300",
      )}
      style={{ minHeight: 24, minWidth: 44 }}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
