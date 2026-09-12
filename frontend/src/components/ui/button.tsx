import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Canonical shadcn/new-york button API (variant/size key names, data-* attrs,
 * icon sizing that respects explicit size classes) with KJAC DESIGN.md tokens.
 * KJAC extensions: `destructiveOutline` variant; touch-target min-heights
 * (44px default/icon, 52px lg) exceed upstream h-9/h-10 and are intentional.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary-400 text-white hover:bg-primary-500",
        secondary: "bg-secondary-medium text-white hover:bg-secondary-light",
        destructive: "bg-error-500 text-white hover:bg-error-600",
        destructiveOutline:
          "border border-error-500 text-error-600 hover:bg-error-50",
        outline:
          "border border-primary-600 text-primary-600 hover:bg-primary-50",
        ghost: "text-primary-600 hover:bg-primary-50",
        link: "text-primary-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] px-4 text-sm",
        xs: "min-h-[32px] px-2 text-xs",
        sm: "min-h-[36px] px-3 text-xs",
        lg: "min-h-[52px] px-6 text-base",
        icon: "min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
