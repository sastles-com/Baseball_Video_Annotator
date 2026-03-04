import React, { useRef, useState, useEffect } from 'react';
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
    // Select state
    const videoUrl = useVideoStore(state => state.videoUrl);
    const isPlaying = useVideoStore(state => state.isPlaying);
    const setIsPlaying = useVideoStore(state => state.setIsPlaying);
    const setDuration = useVideoStore(state => state.setDuration);
    const setPlayed = useVideoStore(state => state.setPlayed);
    const duration = useVideoStore(state => state.duration);
    const played = useVideoStore(state => state.played);
    const volume = useVideoStore(state => state.volume);
    const setVolume = useVideoStore(state => state.setVolume);

    const { addBookmark } = useAnnotationStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Local state to manage user interaction vs store sync
    const [isInternalSeeking, setIsInternalSeeking] = useState(false);
    const [muted, setMuted] = useState(false);

    // Initial mount log
    useEffect(() => {
        console.log("VideoPlayer mounted. URL:", videoUrl?.substring(0, 30));
        return () => console.log("VideoPlayer unmounted");
    }, []);

    // Sync play/pause
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl) return;

        if (isPlaying) {
            console.log("Playing video...");
            video.play().catch(err => {
                console.warn("Play failed:", err);
                setIsPlaying(false);
            });
        } else {
            console.log("Pausing video...");
            video.pause();
        }
    }, [isPlaying, videoUrl, setIsPlaying]);

    // Sync volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    // Sync store 'played' value to video.currentTime (External seek/jump)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || isInternalSeeking || !videoUrl || !video.duration || isNaN(video.duration) || video.duration <= 0) {
            return;
        }

        const targetTime = played * video.duration;
        // Significant difference threshold (0.2s)
        if (Math.abs(video.currentTime - targetTime) > 0.2) {
            console.log("Syncing External Seek ->", targetTime);
            video.currentTime = targetTime;
        }
    }, [played, isInternalSeeking, videoUrl]);

    // Internal time update from video element
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || isInternalSeeking || video.duration <= 0) return;

        const newPlayed = video.currentTime / video.duration;
        if (Math.abs(played - newPlayed) > 0.001) {
            setPlayed(newPlayed);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            console.log("Metadata Loaded. Duration:", videoRef.current.duration);
            setDuration(videoRef.current.duration);
        }
    };

    // Scrubber drag handlers
    const handleSeekMouseDown = () => {
        setIsInternalSeeking(true);
    };

    const handleSeekMouseUp = () => {
        setIsInternalSeeking(false);
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fraction = parseFloat(e.target.value);
        setPlayed(fraction);
        const video = videoRef.current;
        if (video && !isNaN(video.duration) && video.duration > 0) {
            video.currentTime = fraction * video.duration;
        }
    };

    // Frame stepping via wheel
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const video = videoRef.current;
            if (!video || !videoUrl || isNaN(video.duration) || video.duration <= 0) return;

            setIsPlaying(false);
            // 1/30s per step
            const step = -(e.deltaY / 20) * (1 / 30);
            const newTime = Math.min(video.duration, Math.max(0, video.currentTime + step));
            video.currentTime = newTime;
            setPlayed(newTime / video.duration);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [videoUrl, setIsPlaying, setPlayed]);

    const jumpToBookmark = (direction: 'next' | 'prev') => {
        const { bookmarks, setSelectedChunkId, chunks } = useAnnotationStore.getState();
        if (bookmarks.length === 0) return;

        const video = videoRef.current;
        const currentTime = video ? video.currentTime : (played * duration);
        let targetTime = 0;

        if (direction === 'prev') {
            const prev = [...bookmarks].reverse().find(b => b.time < currentTime - 0.5);
            targetTime = prev ? prev.time : 0;
        } else {
            const next = bookmarks.find(b => b.time > currentTime + 0.5);
            if (next) targetTime = next.time;
            else return;
        }

        if (video) video.currentTime = targetTime;
        setPlayed(targetTime / (duration || 1));

        const targetChunk = chunks.find(c => Math.abs(c.startTime - targetTime) < 0.1);
        if (targetChunk) {
            setSelectedChunkId(targetChunk.id);
        }
    };

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
                onLoadedData={() => console.log("Video: first frame loaded")}
                onCanPlay={() => console.log("Video: can play now")}
                onEnded={() => setIsPlaying(false)}
                onClick={() => setIsPlaying(!isPlaying)}
                onSeeking={() => console.log("Video: seeking...")}
                onSeeked={() => console.log("Video: seeked")}
                onError={(e) => {
                    const error = (e.target as HTMLVideoElement).error;
                    console.error("Video Error:", error?.code, error?.message);
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
                        value={played}
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
                                    onClick={() => jumpToBookmark('prev')}
                                    title="Prev (Left)"
                                    className="text-neutral-400 hover:text-white transition-colors focus:outline-none p-1"
                                >
                                    <SkipBack size={18} />
                                </button>
                                <button
                                    onClick={() => jumpToBookmark('next')}
                                    title="Next (Right)"
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
                                {formatTime(played * duration)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => addBookmark(played * duration)}
                                title="Add Bookmark (B)"
                                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-emerald-400 transition-colors focus:outline-none"
                            >
                                <BookmarkPlus size={16} />
                                栞を挿入 (B)
                            </button>
                            <span className="text-[10px] text-neutral-500 font-mono hidden md:block">
                                矢印キー: 移動 • ホイール: コマ送り
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
