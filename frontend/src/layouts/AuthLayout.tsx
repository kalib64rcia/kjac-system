import { Toaster } from "@/components/feedback/Toaster";

/** Minimal centered layout for admin auth pages (no side panel). */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-[420px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
      <Toaster />
    </div>
  );
}
