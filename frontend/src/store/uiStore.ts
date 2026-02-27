import { create } from 'zustand';

interface UIState {
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSettingsOpen: false,
    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),
}));
