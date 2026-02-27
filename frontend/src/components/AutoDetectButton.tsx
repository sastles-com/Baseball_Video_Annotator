import React, { useRef } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import { useAnalysis } from '../hooks/useAnalysis';

export const AutoDetectButton: React.FC = () => {
    const { videoUrl, isAnalyzing, analysisProgress } = useVideoStore();
    const { detectCuts } = useAnalysis();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDetect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await detectCuts(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!videoUrl) return null;

    return (
        <div className="flex flex-col gap-2">
            <label
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-all duration-200
          ${isAnalyzing
                        ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                        : 'bg-violet-700 hover:bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                    }`}
            >
                {isAnalyzing ? (
                    <><Loader2 size={16} className="animate-spin" /> 解析中...</>
                ) : (
                    <><Zap size={16} /> カット手動検出</>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mov,video/quicktime"
                    className="hidden"
                    disabled={isAnalyzing}
                    onChange={handleDetect}
                />
            </label>
            {isAnalyzing && (
                <div className="px-1">
                    <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                        <span>Background Analysis</span>
                        <span>{analysisProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 transition-all duration-300"
                            style={{ width: `${analysisProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
