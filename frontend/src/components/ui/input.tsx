import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:border-gray-200 aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    />
  );
}

interface PasswordInputProps extends React.ComponentProps<"input"> {
  containerClassName?: string;
}

function PasswordInput({ className, containerClassName, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className={cn("relative flex items-center", containerClassName)}>
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 transition-colors cursor-pointer"
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff size={18} aria-hidden="true" className="shrink-0" />
        ) : (
          <Eye size={18} aria-hidden="true" className="shrink-0" />
        )}
      </button>
    </div>
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:hover:border-gray-200 aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    />
  );
}

function renderWithRedAsterisk(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    if (node.includes("*")) {
      const parts = node.split("*");
      return parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="text-error-500 font-semibold ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </React.Fragment>
      ));
    }
    return node;
  }
  if (Array.isArray(node)) {
    return React.Children.map(node, renderWithRedAsterisk);
  }
  return node;
}

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("mb-1.5 block text-sm font-semibold text-gray-700", className)}
      {...props}
    >
      {renderWithRedAsterisk(children)}
      {required && (
        <span className="text-error-500 font-semibold ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
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

export { Input, PasswordInput, Textarea, Label, FieldError, Select };
