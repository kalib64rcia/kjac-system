import { create } from "zustand";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Bottom-left toast store (DESIGN.md §Toast Notifications). */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, title, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, title, message }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push("success", title, message),
  error: (title: string, message?: string) =>
    useToastStore.getState().push("error", title, message),
  warning: (title: string, message?: string) =>
    useToastStore.getState().push("warning", title, message),
  info: (title: string, message?: string) =>
    useToastStore.getState().push("info", title, message),
};
