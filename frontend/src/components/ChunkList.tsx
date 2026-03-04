import React, { memo } from 'react';
import { useAnnotationStore } from '../store/annotationStore';
import { useVideoStore } from '../store/videoStore';
import { Tag as TagIcon, PlayCircle } from 'lucide-react';

// Memoized Individual Chunk Item to avoid massive re-renders
const ChunkItem = memo(({ chunk, index, isSelected, onClick }: {
    chunk: any,
    index: number,
    isSelected: boolean,
    onClick: () => void
}) => {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border
                ${isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-neutral-800/40 border-neutral-700/50 hover:bg-neutral-800/60 hover:border-neutral-600'}`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${isSelected ? 'bg-emerald-500 text-white' : 'bg-neutral-700 text-neutral-400'}`}>
                <span className="text-xs font-bold">{index + 1}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-neutral-200 truncate">
                        セグメント {index + 1}
                    </span>
                    {isSelected && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded leading-none">
                            選択中
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-mono">
                    <span className="flex items-center gap-1">
                        <PlayCircle size={10} />
                        {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                    </span>
                </div>
            </div>

            <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
                <TagIcon size={14} />
            </div>
        </div>
    );
});

export const ChunkList: React.FC = () => {
    const chunks = useAnnotationStore(state => state.chunks);
    const selectedChunkId = useAnnotationStore(state => state.selectedChunkId);
    const setSelectedChunkId = useAnnotationStore(state => state.setSelectedChunkId);
    const triggerSeek = useVideoStore(state => state.triggerSeek);

    if (chunks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-500 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
                <TagIcon size={24} className="mb-2 opacity-20" />
                <p className="text-xs">解析データがありません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
                <h3 className="text-xs font-semibold text-neutral-400 flex items-center gap-2">
                    <TagIcon size={14} className="text-emerald-500" />
                    SEGMENTS ({chunks.length})
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {chunks.map((chunk, index) => (
                    <ChunkItem
                        key={chunk.id}
                        chunk={chunk}
                        index={index}
                        isSelected={selectedChunkId === chunk.id}
                        onClick={() => {
                            setSelectedChunkId(chunk.id);
                            triggerSeek(chunk.startTime);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
