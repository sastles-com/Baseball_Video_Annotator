import React, { useEffect, useRef } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';
import { Bookmark as BookmarkIcon } from 'lucide-react';

const WINDOW_SIZE = 60; // seconds for detailed view

export const Timeline: React.FC = () => {
    const { duration, played, setPlayed } = useVideoStore();
    const { bookmarks, addBookmark, removeBookmark, regenerateChunks, chunks, selectedChunkId } = useAnnotationStore();
    const overviewRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    // Recalculate chunks when bookmarks change
    useEffect(() => {
        if (duration > 0) {
            regenerateChunks(duration);
        }
    }, [bookmarks, duration, regenerateChunks]);

    const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!overviewRef.current || duration === 0) return;
        const rect = overviewRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setPlayed(percentage);
    };

    const handleDetailClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!detailRef.current || duration === 0) return;
        const rect = detailRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const currentTime = played * duration;
        const windowStart = Math.max(0, Math.min(duration - WINDOW_SIZE, currentTime - WINDOW_SIZE / 2));
        const clickTime = windowStart + (x / rect.width) * WINDOW_SIZE;
        setPlayed(Math.max(0, Math.min(duration, clickTime)) / duration);
    };

    const handleAddBookmark = () => {
        if (duration === 0) return;
        const currentTime = played * duration;
        addBookmark(currentTime);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (duration === 0) return null;

    const currentTime = played * duration;
    const windowStart = Math.max(0, Math.min(duration - WINDOW_SIZE, currentTime - WINDOW_SIZE / 2));
    const windowEnd = windowStart + WINDOW_SIZE;

    return (
        <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Timeline Control
                </h3>
                <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-neutral-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            </div>

            {/* Overview Timeline (Mini) */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-500 px-1">
                    <span>Overview (Full Video)</span>
                </div>
                <div
                    className="relative h-6 bg-neutral-950 rounded-lg border border-neutral-800 cursor-crosshair overflow-hidden"
                    ref={overviewRef}
                    onClick={handleOverviewClick}
                >
                    {/* Chunks */}
                    <div className="absolute inset-0 flex w-full h-full opacity-20">
                        {chunks.map((chunk, index) => (
                            <div
                                key={chunk.id}
                                className={`h-full border-r border-neutral-800/50 ${index % 2 === 0 ? 'bg-blue-900/40' : 'bg-emerald-900/30'}`}
                                style={{ width: `${((chunk.endTime - chunk.startTime) / duration) * 100}%` }}
                            />
                        ))}
                    </div>
                    {/* Bookmarks in Overview */}
                    {bookmarks.map(b => (
                        <div
                            key={b.id}
                            className="absolute top-0 bottom-0 w-px bg-red-500/50 z-20"
                            style={{ left: `${(b.time / duration) * 100}%` }}
                        />
                    ))}
                    {/* Window Indicator */}
                    <div
                        className="absolute top-0 bottom-0 border border-white/20 bg-white/5 pointer-events-none z-10"
                        style={{
                            left: `${(windowStart / duration) * 100}%`,
                            width: `${(WINDOW_SIZE / duration) * 100}%`
                        }}
                    />
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none z-30"
                        style={{ left: `${played * 100}%` }}
                    />
                </div>
            </div>

            {/* Detailed Timeline (Zoomed) */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-500 px-1">
                    <span>Detail View ({WINDOW_SIZE}s window)</span>
                    <button
                        onClick={handleAddBookmark}
                        className="flex items-center gap-1 text-[10px] bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-2 py-0.5 rounded transition-colors border border-emerald-500/20"
                    >
                        <BookmarkIcon size={10} /> Add Bookmark
                    </button>
                </div>
                <div
                    className="relative h-20 bg-neutral-950 rounded-xl border border-neutral-800 cursor-crosshair overflow-hidden group/detail"
                    ref={detailRef}
                    onClick={handleDetailClick}
                >
                    {/* Detail Grid */}
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
                                            {formatTime(time)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Chunks background visualization */}
                    <div className="absolute inset-0 flex h-full">
                        {chunks.map((chunk, index) => {
                            if (chunk.endTime < windowStart || chunk.startTime > windowEnd) return null;
                            const start = Math.max(windowStart, chunk.startTime);
                            const end = Math.min(windowEnd, chunk.endTime);
                            const widthPct = ((end - start) / WINDOW_SIZE) * 100;
                            const leftPct = ((start - windowStart) / WINDOW_SIZE) * 100;
                            const isAlternate = index % 2 === 0;
                            const isSelected = selectedChunkId === chunk.id;

                            return (
                                <div
                                    key={chunk.id}
                                    className={`absolute top-0 bottom-0 border-x transition-all duration-300
                                        ${isSelected
                                            ? 'bg-emerald-500/30 border-emerald-400/50 z-10 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]'
                                            : `border-neutral-800/30 ${isAlternate ? 'bg-blue-900/20' : 'bg-emerald-900/10'}`}`}
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${widthPct}%`
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Detailed Playhead (Centered typically) */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-emerald-400 pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20"
                        style={{ left: `${((currentTime - windowStart) / WINDOW_SIZE) * 100}%` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-lg" />
                    </div>

                    {/* Bookmarks in Detail view */}
                    {bookmarks.map(b => {
                        if (b.time < windowStart || b.time > windowEnd) return null;
                        const leftPct = ((b.time - windowStart) / WINDOW_SIZE) * 100;
                        return (
                            <div
                                key={b.id}
                                className="absolute top-0 bottom-0 w-px bg-red-500/80 z-30 group"
                                style={{ left: `${leftPct}%` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayed(b.time / duration);
                                }}
                            >
                                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm rotate-45 transform hover:scale-125 transition-transform cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeBookmark(b.id);
                                    }}
                                    title="Remove Bookmark"
                                />
                                <div className="absolute bottom-1 left-1 text-[8px] text-red-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                    {formatTime(b.time)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
