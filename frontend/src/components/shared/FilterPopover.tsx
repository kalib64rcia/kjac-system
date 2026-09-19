import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  name: string;
}

/** Rows-per-page choices (both backends cap lists at 100). */
export const ROW_OPTIONS = [10, 20, 50, 100];

/** Hold the keystroke; the server searches the whole trail, not just the page. */
export function useDebouncedValue(value: string, delayMs: number): string {
  const [held, setHeld] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setHeld(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return held;
}

/** Slim refetch bar pinned to the top of a table shell (rows stay full
 *  strength — no pale flash; shimmer skeletons own first loads only). */
export function TableLoadingBar({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      className="absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden rounded-t-lg bg-transparent"
    >
      <div className="h-full w-full animate-pulse bg-primary-400/70" />
    </div>
  );
}

/** Rows dropdown in the popover-trigger look (native select, custom chevron). */
export function RowsSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-600">
      Rows
      <span className="relative inline-flex items-center">
        <select
          value={String(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Rows per page"
          className="min-h-[44px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-base text-gray-900 transition-colors hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
        >
          {ROW_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 shrink-0 text-gray-500"
        />
      </span>
    </label>
  );
}

/** Sortable table header button (server-driven; arrows mirror Bookings). */
export function SortHeaderButton({
  label,
  active,
  ascending,
  onSort,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onSort: () => void;
}) {
  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onSort}
      aria-label={`Sort by ${label}`}
      className="inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-gray-900"
    >
      {label}
      <Icon
        size={14}
        aria-hidden="true"
        className={active ? "text-primary-600" : "text-gray-400"}
      />
    </button>
  );
}

/** Searchable dropdown from installed Popover + Input (no new deps).
 *  Radio-list rows reuse the assign-dialog pattern. Shared by office boards. */
export function FilterPopover({
  label,
  display,
  options,
  isLoading,
  value,
  onPick,
  id,
  disabled = false,
  fluid = false,
  allowClear = true,
}: {
  label: string;
  display: string;
  options: FilterOption[];
  isLoading: boolean;
  value: string;
  onPick: (v: string) => void;
  /** Form integration: forwarded to the trigger (Label htmlFor target). */
  id?: string;
  disabled?: boolean;
  /** Full-width trigger on sm+ (office filter rows default to w-44). */
  fluid?: boolean;
  /** Show the "All {label}" reset row. Off for required form fields. */
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = query ? options.filter((o) => o.name.toLowerCase().includes(query)) : options;
  const pick = (v: string) => {
    onPick(v);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          disabled={disabled}
          variant="outline"
          aria-label={`Filter by ${label}`}
          className={cn(
            "w-full justify-between border-gray-200 bg-white font-normal text-gray-900 hover:bg-white hover:text-gray-900 active:scale-100",
            fluid ? "sm:w-full" : "sm:w-44",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left" title={display}>{display}</span>
          {isLoading ? (
            <Loader2 size={16} aria-hidden="true" className="shrink-0 animate-spin text-gray-500" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-gray-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-60 p-1" align="start">
        <div className="p-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${label}…`}
            aria-label={`Search ${label}`}
            className="min-h-[40px]"
          />
        </div>
        <ScrollArea className="popover-list max-h-56" viewportClassName="h-auto max-h-56">
          <div className="p-1" role="listbox" aria-label={label}>
          {allowClear && (
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => pick("")}
            className={cn(
              "flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              value === ""
                ? "border-primary-600 bg-primary-50 text-gray-900"
                : "border-transparent text-gray-700 hover:bg-gray-50",
            )}
          >
            <span className="min-w-0 flex-1 truncate">All {label}</span>
            {value === "" && <Check size={16} aria-hidden="true" className="shrink-0 text-primary-600" />}
          </button>
          )}
          {isLoading && (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
              <Loader2 size={16} aria-hidden="true" className="shrink-0 animate-spin" />
              Loading…
            </p>
          )}
          {!isLoading && list.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">No matches.</p>
          )}
          {list.map((o) => {
            const picked = value === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={picked}
                onClick={() => pick(o.id)}
                className={cn(
                  "flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  picked
                    ? "border-primary-600 bg-primary-50 text-gray-900"
                    : "border-transparent text-gray-700 hover:bg-gray-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate" title={o.name}>{o.name}</span>
                {picked && <Check size={16} aria-hidden="true" className="shrink-0 text-primary-600" />}
              </button>
            );
          })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

/** Full-width search input with icon. One shared component — never
 *  hand-roll the search wrapper per page (placeholder/label stay per page). */
export function SearchField({ value, onChange, placeholder, label, title }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  title?: string;
}) {
  return (
    <div className="relative flex-1 sm:min-w-52">
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        title={title}
        className="pl-10"
      />
    </div>
  );
}

/** "Showing X of Y <noun>" + ghost Clear. Replaces the hand-rolled
 *  counter row on every list page. */
export function ResultCount({ shown, total, noun, nounPlural, isLoading, loadingLabel, filtersActive, onClear }: {
  shown: number;
  total?: number;
  noun: string;
  nounPlural?: string;
  isLoading: boolean;
  loadingLabel: string;
  filtersActive: boolean;
  onClear: () => void;
}) {
  const plural = nounPlural ?? `${noun}s`;
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-2">
      <p className="text-sm text-gray-600" role="status">
        {isLoading ? (
          loadingLabel
        ) : total === undefined ? (
          <><span className="font-semibold tabular-nums text-gray-900">{shown}</span> {shown === 1 ? noun : plural}</>
        ) : (
          <>Showing <span className="font-semibold tabular-nums text-gray-900">{shown}</span> of <span className="font-semibold tabular-nums text-gray-900">{total}</span> {total === 1 ? noun : plural}</>
        )}
      </p>
      {filtersActive && (<Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>)}
    </div>
  );
}

/** Rows-per-page + Page X of Y + Prev/Next. One shared footer —
 *  never hand-roll pagination per page. */
export function PaginationFooter({ page, pageCount, isFetching, onPrev, onNext, pageSize, onPageSize }: {
  page: number;
  pageCount: number;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize: number;
  onPageSize: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <RowsSelect value={pageSize} onChange={onPageSize} />
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <p className="text-sm text-gray-600">
          Page <span className="font-semibold tabular-nums text-gray-900">{page}</span> of <span className="font-semibold tabular-nums text-gray-900">{pageCount}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={onPrev} aria-label="Previous page">
            <ChevronLeft size={16} aria-hidden="true" /> Prev
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={page >= pageCount || isFetching} onClick={onNext} aria-label="Next page">
            Next <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** First-load skeleton stack. Shimmer owns first loads only —
 *  refetches use TableLoadingBar with rows at full strength. */
export function ListLoading({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <div aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Scrollable table container. One shared shell — never hand-roll the
 *  wrapper per page. Table width stays per page (content density differs). */
export function TableShell({ shadow = false, children }: { shadow?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white",
        shadow && "shadow-sm",
        "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&:hover::-webkit-scrollbar-track]:bg-transparent",
      )}
    >
      {children}
    </div>
  );
}

/** Shared table primitives — thead row, header cell, body row, body cell. */
export const THEAD_ROW = "border-b border-gray-200 bg-gray-50";
export const TH_CELL = "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500";
export const TR_ROW = "border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60";
export const TD_CELL = "min-w-0 px-3 py-2.5 align-middle";
export const TABLE_BASE = "w-full border-collapse text-left";
/** Toggle filter chip (switch + label in a bordered chip). One shared
 *  component — never hand-roll the chip per page. */
export function SwitchChip({ label, checked, onCheckedChange }: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900">
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      {label}
    </label>
  );
}
/** Segmented pill tabs for mutually-exclusive views under one header.
 *  One shared component — never hand-roll tab buttons per page. */
export function PillTabs<T extends string>({ label, options, value, onPick }: {
  label: string;
  options: { id: T; name: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label={label}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onPick(o.id)}
            className={cn(
              "min-h-[44px] cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-50",
            )}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
