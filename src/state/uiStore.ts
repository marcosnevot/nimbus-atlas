// src/state/uiStore.ts
import { create } from "zustand";

export type BaseMapStyle = "dark" | "satellite";

export type UiStoreState = {
  isSidePanelOpen: boolean;
  baseMapStyle: BaseMapStyle;

  openSidePanel: () => void;
  closeSidePanel: () => void;
  toggleSidePanel: () => void;

  setBaseMapStyle: (style: BaseMapStyle) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  isSidePanelOpen: true,
  baseMapStyle: "dark", // default: dark basemap

  openSidePanel: () => set({ isSidePanelOpen: true }),
  closeSidePanel: () => set({ isSidePanelOpen: false }),
  toggleSidePanel: () =>
    set((state) => ({ isSidePanelOpen: !state.isSidePanelOpen })),

  setBaseMapStyle: (style) => set({ baseMapStyle: style }),
}));
