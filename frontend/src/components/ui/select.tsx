import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 aria-[invalid=true]:border-error-500 [&>span[data-slot=select-value]]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "thin-scroll relative z-[80] max-h-72 min-w-[8rem] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1 shadow-lg data-[state=open]:animate-fade-in",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-semibold text-gray-500", className)}
      {...props}
    />
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-gray-200", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-pointer items-center justify-center py-1 text-gray-500",
        className,
      )}
      {...props}
    >
      <ChevronUp size={16} aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-pointer items-center justify-center py-1 text-gray-500",
        className,
      )}
      {...props}
    >
      <ChevronDown size={16} aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-[44px] w-full cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-2 pr-8 text-base text-gray-900 outline-none focus:bg-primary-50 focus:text-primary-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <Check size={16} aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export {
  Select,
  SelectGroup,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectValue,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
