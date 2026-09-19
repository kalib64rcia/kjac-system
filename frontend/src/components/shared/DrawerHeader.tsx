import { SheetCloseButton, SheetTitle } from "@/components/ui/sheet";

/** Standard drawer header: title left, X close last (44px target).
 *  Renders as the first child of SheetContent (content drawers open right). */
export function DrawerHeader({ title, onClose, sub, action }: {
  title: React.ReactNode;
  onClose: () => void;
  sub?: React.ReactNode;
  /** Optional node between title and close (e.g. a status badge). */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-6 py-4">
      <div className="min-w-0 flex-1">
        <SheetTitle className="truncate text-lg font-semibold text-gray-900">{title}</SheetTitle>
        {sub && <div className="mt-0.5 text-sm text-gray-600">{sub}</div>}
      </div>
      {action}
      <SheetCloseButton onClose={onClose} label="Close panel" />
    </div>
  );
}
