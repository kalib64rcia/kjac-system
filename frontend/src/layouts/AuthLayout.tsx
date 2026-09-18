import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/feedback/Toaster";

/** Minimal centered layout for admin auth pages (no side panel). */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50">
      <ScrollArea
        className="min-h-0 flex-1"
        viewportClassName="[&>div]:!flex [&>div]:!min-h-full [&>div]:!flex-col"
      >
        <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
          <div className="my-auto w-full max-w-[420px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </ScrollArea>
      <Toaster />
    </div>
  );
}
