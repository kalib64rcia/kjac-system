import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("rounded-lg border border-gray-200 bg-white", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex min-h-[52px] flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-50 [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          size={20}
          aria-hidden="true"
          className="shrink-0 text-gray-500 transition-transform duration-200"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" {...props}>
      <div className={cn("border-t border-gray-100 px-4 py-3 text-sm text-gray-600", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

/** Single-item accordion (FAQ convenience wrapper). */
export function SingleAccordionItem({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "item" : undefined}>
      <AccordionItem value="item">
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
