import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
