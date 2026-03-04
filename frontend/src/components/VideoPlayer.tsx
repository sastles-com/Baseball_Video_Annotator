import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { Play, Pause, Volume2, VolumeX, BookmarkPlus, SkipBack, SkipForward, RefreshCw } from 'lucide-react';
import { useAnnotationStore } from '../store/annotationStore';

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC = React.memo(() => {
    // --- Global State ---
    const videoUrl = useVideoStore(state => state.videoUrl);
    const isPlaying = useVideoStore(state => state.isPlaying);
    const setIsPlaying = useVideoStore(state => state.setIsPlaying);
    const setDuration = useVideoStore(state => state.setDuration);
    const setPlayed = useVideoStore(state => state.setPlayed);
    const duration = useVideoStore(state => state.duration);
    const volume = useVideoStore(state => state.volume);
    const setVolume = useVideoStore(state => state.setVolume);

    // EXPLICIT SEEK TRIGGER: Use seekVersion to ensure reactivity
    const lastSeekTime = useVideoStore(state => state.lastSeekTime);
    const seekVersion = useVideoStore(state => state.seekVersion);

    const { addBookmark } = useAnnotationStore();

    // --- Refs for performance and state coordination ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastStoreUpdateRef = useRef<number>(0);
    const isScrubbingRef = useRef<boolean>(false);

    // --- Local State for UI responsiveness ---
    const [localPlayed, setLocalPlayed] = useState(0);
    const [muted, setMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);

    // Reset local state on video change
    useEffect(() => {
        setLocalPlayed(0);
        setIsBuffering(false);
        lastStoreUpdateRef.current = 0;
    }, [videoUrl]);

    // --- Sync Play/Pause ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl) return;

        if (isPlaying) {
            video.play().catch(err => {
                console.warn("VideoPlayer: play() failed:", err);
                setIsPlaying(false);
            });
        } else {
            video.pause();
        }
    }, [isPlaying, videoUrl, setIsPlaying]);

    // --- Sync Volume ---
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    // --- EXTERNAL SEEK HANDLING (The Push Trigger) ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video || lastSeekTime === null || !video.duration || isNaN(video.duration)) return;

        // Perform the seek
        video.currentTime = lastSeekTime;

        // Immediate UI update
        const fraction = lastSeekTime / video.duration;
        setLocalPlayed(fraction);
        setPlayed(fraction);
    }, [seekVersion, setPlayed]); // React to seekVersion, not just time

    // --- TIME UPDATE (Video -> Store/UI) ---
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || isScrubbingRef.current || video.duration <= 0) return;

        const now = Date.now();
        const lp = video.currentTime / video.duration;

        // 1. High-frequency local update for progress bar and timer
        setLocalPlayed(lp);

        // 2. Throttled store update for Timeline items (Markers, scrolling window)
        // 60ms is roughly 16fps - smooth enough for Timeline playhead but low overhead
        if (now - lastStoreUpdateRef.current > 60) {
            lastStoreUpdateRef.current = now;
            setPlayed(lp);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // --- INTERACTIVE SCRUBBING (Slider) ---
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video || isNaN(video.duration) || video.duration <= 0) return;

        const fraction = parseFloat(e.target.value);
        setLocalPlayed(fraction);

        // Update video element immediately for visual feedback
        video.currentTime = fraction * video.duration;

        // Update store so Timeline follows during scrubbing
        const now = Date.now();
        if (now - lastStoreUpdateRef.current > 60) {
            lastStoreUpdateRef.current = now;
            setPlayed(fraction);
        }
    };

    const handleSeekStart = () => {
        isScrubbingRef.current = true;
    };

    const handleSeekEnd = () => {
        isScrubbingRef.current = false;
        const video = videoRef.current;
        if (video && !isNaN(video.duration)) {
            setPlayed(video.currentTime / video.duration);
        }
    };

    // --- WHEEL FRAME STEPPING ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const video = videoRef.current;
            if (!video || !videoUrl || isNaN(video.duration) || video.duration <= 0) return;

            // Stop play during wheel interactions
            setIsPlaying(false);

            // Framestep (approx 30fps)
            const step = -(Math.sign(e.deltaY)) * (1 / 30);
            const newTime = Math.min(video.duration, Math.max(0, video.currentTime + step));

            video.currentTime = newTime;
            const lp = newTime / video.duration;
            setLocalPlayed(lp);
            setPlayed(lp);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [videoUrl, setIsPlaying, setPlayed]);

    // --- JUMP TO BOOKMARK (Internal Shortcut) ---
    const jumpToBookmarkLocal = useCallback((direction: 'next' | 'prev') => {
        const { bookmarks, setSelectedChunkId, chunks } = useAnnotationStore.getState();
        if (bookmarks.length === 0) return;

        const video = videoRef.current;
        if (!video) return;

        const currentT = video.currentTime;
        let targetTime = 0;

        if (direction === 'prev') {
            const prev = [...bookmarks].reverse().find(b => b.time < currentT - 0.5);
            targetTime = prev ? prev.time : 0;
        } else {
            const next = bookmarks.find(b => b.time > currentT + 0.5);
            if (next) targetTime = next.time;
            else return;
        }

        video.currentTime = targetTime;
        const np = targetTime / (video.duration || 1);
        setLocalPlayed(np);
        setPlayed(np);

        const targetChunk = chunks.find(c => Math.abs(c.startTime - targetTime) < 0.1);
        if (targetChunk) setSelectedChunkId(targetChunk.id);
    }, [setPlayed]);

    if (!videoUrl) return null;

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex flex-col group relative rounded-2xl overflow-hidden bg-black ring-1 ring-white/5 shadow-2xl"
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain flex-1 cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={() => setIsPlaying(!isPlaying)}
                playsInline
                preload="auto"
            />

            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <RefreshCw className="text-emerald-500 animate-spin" size={48} />
                </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-4 pb-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    {/* Scrubbing Bar */}
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.0001}
                        value={localPlayed}
                        onMouseDown={handleSeekStart}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekEnd}
                        className="w-full h-1.5 mb-3 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none"
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="text-white hover:text-emerald-400 transition-colors focus:outline-none"
                            >
                                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                            </button>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => jumpToBookmarkLocal('prev')}
                                    className="text-neutral-400 hover:text-white transition-colors p-1"
                                    title="前の栞"
                                >
                                    <SkipBack size={18} />
                                </button>
                                <button
                                    onClick={() => jumpToBookmarkLocal('next')}
                                    className="text-neutral-400 hover:text-white transition-colors p-1"
                                    title="次の栞"
                                >
                                    <SkipForward size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 group/vol">
                                <button
                                    onClick={() => setMuted(!muted)}
                                    className="text-white hover:text-emerald-400 transition-colors"
                                >
                                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={muted ? 0 : volume}
                                    onChange={(e) => {
                                        setVolume(parseFloat(e.target.value));
                                        if (muted) setMuted(false);
                                    }}
                                    className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>

                            <span className="text-xs text-neutral-300 font-mono tabular-nums bg-black/40 px-2 py-0.5 rounded border border-neutral-800">
                                {formatTime(localPlayed * duration)} / {formatTime(duration)}
                            </span>
                        </div>

                        <button
                            onClick={() => addBookmark(localPlayed * duration)}
                            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-emerald-400 transition-colors focus:outline-none"
                        >
                            <BookmarkPlus size={16} />
                            栞を挿入 (B)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
