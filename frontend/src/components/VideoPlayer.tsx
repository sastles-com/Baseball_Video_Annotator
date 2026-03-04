import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { Play, Pause, Volume2, VolumeX, BookmarkPlus, SkipBack, SkipForward } from 'lucide-react';
import { useAnnotationStore } from '../store/annotationStore';

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC = React.memo(() => {
    // Global State
    const videoUrl = useVideoStore(state => state.videoUrl);
    const isPlaying = useVideoStore(state => state.isPlaying);
    const setIsPlaying = useVideoStore(state => state.setIsPlaying);
    const setDuration = useVideoStore(state => state.setDuration);
    const setPlayed = useVideoStore(state => state.setPlayed);
    const duration = useVideoStore(state => state.duration);
    const volume = useVideoStore(state => state.volume);
    const setVolume = useVideoStore(state => state.setVolume);

    // EXPLICIT SEEK TRIGGER: VideoPlayer only seeks when this changes
    const lastSeekTime = useVideoStore(state => state.lastSeekTime);

    const { addBookmark } = useAnnotationStore();

    // Refs for performance and coordination
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastStoreUpdateRef = useRef<number>(0);
    const lastSeekRequestRef = useRef<number>(0);

    // Local state for UI responsiveness
    const [isInternalSeeking, setIsInternalSeeking] = useState(false);
    const [localPlayed, setLocalPlayed] = useState(0);
    const [muted, setMuted] = useState(false);

    // Synchronize localPlayed to Video CurrentTime (instead of store's played)
    // This removes the store-to-video reactivity loop

    // Handle Play/Pause
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

    // Sync Volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    // --- PUSH-ONLY SEEK LOGIC ---
    // React to the explicit seek trigger from the store
    useEffect(() => {
        const video = videoRef.current;
        if (!video || lastSeekTime === null || !video.duration || isNaN(video.duration)) return;

        console.log("VideoPlayer: PUSH SEEK ->", lastSeekTime);
        video.currentTime = lastSeekTime;
        const newFraction = lastSeekTime / video.duration;
        setLocalPlayed(newFraction);
        setPlayed(newFraction);
    }, [lastSeekTime, setPlayed]);

    // Time Update (Video -> Store/UI)
    // Throttled to reduce UI load
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || isInternalSeeking || video.duration <= 0) return;

        const now = Date.now();
        const lp = video.currentTime / video.duration;
        setLocalPlayed(lp); // Keep local slider in sync with video real-time

        if (now - lastStoreUpdateRef.current > 250) {
            lastStoreUpdateRef.current = now;
            setPlayed(lp); // Update store for other components (Timeline etc.)
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            console.log("VideoPlayer: Metadata Loaded. Duration:", videoRef.current.duration);
            setDuration(videoRef.current.duration);
        }
    };

    // --- Interactive Scrubbing (Slider) ---
    const handleSeekMouseDown = () => {
        setIsInternalSeeking(true);
    };

    const handleSeekMouseUp = () => {
        setIsInternalSeeking(false);
        const video = videoRef.current;
        if (video && !isNaN(video.duration) && video.duration > 0) {
            video.currentTime = localPlayed * video.duration;
            setPlayed(localPlayed);
        }
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fraction = parseFloat(e.target.value);
        setLocalPlayed(fraction);

        const now = Date.now();
        if (now - lastSeekRequestRef.current > 100) {
            lastSeekRequestRef.current = now;
            const video = videoRef.current;
            if (video && !isNaN(video.duration) && video.duration > 0) {
                video.currentTime = fraction * video.duration;
            }
        }
    };

    // --- Wheel Frame Stepping ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const video = videoRef.current;
            if (!video || !videoUrl || isNaN(video.duration) || video.duration <= 0) return;

            setIsInternalSeeking(true);
            setIsPlaying(false);

            const step = -(Math.sign(e.deltaY)) * (1 / 30);
            const newTime = Math.min(video.duration, Math.max(0, video.currentTime + step));

            video.currentTime = newTime;
            const lp = newTime / video.duration;
            setLocalPlayed(lp);
            setPlayed(lp);

            window.clearTimeout((window as any)._wheelTimeout);
            (window as any)._wheelTimeout = window.setTimeout(() => setIsInternalSeeking(false), 150);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [videoUrl, setIsPlaying, setPlayed]);

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
        const np = targetTime / (duration || 1);
        setPlayed(np);
        setLocalPlayed(np);

        const targetChunk = chunks.find(c => Math.abs(c.startTime - targetTime) < 0.1);
        if (targetChunk) setSelectedChunkId(targetChunk.id);
    }, [duration, setPlayed]);

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
                onEnded={() => setIsPlaying(false)}
                onClick={() => setIsPlaying(!isPlaying)}
                onError={(e) => {
                    const error = (e.target as HTMLVideoElement).error;
                    console.error("VideoPlayer Error:", error?.code, error?.message);
                }}
                playsInline
                preload="auto"
                autoPlay={false}
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-4 pb-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.0001}
                        value={localPlayed}
                        onMouseDown={handleSeekMouseDown}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        className="w-full h-1.5 mb-3 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
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
                                    title="Prev Bookmark"
                                    className="text-neutral-400 hover:text-white transition-colors focus:outline-none p-1"
                                >
                                    <SkipBack size={18} />
                                </button>
                                <button
                                    onClick={() => jumpToBookmarkLocal('next')}
                                    title="Next Bookmark"
                                    className="text-neutral-400 hover:text-white transition-colors focus:outline-none p-1"
                                >
                                    <SkipForward size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 group/vol">
                                <button
                                    onClick={() => setMuted(!muted)}
                                    className="text-white hover:text-emerald-400 transition-colors focus:outline-none"
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
                                    className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1.5 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>

                            <span className="text-xs text-neutral-300 font-mono tabular-nums">
                                {formatTime(localPlayed * duration)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => addBookmark(localPlayed * duration)}
                                title="Add Bookmark (B)"
                                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-emerald-400 transition-colors focus:outline-none"
                            >
                                <BookmarkPlus size={16} />
                                栞を挿入 (B)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
