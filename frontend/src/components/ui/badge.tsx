import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Canonical shadcn/new-york badge API (`variant` prop, pill shape, data-* attr)
 * with KJAC DESIGN.md tint tokens. `success`/`warning`/`info` extend the
 * canonical set using ecosystem-standard names.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold transition-colors [&_svg]:pointer-events-none [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary-100 text-primary-700",
        secondary: "bg-gray-100 text-gray-600",
        destructive: "bg-error-50 text-error-700",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        info: "bg-info-50 text-info-600",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
