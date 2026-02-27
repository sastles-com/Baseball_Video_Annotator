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

export const VideoPlayer: React.FC = () => {
    const { videoUrl, isPlaying, setIsPlaying, setDuration, setPlayed, duration, played, volume, setVolume } = useVideoStore();
    const { addBookmark } = useAnnotationStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [seeking, setSeeking] = useState(false);
    const [muted, setMuted] = useState(false);

    // Sync play/pause state to the video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            video.play().catch(() => setIsPlaying(false));
        } else {
            video.pause();
        }
    }, [isPlaying, setIsPlaying]);

    // Sync volume
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = muted ? 0 : volume;
    }, [volume, muted]);

    // Sync played fraction back to video (handles external seeks like hotkeys)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || seeking || !videoUrl) return;

        const storeTime = played * (video.duration || 0);
        // Only seek if the difference is significant (> 0.1s)
        if (Math.abs(video.currentTime - storeTime) > 0.1) {
            video.currentTime = storeTime;
        }
    }, [played, seeking, videoUrl]);

    // Update played fraction continuously
    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video || seeking) return;
        if (video.duration > 0) {
            setPlayed(video.currentTime / video.duration);
        }
    }, [seeking, setPlayed]);

    const handleLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        setDuration(video.duration);
    }, [setDuration]);

    // Mouse wheel scrubbing — step 1 frame (1/30s)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const video = videoRef.current;
            if (!video || !videoUrl) return;
            setIsPlaying(false);

            // Frame-based stepping scaled by deltaY
            // Typical deltaY is 100. Let's make 100 move ~5 frames (5/30s)
            const frameTime = 1 / 30;
            const step = -(e.deltaY / 20) * frameTime;

            video.currentTime = Math.min(
                video.duration || 0,
                Math.max(0, video.currentTime + step)
            );
            setPlayed(video.currentTime / (video.duration || 1));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [videoUrl, setIsPlaying, setPlayed]);

    const handleSeekMouseDown = () => setSeeking(true);

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fraction = parseFloat(e.target.value);
        setPlayed(fraction);
        if (videoRef.current) {
            videoRef.current.currentTime = fraction * (videoRef.current.duration || 0);
        }
    };

    const handleSeekMouseUp = () => setSeeking(false);

    const jumpToBookmark = (direction: 'next' | 'prev') => {
        const bookmarks = useAnnotationStore.getState().bookmarks;
        if (bookmarks.length === 0) return;

        const currentTime = videoRef.current ? videoRef.current.currentTime : (played * duration);

        if (direction === 'prev') {
            // Find the closest bookmark before current time
            const prev = [...bookmarks].reverse().find(b => b.time < currentTime - 0.5);
            const targetTime = prev ? prev.time : 0;
            if (videoRef.current) videoRef.current.currentTime = targetTime;
            setPlayed(targetTime / (duration || 1));
        } else {
            // Find the closest bookmark after current time
            const next = bookmarks.find(b => b.time > currentTime + 0.5);
            if (next) {
                if (videoRef.current) videoRef.current.currentTime = next.time;
                setPlayed(next.time / (duration || 1));
            }
        }
    };

    if (!videoUrl) return null;

    const currentTime = played * duration;

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex flex-col group relative rounded-2xl overflow-hidden bg-black ring-1 ring-white/5 shadow-2xl"
        >
            {/* Native video element */}
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain flex-1"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                playsInline
            />

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {/* Seek bar */}
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.0001}
                    value={played}
                    onMouseDown={handleSeekMouseDown}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekMouseUp}
                    className="w-full h-1.5 mb-3 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                {/* Bottom controls row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="text-white hover:text-emerald-400 transition-colors focus:outline-none"
                        >
                            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => jumpToBookmark('prev')}
                                title="Previous Bookmark"
                                className="text-neutral-400 hover:text-white transition-colors focus:outline-none p-1"
                            >
                                <SkipBack size={18} />
                            </button>
                            <button
                                onClick={() => jumpToBookmark('next')}
                                title="Next Bookmark"
                                className="text-neutral-400 hover:text-white transition-colors focus:outline-none p-1"
                            >
                                <SkipForward size={18} />
                            </button>
                        </div>

                        {/* Volume */}
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

                        {/* Time display */}
                        <span className="text-xs text-neutral-300 font-mono tabular-nums">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Add bookmark button in player */}
                        <button
                            onClick={() => addBookmark(currentTime)}
                            title="Add Bookmark (B)"
                            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-emerald-400 transition-colors focus:outline-none"
                        >
                            <BookmarkPlus size={16} />
                            栞を挿入 (B)
                        </button>
                        <span className="text-xs text-neutral-500 font-mono hidden md:block">
                            ホイール: コマ送り • 右クリック: メニュー
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
