import { create } from 'zustand';
import type { Bookmark, Chunk, Tag } from '../types/annotation';
import { v4 as uuidv4 } from 'uuid';

interface AnnotationState {
    bookmarks: Bookmark[];
    chunks: Chunk[];
    selectedChunkId: string | null;
    globalTags: Tag[];
    sectionTags: { id: string, startTime: number, endTime: number, tags: Tag[] }[];
    skipNextRegenerate: boolean;

    addBookmark: (time: number) => void;
    removeBookmark: (id: string) => void;

    // Re-calculates chunks based on bookmarks and video duration
    regenerateChunks: (videoDuration: number) => void;
    setBookmarksAndChunks: (bookmarks: Bookmark[], duration: number) => void;
    setSelectedChunkId: (id: string | null) => void;

    addTagToChunk: (chunkId: string, tag: Tag) => void;
    removeTagFromChunk: (chunkId: string, tagId: string) => void;
    undoHistory: Bookmark[];
    undo: () => void;

    // Tag Preset Management (Dynamic Categories)
    tagPresets: Record<string, { label: string, tags: string[] }>;
    addCategory: (id: string, label: string) => void;
    removeCategory: (id: string) => void;
    addPresetTag: (categoryId: string, name: string) => void;
    removePresetTag: (categoryId: string, name: string) => void;
    importTagPresets: (presets: Record<string, { label: string, tags: string[] }>) => void;
    importAnnotations: (data: { globalTags: Tag[], sectionTags: { id: string, startTime: number, endTime: number, tags: Tag[] }[], bookmarks: Bookmark[], chunks: Chunk[] }) => void;
    initializePresets: () => Promise<void>;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
    bookmarks: [],
    chunks: [],
    selectedChunkId: null,
    globalTags: [],
    sectionTags: [],
    skipNextRegenerate: false,
    undoHistory: [],
    tagPresets: JSON.parse(localStorage.getItem('video_analyzer_tag_presets') || '{}'),

    setSelectedChunkId: (selectedChunkId) => set({ selectedChunkId }),

    initializePresets: async () => {
        const storedPresets = localStorage.getItem('video_analyzer_tag_presets');

        if (!storedPresets || Object.keys(JSON.parse(storedPresets)).length === 0) {
            // Check for legacy tags first
            const legacyPitch = localStorage.getItem('video_analyzer_pitch_tags');
            const legacyResult = localStorage.getItem('video_analyzer_result_tags');

            if (legacyPitch || legacyResult) {
                const newPresets: Record<string, { label: string, tags: string[] }> = {
                    pitch: { label: '球種', tags: JSON.parse(legacyPitch || '[]') },
                    result: { label: '結果', tags: JSON.parse(legacyResult || '[]') }
                };
                set({ tagPresets: newPresets });
                localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
                return;
            }

            try {
                const res = await fetch('/preset_tags.json');
                const data = await res.json();
                const newPresets: Record<string, { label: string, tags: string[] }> = {
                    pitch: { label: '球種', tags: data.presetPitchTags || [] },
                    result: { label: '結果', tags: data.presetResultTags || [] }
                };
                set({ tagPresets: newPresets });
                localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
            } catch (e) {
                console.error("Failed to load preset_tags.json:", e);
                // Fallback minimal defaults
                const fallback = {
                    pitch: { label: '球種', tags: ['ストレート', 'カーブ', 'スライダー'] },
                    result: { label: '結果', tags: ['ヒット', 'アウト', '三振'] }
                };
                set({ tagPresets: fallback });
                localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(fallback));
            }
        }
    },

    addCategory: (id, label) => {
        set((state) => {
            const newPresets = { ...state.tagPresets, [id]: { label, tags: [] } };
            localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
            return { tagPresets: newPresets };
        });
    },

    removeCategory: (id) => {
        set((state) => {
            const { [id]: _, ...newPresets } = state.tagPresets;
            localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
            return { tagPresets: newPresets };
        });
    },

    addPresetTag: (categoryId, name) => {
        set((state) => {
            if (!state.tagPresets[categoryId]) return state;
            const category = state.tagPresets[categoryId];
            if (category.tags.includes(name)) return state;

            const newPresets = {
                ...state.tagPresets,
                [categoryId]: { ...category, tags: [...category.tags, name] }
            };
            localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
            return { tagPresets: newPresets };
        });
    },

    removePresetTag: (categoryId, name) => {
        set((state) => {
            if (!state.tagPresets[categoryId]) return state;
            const category = state.tagPresets[categoryId];
            const newPresets = {
                ...state.tagPresets,
                [categoryId]: { ...category, tags: category.tags.filter(t => t !== name) }
            };
            localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(newPresets));
            return { tagPresets: newPresets };
        });
    },

    addBookmark: (time) => {
        set((state) => {
            // Don't add if very close to existing (< 0.5s)
            if (state.bookmarks.some(b => Math.abs(b.time - time) < 0.5)) {
                return state;
            }

            const newBookmarks = [...state.bookmarks, { id: uuidv4(), time }].sort((a, b) => a.time - b.time);
            return { bookmarks: newBookmarks };
        });
    },

    removeBookmark: (id) => {
        set((state) => {
            const target = state.bookmarks.find(b => b.id === id);
            if (!target) return state;
            return {
                bookmarks: state.bookmarks.filter(b => b.id !== id),
                undoHistory: [target, ...state.undoHistory].slice(0, 50)
            };
        });
    },

    undo: () => {
        set((state) => {
            if (state.undoHistory.length === 0) return state;
            const [lastDeleted, ...remainingHistory] = state.undoHistory;
            const newBookmarks = [...state.bookmarks, lastDeleted].sort((a, b) => a.time - b.time);
            return {
                bookmarks: newBookmarks,
                undoHistory: remainingHistory
            };
        });
    },

    regenerateChunks: (duration) => {
        set((state) => {
            if (state.skipNextRegenerate) return { ...state, skipNextRegenerate: false };
            if (duration <= 0) return state;
            const sortedBookmarks = [...state.bookmarks].sort((a, b) => a.time - b.time);
            const newChunks: Chunk[] = [];
            let lastTime = 0;

            // PERFORMANCE: O(N) generation. We don't preserve tags here during auto-regen 
            // for simplicity and peak performance with hundreds of items.
            sortedBookmarks.forEach((b) => {
                newChunks.push({
                    id: uuidv4(),
                    startTime: lastTime,
                    endTime: b.time,
                    tags: []
                });
                lastTime = b.time;
            });

            if (lastTime < duration) {
                newChunks.push({
                    id: uuidv4(),
                    startTime: lastTime,
                    endTime: duration,
                    tags: []
                });
            }

            return { chunks: newChunks };
        });
    },

    setBookmarksAndChunks: (bookmarks, duration) => {
        const sortedBookmarks = [...bookmarks].sort((a, b) => a.time - b.time);
        const newChunks: Chunk[] = [];
        let lastTime = 0;

        sortedBookmarks.forEach((b) => {
            newChunks.push({
                id: uuidv4(),
                startTime: lastTime,
                endTime: b.time,
                tags: []
            });
            lastTime = b.time;
        });

        if (lastTime < duration) {
            newChunks.push({
                id: uuidv4(),
                startTime: lastTime,
                endTime: duration,
                tags: []
            });
        }

        set({ bookmarks: sortedBookmarks, chunks: newChunks, selectedChunkId: null });
    },

    addTagToChunk: (chunkId, tag) => {
        set((state) => ({
            chunks: state.chunks.map(c => {
                if (c.id === chunkId) {
                    if (c.tags.some(t => t.id === tag.id)) return c; // Already has tag
                    return { ...c, tags: [...c.tags, tag] };
                }
                return c;
            })
        }));
    },

    removeTagFromChunk: (chunkId, tagId) => {
        set((state) => ({
            chunks: state.chunks.map(c => {
                if (c.id === chunkId) {
                    return { ...c, tags: c.tags.filter(t => t.id !== tagId) };
                }
                return c;
            })
        }));
    },

    importAnnotations: (data) => {
        set({
            globalTags: data.globalTags,
            sectionTags: data.sectionTags,
            bookmarks: data.bookmarks,
            chunks: data.chunks,
            selectedChunkId: null,
            skipNextRegenerate: true,
        });
    },

    importTagPresets: (presets) => {
        set({ tagPresets: presets });
        localStorage.setItem('video_analyzer_tag_presets', JSON.stringify(presets));
    },
}));
