import React, { useEffect, useRef } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';
import { Bookmark as BookmarkIcon } from 'lucide-react';

const WINDOW_SIZE = 60; // seconds for detailed view

// --- Memoized Sub-components to prevent massive re-renders ---

const OverviewGrid = React.memo(({ duration, chunks, bookmarks }: { duration: number, chunks: any[], bookmarks: any[] }) => {
    return (
        <>
            <div className="absolute inset-0 flex w-full h-full opacity-20">
                {chunks.map((chunk, index) => (
                    <div
                        key={chunk.id}
                        className={`h-full border-r border-neutral-800/50 ${index % 2 === 0 ? 'bg-blue-900/40' : 'bg-emerald-900/30'}`}
                        style={{ width: `${((chunk.endTime - chunk.startTime) / (duration || 1)) * 100}%` }}
                    />
                ))}
            </div>
            {bookmarks.map(b => (
                <div
                    key={b.id}
                    className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20"
                    style={{ left: `${(b.time / (duration || 1)) * 100}%` }}
                />
            ))}
        </>
    );
});

const DetailGrid = React.memo(({ windowStart, duration }: { windowStart: number, duration: number }) => {
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
    const played = useVideoStore(state => state.played);
    const setPlayed = useVideoStore(state => state.setPlayed);

    const bookmarks = useAnnotationStore(state => state.bookmarks);
    const chunks = useAnnotationStore(state => state.chunks);
    const selectedChunkId = useAnnotationStore(state => state.selectedChunkId);
    const { addBookmark, removeBookmark, regenerateChunks } = useAnnotationStore();

    const overviewRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    // Sync chunks when bookmarks/duration changes
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
        setPlayed(Math.max(0, Math.min(1, x / rect.width)));
    };

    const handleDetailClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!detailRef.current || duration === 0) return;
        const rect = detailRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickTime = windowStart + (x / rect.width) * WINDOW_SIZE;
        setPlayed(Math.max(0, Math.min(duration, clickTime)) / duration);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (duration === 0) return null;

    return (
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Timeline Control
                </h3>
                <div className="text-xs font-mono text-neutral-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Overview Timeline */}
                <div
                    className="relative h-6 bg-neutral-950 rounded-lg border border-neutral-800 cursor-crosshair overflow-hidden shrink-0"
                    ref={overviewRef}
                    onClick={handleOverviewClick}
                >
                    <OverviewGrid duration={duration} chunks={chunks} bookmarks={bookmarks} />
                    <div
                        className="absolute top-0 bottom-0 border border-white/20 bg-white/5 pointer-events-none z-10"
                        style={{ left: `${(windowStart / duration) * 100}%`, width: `${(WINDOW_SIZE / duration) * 100}%` }}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none z-30" style={{ left: `${played * 100}%` }} />
                </div>

                {/* Detailed Timeline */}
                <div
                    className="relative flex-1 bg-neutral-950 rounded-xl border border-neutral-800 cursor-crosshair overflow-hidden group/detail"
                    ref={detailRef}
                    onClick={handleDetailClick}
                >
                    <DetailGrid windowStart={windowStart} duration={duration} />

                    {/* Chunks in Detail */}
                    <div className="absolute inset-0 flex h-full pointer-events-none">
                        {chunks.map((chunk, index) => {
                            if (chunk.endTime < windowStart || chunk.startTime > windowEnd) return null;
                            const start = Math.max(windowStart, chunk.startTime);
                            const end = Math.min(windowEnd, chunk.endTime);
                            const widthPct = ((end - start) / WINDOW_SIZE) * 100;
                            const leftPct = ((start - windowStart) / WINDOW_SIZE) * 100;
                            const isSelected = selectedChunkId === chunk.id;
                            return (
                                <div
                                    key={chunk.id}
                                    className={`absolute top-0 bottom-0 border-x transition-all duration-300
                                        ${isSelected ? 'bg-emerald-500/20 border-emerald-400/40 z-10' : `border-neutral-800/20 ${index % 2 === 0 ? 'bg-blue-900/10' : 'bg-emerald-900/5'}`}`}
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Bookmarks in Detail */}
                    {bookmarks.map(b => {
                        if (b.time < windowStart || b.time > windowEnd) return null;
                        return (
                            <div
                                key={b.id}
                                className="absolute top-0 bottom-0 w-px bg-red-500/80 z-30 group"
                                style={{ left: `${((b.time - windowStart) / WINDOW_SIZE) * 100}%` }}
                                onClick={(e) => { e.stopPropagation(); setPlayed(b.time / duration); }}
                            >
                                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm rotate-45 transform hover:scale-125 transition-transform cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}
                                />
                            </div>
                        );
                    })}

                    {/* Playhead in Detail */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-emerald-400 pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20"
                        style={{ left: `${((currentTime - windowStart) / WINDOW_SIZE) * 100}%` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full" />
                    </div>

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
