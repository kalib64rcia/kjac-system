import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  label,
  onClose,
  side = "left",
  overlayClassName,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  label: string;
  onClose?: () => void;
  side?: "left" | "right";
  overlayClassName?: string;
}) {
  const hasCustomTop = className?.includes("top-");
  const hasCustomOverlayTop = overlayClassName?.includes("top-");

  const sideClasses =
    side === "right"
      ? cn(
          !hasCustomTop && "inset-y-0",
          "right-0 data-[state=open]:animate-drawer-right data-[state=closed]:animate-drawer-right-out",
        )
      : "inset-y-0 left-0 data-[state=open]:animate-drawer-in";

  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className={cn(
          "fixed z-[70] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in",
          hasCustomOverlayTop ? "inset-x-0 bottom-0" : "inset-0",
          overlayClassName,
        )}
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        aria-label={label}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose ? () => onClose() : undefined}
        className={cn(
          "thin-scroll fixed z-[70] flex w-[86%] max-w-[360px] flex-col overflow-y-auto overscroll-contain bg-white shadow-xl",
          sideClasses,
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/** In-flow close button: render as the LAST child of the drawer's header
 *  row (which must be items-center). Alignment is then structural — no
 *  absolute offsets to drift when header heights change. */
function SheetCloseButton({
  className,
  label = "Close menu",
  onClose,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close> & {
  label?: string;
  onClose?: () => void;
}) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close-button"
      aria-label={label}
      onClick={onClose}
      className={cn(
        "ml-auto flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100",
        className,
      )}
      {...props}
    >
      <X size={20} aria-hidden="true" />
    </SheetPrimitive.Close>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-gray-900", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-gray-600", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetCloseButton,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
