import { useRef } from "react";

/**
 * Reusable hook for managing form drafts in localStorage.
 * 
 * Provides draft loading, meaningful data detection, and automatic toast handling
 * for any form shape. Works with BookingFormValues, TrackFormValues, or any generic form type.
 * 
 * @template T - The shape of the form data (e.g., BookingFormValues, TrackFormValues)
 * @param storageKey - The localStorage key to persist drafts under (e.g., 'kjac-book-draft')
 * @param defaults - Default values to merge with loaded draft data
 * @param checkMeaningful - Optional predicate to determine if loaded data is meaningful.
 *                         Receives the loaded draft and returns true if it should trigger restore.
 *                         If not provided, defaults to checking if any field differs from defaults.
 * @returns Object with draft utilities:
 *   - loadDraft() - Loads from localStorage and merges with defaults
 *   - hasMeaningfulData() - Checks if the loaded draft has meaningful data
 *   - draftToastShown - Ref to track if restore toast was shown (prevents duplicate toasts)
 * 
 * @example
 * // In BookingForm
 * const { loadDraft, hasMeaningfulData, draftToastShown } = useLocalStorageDraft(
 *   'kjac-book-draft',
 *   DEFAULTS,
 *   (data) => !!(data.customer_first_name?.trim() || data.service_id || ...)
 * );
 * 
 * // In form initialization
 * const form = useForm<BookingFormValues>({
 *   resolver: zodResolver(bookingSchema),
 *   defaultValues: loadDraft(),
 * });
 * 
 * // In an effect to show toast
 * useEffect(() => {
 *   try {
 *     if (!draftToastShown.current && hasMeaningfulData()) {
 *       draftToastShown.current = true;
 *       toast.info("Draft restored", "Your unfinished booking was restored.");
 *     }
 *   } catch {}
 * }, []);
 */
export function useLocalStorageDraft<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
  checkMeaningful?: (data: Partial<T>) => boolean
) {
  const lastLoadedRef = useRef<Partial<T> | null>(null);
  const draftToastShown = useRef(false);

  /**
   * Loads draft from localStorage and merges with defaults.
   * Returns defaults if localStorage is empty or parsing fails.
   */
  function loadDraft(): T {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        lastLoadedRef.current = null;
        return defaults;
      }

      const draft = JSON.parse(raw) as Partial<T>;
      lastLoadedRef.current = draft;
      return { ...defaults, ...draft };
    } catch {
      lastLoadedRef.current = null;
      return defaults;
    }
  }

  /**
   * Checks if the loaded draft has meaningful data.
   * Uses custom predicate if provided, otherwise checks if any field differs from defaults.
   */
  function hasMeaningfulData(): boolean {
    try {
      if (lastLoadedRef.current === null) {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        lastLoadedRef.current = JSON.parse(raw) as Partial<T>;
      }

      const draft = lastLoadedRef.current;
      if (!draft) return false;

      // If custom predicate provided, use it
      if (checkMeaningful) {
        return checkMeaningful(draft);
      }

      // Default: check if any field differs from defaults
      for (const key in draft) {
        if (key in defaults && draft[key] !== defaults[key]) {
          // For strings, also check non-empty
          if (typeof draft[key] === "string") {
            if ((draft[key] as string).trim()) return true;
          } else {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  return {
    loadDraft,
    hasMeaningfulData,
    draftToastShown,
  };
}
