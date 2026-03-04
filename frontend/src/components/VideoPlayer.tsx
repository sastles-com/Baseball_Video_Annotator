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
    // --- Global State (Selective to avoid excessive re-render) ---
    const videoUrl = useVideoStore(state => state.videoUrl);
    const isPlaying = useVideoStore(state => state.isPlaying);
    const setIsPlaying = useVideoStore(state => state.setIsPlaying);
    const duration = useVideoStore(state => state.duration);
    const setDuration = useVideoStore(state => state.setDuration);
    const played = useVideoStore(state => state.played);
    const setPlayed = useVideoStore(state => state.setPlayed);
    const volume = useVideoStore(state => state.volume);
    const setVolume = useVideoStore(state => state.setVolume);
    const lastSeekTime = useVideoStore(state => state.lastSeekTime);
    const seekVersion = useVideoStore(state => state.seekVersion);

    const { addBookmark } = useAnnotationStore();

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastWheelSeekRef = useRef<number>(0);

    // --- Local State ---
    const [seeking, setSeeking] = useState(false);
    const [muted, setMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const bufferingTimeoutRef = useRef<number | null>(null);

    const clearBuffering = useCallback(() => {
        if (bufferingTimeoutRef.current) {
            window.clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
        }
        setIsBuffering(false);
    }, []);

    const startBuffering = useCallback(() => {
        if (bufferingTimeoutRef.current) return;
        // Only show spinner if waiting for more than 500ms
        bufferingTimeoutRef.current = window.setTimeout(() => {
            setIsBuffering(true);
        }, 500);
    }, []);

    // --- 1. Play/Pause Sync ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl) return;
        if (isPlaying) {
            video.play().catch(() => setIsPlaying(false));
        } else {
            video.pause();
        }
    }, [isPlaying, videoUrl, setIsPlaying]);

    // --- 2. Volume Sync ---
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    // --- 3. BI-DIRECTIONAL SYNC (Hybrid V2.5 Logic) ---
    // Only seek if the difference is significant to break loop.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || seeking || !videoUrl || !video.duration) return;

        const storeTime = played * video.duration;
        if (Math.abs(video.currentTime - storeTime) > 0.15) { // Increased slightly for stability
            video.currentTime = storeTime;
        }
    }, [played, seeking, videoUrl]);

    // --- 4. EXPLICIT SEEK TRIGGER (Bookmarks/Jumps) ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video || lastSeekTime === null || !video.duration) return;
        video.currentTime = lastSeekTime;
        setPlayed(lastSeekTime / video.duration);
    }, [seekVersion]);

    // --- 5. TIME UPDATE ---
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || seeking || video.duration <= 0) return;

        // If time is moving, we are definitely not buffering
        if (isBuffering || bufferingTimeoutRef.current) clearBuffering();

        setPlayed(video.currentTime / video.duration);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // --- 6. MOUSE WHEEL SCRUBBING (Throttled) ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const video = videoRef.current;
            if (!video || !videoUrl || !video.duration) return;

            // Stop playback during active wheel interaction
            if (isPlaying) setIsPlaying(false);

            const now = Date.now();
            // Throttle to 30ms (approx 33fps max) to prevent decoder hang on Mac
            if (now - lastWheelSeekRef.current < 30) return;
            lastWheelSeekRef.current = now;

            const frameTime = 1 / 30;
            const step = -(e.deltaY / 20) * frameTime;
            const newTime = Math.min(video.duration, Math.max(0, video.currentTime + step));

            video.currentTime = newTime;
            setPlayed(newTime / video.duration);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [videoUrl, isPlaying, setIsPlaying, setPlayed]);

    // --- 7. SLIDER HANDLERS ---
    const handleSeekMouseDown = () => setSeeking(true);
    const handleSeekMouseUp = () => setSeeking(false);

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fraction = parseFloat(e.target.value);
        setPlayed(fraction);
        if (videoRef.current && videoRef.current.duration) {
            videoRef.current.currentTime = fraction * videoRef.current.duration;
        }
    };

    const jumpToBookmarkLocal = useCallback((direction: 'next' | 'prev') => {
        const { bookmarks, setSelectedChunkId, chunks } = useAnnotationStore.getState();
        if (bookmarks.length === 0) return;
        const video = videoRef.current;
        if (!video || !video.duration) return;

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
        setPlayed(targetTime / video.duration);

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
                onWaiting={startBuffering}
                onPlaying={clearBuffering}
                onSeeked={clearBuffering}
                onCanPlay={clearBuffering}
                onSuspend={clearBuffering}
                onEnded={() => { setIsPlaying(false); clearBuffering(); }}
                onClick={() => setIsPlaying(!isPlaying)}
                playsInline
                preload="auto"
            />

            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-20">
                    <RefreshCw className="text-emerald-500 animate-spin" size={48} />
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-4 pb-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.0001}
                        value={played}
                        onMouseDown={handleSeekMouseDown}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        className="w-full h-1.5 mb-3 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none"
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="text-white hover:text-emerald-400 focus:outline-none"
                            >
                                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                            </button>

                            <div className="flex items-center gap-1">
                                <button onClick={() => jumpToBookmarkLocal('prev')} className="text-neutral-400 hover:text-white p-1" title="前の栞">
                                    <SkipBack size={18} />
                                </button>
                                <button onClick={() => jumpToBookmarkLocal('next')} className="text-neutral-400 hover:text-white p-1" title="次の栞">
                                    <SkipForward size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 group/vol">
                                <button onClick={() => setMuted(!muted)} className="text-white hover:text-emerald-400">
                                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                                <input
                                    type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                                    onChange={(e) => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
                                    className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>

                            <span className="text-xs text-neutral-300 font-mono tabular-nums bg-black/40 px-2 py-0.5 rounded border border-neutral-800">
                                {formatTime(played * duration)} / {formatTime(duration)}
                            </span>
                        </div>

                        <button
                            onClick={() => addBookmark(played * duration)}
                            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-emerald-400 focus:outline-none"
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
