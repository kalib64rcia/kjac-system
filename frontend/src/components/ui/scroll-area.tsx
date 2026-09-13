import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

/**
 * Canonical shadcn/new-york ScrollArea API (Radix primitives, data-* slots)
 * with the pill-and-groove aesthetic: pill thumb sliding in a whisper-light
 * pill groove (zero layout space), auto show/hide by Radix.
 *
 * Single fixed light scheme everywhere — groove `bg-gray-400/10`, slim 4px
 * bar `bg-gray-300/50`, identical idle and hover — so every scroller reads
 * the same on desktop and mobile. Ghost mode: the whole bar (groove + thumb)
 * fades in on hover/scroll (100ms ease-out) and melts away ~100ms after.
 * Dark/brand surfaces can override via `scrollbarClassName` if ever needed.
 *
 * Convention (locked): every contained scroll region uses this — never raw
 * overflow scrollbars. Exceptions: select/dropdown viewports (keyboard-nav
 * primitives keep pill native bars), code blocks (thin ghost bar),
 * carousels (no-scrollbar utility — arrows/dots exist).
 */
function ScrollArea({
  className,
  children,
  viewportId,
  scrollbarClassName,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Stable DOM id on the viewport so scroll helpers can target it. */
  viewportId?: string;
  /** Tint override for the scrollbar groove/bar if ever needed. */
  scrollbarClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type="hover"
      scrollHideDelay={100}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        id={viewportId}
        className="size-full rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar className={scrollbarClassName} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      forceMount
      className={cn(
        "flex touch-none select-none rounded-full bg-gray-400/10 opacity-0 transition-opacity duration-100 ease-out data-[state=visible]:opacity-100",
        orientation === "vertical" && "h-full w-2 p-[2px]",
        orientation === "horizontal" && "h-2 w-full flex-col p-[2px]",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-gray-300/50"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
