import { create } from 'zustand';

interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    time: number | null; // time at which menu was opened (for adding bookmarks)
    targetChunkId: string | null;
    openMenu: (x: number, y: number, time?: number, chunkId?: string) => void;
    closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
    isOpen: false,
    x: 0,
    y: 0,
    time: null,
    targetChunkId: null,
    openMenu: (x, y, time = undefined, chunkId = undefined) => set({ isOpen: true, x, y, time: time ?? null, targetChunkId: chunkId ?? null }),
    closeMenu: () => set({ isOpen: false }),
}));
