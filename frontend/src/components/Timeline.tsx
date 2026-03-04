import React, { useEffect, useRef, useMemo } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';
import { Bookmark as BookmarkIcon } from 'lucide-react';

const WINDOW_SIZE = 60; // seconds for detailed view

// --- HIGH PERFORMANCE Playhead Component ---
// This component ONLY re-renders when 'played' changes.
// Since it's tiny, it should be extremely fast.
const Playhead = ({ isOverview, duration }: { isOverview: boolean, duration: number }) => {
    const played = useVideoStore(state => state.played);
    const currentTime = played * duration;
    const windowStart = Math.max(0, Math.min(duration - WINDOW_SIZE, currentTime - WINDOW_SIZE / 2));

    // For Overview, it's just a percentage.
    // For Detail, it's relative to the window.
    const left = isOverview
        ? `${played * 100}%`
        : `${((currentTime - windowStart) / WINDOW_SIZE) * 100}%`;

    const shadowClass = isOverview ? "" : "shadow-[0_0_15px_rgba(52,211,153,0.6)]";
    const widthClass = isOverview ? "w-0.5" : "w-1";

    return (
        <div
            className={`absolute top-0 bottom-0 ${widthClass} bg-emerald-400 pointer-events-none z-30 ${shadowClass}`}
            style={{ left }}
        >
            {!isOverview && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full" />
            )}
        </div>
    );
};

// --- Memoized Overlays ---

const OverviewGrid = React.memo(({ duration, chunks, bookmarks }: { duration: number, chunks: any[], bookmarks: any[] }) => {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex w-full h-full opacity-10">
                {chunks.map((chunk, index) => (
                    <div
                        key={chunk.id}
                        className={`h-full ${index % 2 === 0 ? 'bg-blue-400/30' : 'bg-emerald-400/20'}`}
                        style={{ width: `${((chunk.endTime - chunk.startTime) / (duration || 1)) * 100}%` }}
                    />
                ))}
            </div>
            {bookmarks.map(b => (
                <div
                    key={b.id}
                    className="absolute top-0 bottom-0 w-px bg-red-500/40"
                    style={{ left: `${(b.time / (duration || 1)) * 100}%` }}
                />
            ))}
        </div>
    );
});

const DetailTicks = React.memo(({ windowStart, duration }: { windowStart: number, duration: number }) => {
    return (
        <div className="absolute inset-0 pointer-events-none opacity-20">
            {Array.from({ length: WINDOW_SIZE + 1 }).map((_, i) => {
                const time = Math.floor(windowStart) + i;
                if (time > duration) return null;
                const left = ((time - windowStart) / WINDOW_SIZE) * 100;
                return (
                    <div
                        key={i}
                        className={`absolute top-0 bottom-0 w-px ${time % 10 === 0 ? 'bg-white/50 h-full' : (time % 5 === 0 ? 'bg-white/30 h-1/2' : 'bg-white/10 h-1/4')}`}
                        style={{ left: `${left}%` }}
                    >
                        {time % 10 === 0 && (
                            <span className="absolute bottom-0 left-1 text-[8px] text-neutral-500">
                                {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

export const Timeline: React.FC = () => {
    const duration = useVideoStore(state => state.duration);
    const triggerSeek = useVideoStore(state => state.triggerSeek);

    // Get played state separately for internal calculation, but we want to avoid re-rendering the whole Timeline on it
    // Wait, Timeline needs windowStart to render bookmarks/chunks. So it MUST re-render on played.
    // BUT, we can make the re-render very cheap.
    const played = useVideoStore(state => state.played);

    const bookmarks = useAnnotationStore(state => state.bookmarks);
    const chunks = useAnnotationStore(state => state.chunks);
    const selectedChunkId = useAnnotationStore(state => state.selectedChunkId);
    const { addBookmark, removeBookmark, regenerateChunks } = useAnnotationStore();

    const overviewRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (duration > 0) regenerateChunks(duration);
    }, [bookmarks, duration, regenerateChunks]);

    const currentTime = played * duration;
    const windowStart = Math.max(0, Math.min(duration - WINDOW_SIZE, currentTime - WINDOW_SIZE / 2));
    const windowEnd = windowStart + WINDOW_SIZE;

    const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!overviewRef.current || duration === 0) return;
        const rect = overviewRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const targetFraction = Math.max(0, Math.min(1, x / rect.width));
        triggerSeek(targetFraction * duration);
    };

    const handleDetailClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!detailRef.current || duration === 0) return;
        const rect = detailRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickTime = windowStart + (x / rect.width) * WINDOW_SIZE;
        triggerSeek(Math.max(0, Math.min(duration, clickTime)));
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Optimization: Pre-filter bookmarks for the detailed view
    const visibleBookmarks = useMemo(() =>
        bookmarks.filter(b => b.time >= windowStart - 5 && b.time <= windowEnd + 5),
        [bookmarks, windowStart, windowEnd]
    );

    const visibleChunks = useMemo(() =>
        chunks.filter(c => c.endTime >= windowStart && c.startTime <= windowEnd),
        [chunks, windowStart, windowEnd]
    );

    if (duration === 0) return null;

    return (
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex justify-between items-center shrink-0 px-1">
                <h3 className="text-xs font-semibold text-neutral-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> TIMELINE
                </h3>
                <div className="text-[10px] font-mono text-neutral-500 bg-black/40 px-2 py-0.5 rounded border border-neutral-800">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Overview Timeline (Entire Video) */}
                <div
                    className="relative h-6 bg-neutral-950 rounded-lg border border-neutral-800 cursor-crosshair overflow-hidden shrink-0"
                    ref={overviewRef}
                    onClick={handleOverviewClick}
                >
                    <OverviewGrid duration={duration} chunks={chunks} bookmarks={bookmarks} />

                    {/* Viewport Indicator */}
                    <div
                        className="absolute top-0 bottom-0 border border-white/20 bg-white/5 pointer-events-none z-10"
                        style={{ left: `${(windowStart / duration) * 100}%`, width: `${(WINDOW_SIZE / duration) * 100}%` }}
                    />

                    <Playhead isOverview={true} duration={duration} />
                </div>

                {/* Detailed Timeline (Current Window) */}
                <div
                    className="relative flex-1 bg-neutral-950 rounded-xl border border-neutral-800 cursor-crosshair overflow-hidden group/detail"
                    ref={detailRef}
                    onClick={handleDetailClick}
                >
                    <DetailTicks windowStart={windowStart} duration={duration} />

                    {/* Chunks in Detail */}
                    <div className="absolute inset-0 flex h-full pointer-events-none">
                        {visibleChunks.map((chunk, index) => {
                            const start = Math.max(windowStart, chunk.startTime);
                            const end = Math.min(windowEnd, chunk.endTime);
                            const widthPct = ((end - start) / WINDOW_SIZE) * 100;
                            const leftPct = ((start - windowStart) / WINDOW_SIZE) * 100;
                            const isSelected = selectedChunkId === chunk.id;
                            return (
                                <div
                                    key={chunk.id}
                                    className={`absolute top-0 bottom-0 border-x
                                        ${isSelected ? 'bg-emerald-500/20 border-emerald-400/40 z-10' : `border-white/5 ${index % 2 === 0 ? 'bg-blue-400/5' : 'bg-emerald-400/5'}`}`}
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Bookmarks in Detail */}
                    {visibleBookmarks.map(b => (
                        <div
                            key={b.id}
                            className="absolute top-0 bottom-0 w-px bg-red-500/80 z-30 group"
                            style={{ left: `${((b.time - windowStart) / WINDOW_SIZE) * 100}%` }}
                            onClick={(e) => { e.stopPropagation(); triggerSeek(b.time); }}
                        >
                            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm rotate-45 transform hover:scale-125 transition-transform cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}
                            />
                        </div>
                    ))}

                    <Playhead isOverview={false} duration={duration} />

                    <button
                        onClick={(e) => { e.stopPropagation(); addBookmark(currentTime); }}
                        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow-lg opacity-0 group-hover/detail:opacity-100 transition-opacity z-40"
                    >
                        <BookmarkIcon size={12} /> 栞を追加
                    </button>
                </div>
            </div>
        </div>
    );
};
