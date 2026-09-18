import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Trust fetched pages for 45s: revisits render instantly with zero
      // fetch. Every mutation invalidates its keys, so actions always
      // show fresh truth — only passive viewing can lag, by ≤45s.
      staleTime: 45_000,
    },
  },
});

function AuthBootstrap({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthBootstrap>{children}</AuthBootstrap>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
