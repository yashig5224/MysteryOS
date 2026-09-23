import { create } from "zustand";

export const useUIStore = create<{ sidebarOpen: boolean; toggleSidebar: () => void }>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
