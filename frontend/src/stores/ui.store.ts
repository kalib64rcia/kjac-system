import { create } from "zustand";

interface UiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

/** UI-only state (never server data — see FRONTEND_ARCHITECTURE.md). */
export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
