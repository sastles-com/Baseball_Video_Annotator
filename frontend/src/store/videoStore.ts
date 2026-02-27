import { create } from 'zustand';

interface VideoState {
    videoUrl: string | null;
    isPlaying: boolean;
    played: number; // 0 to 1
    duration: number; // in seconds
    volume: number;

    // Analysis state
    isAnalyzing: boolean;
    analysisProgress: number;
    detectionThreshold: number;
    currentFile: File | null;

    setVideoUrl: (url: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setPlayed: (played: number) => void;
    setDuration: (duration: number) => void;
    setVolume: (volume: number) => void;
    setAnalyzing: (isAnalyzing: boolean) => void;
    setAnalysisProgress: (progress: number) => void;
    setDetectionThreshold: (threshold: number) => void;
    setCurrentFile: (file: File | null) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
    videoUrl: null,
    isPlaying: false,
    played: 0,
    duration: 0,
    volume: 1,
    isAnalyzing: false,
    analysisProgress: 0,
    detectionThreshold: parseFloat(localStorage.getItem('video_analyzer_threshold') || '23.0'),
    currentFile: null,

    setVideoUrl: (url) => set({ videoUrl: url }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setPlayed: (played) => set({ played }),
    setDuration: (duration) => set({ duration }),
    setVolume: (volume) => set({ volume }),
    setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
    setAnalysisProgress: (analysisProgress) => set({ analysisProgress }),
    setDetectionThreshold: (detectionThreshold) => {
        localStorage.setItem('video_analyzer_threshold', detectionThreshold.toString());
        set({ detectionThreshold });
    },
    setCurrentFile: (currentFile) => set({ currentFile }),
}));
