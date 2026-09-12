import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("mb-1.5 block text-sm font-semibold text-gray-700", className)}
      {...props}
    />
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-error-600">
      {message}
    </p>
  );
}

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select-native"
      className={cn(
        "flex min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Input, Textarea, Label, FieldError, Select };
