// src/state/uiStore.ts
import { create } from "zustand";

export type UiStoreState = {
  isSidePanelOpen: boolean;
  openSidePanel: () => void;
  closeSidePanel: () => void;
  toggleSidePanel: () => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  isSidePanelOpen: true,
  openSidePanel: () => set({ isSidePanelOpen: true }),
  closeSidePanel: () => set({ isSidePanelOpen: false }),
  toggleSidePanel: () =>
    set((state) => ({ isSidePanelOpen: !state.isSidePanelOpen })),
}));
