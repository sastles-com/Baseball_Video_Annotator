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
            className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer group
                ${isSelected
                    ? 'bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/20'
                    : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700/80'}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border
                        ${isSelected
                            ? 'bg-emerald-500 text-neutral-900 border-emerald-400'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-700'}`}>
                        #{index + 1}
                    </span>
                    <span className={`text-xs font-mono font-medium
                        ${isSelected ? 'text-emerald-400' : 'text-neutral-300 group-hover:text-emerald-400'}`}>
                        {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                    </span>
                </div>
                <PlayCircle size={14} className={isSelected ? 'text-emerald-400' : 'text-neutral-600 opacity-0 group-hover:opacity-100'} />
            </div>

            {/* Tags area */}
            <div className="flex flex-wrap gap-1">
                {chunk.tags.length > 0 ? (
                    chunk.tags.map((t: any) => (
                        <span key={t.id} className="text-[10px] bg-blue-900/40 text-blue-200 border border-blue-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            {t.name}
                        </span>
                    ))
                ) : (
                    <span className="text-[10px] text-neutral-600 italic">No tags</span>
                )}
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
            <div className="flex flex-col items-center justify-center p-8 text-neutral-600 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 border-dashed">
                <TagIcon size={20} className="mb-2 opacity-20" />
                <p className="text-xs">解析結果が見つかりません</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar py-1">
            {chunks.map((chunk, index) => (
                <ChunkItem
                    key={chunk.id}
                    chunk={chunk}
                    index={index}
                    isSelected={selectedChunkId === chunk.id}
                    onClick={() => {
                        triggerSeek(chunk.startTime);
                        setSelectedChunkId(chunk.id);
                    }}
                />
            ))}
        </div>
    );
};
