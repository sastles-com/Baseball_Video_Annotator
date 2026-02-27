import React from 'react';
import { useAnnotationStore } from '../store/annotationStore';
import { useVideoStore } from '../store/videoStore';
import { Tag as TagIcon, PlayCircle, Plus } from 'lucide-react';

export const ChunkList: React.FC = () => {
    const { chunks, selectedChunkId, setSelectedChunkId } = useAnnotationStore();
    const { setPlayed, duration } = useVideoStore();

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleChunkClick = (chunkId: string, startTime: number) => {
        if (duration > 0) {
            setPlayed(startTime / duration);
            setSelectedChunkId(chunkId);
        }
    };

    if (chunks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-neutral-500 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <TagIcon size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No chunks yet.</p>
                <p className="text-xs mt-1">Add bookmarks on the timeline to create chunks.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {chunks.map((chunk, index) => (
                <div
                    key={chunk.id}
                    className={`bg-neutral-800 border p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2 group
                        ${selectedChunkId === chunk.id
                            ? 'bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/20'
                            : 'hover:bg-neutral-700/80 border-neutral-700'}`}
                    onClick={() => handleChunkClick(chunk.id, chunk.startTime)}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors
                                ${selectedChunkId === chunk.id
                                    ? 'bg-emerald-500 text-neutral-900 border-emerald-400'
                                    : 'bg-neutral-900 text-neutral-300 border-neutral-700'}`}>
                                #{index + 1}
                            </span>
                            <span className={`text-sm font-mono transition-colors
                                ${selectedChunkId === chunk.id ? 'text-emerald-400' : 'text-neutral-300 group-hover:text-emerald-400'}`}>
                                {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                            </span>
                        </div>
                        <button
                            className="opacity-0 group-hover:opacity-100 p-1 text-emerald-400 hover:text-emerald-300 transition-opacity bg-emerald-900/30 rounded"
                            title="Play from this chunk"
                        >
                            <PlayCircle size={16} />
                        </button>
                    </div>

                    {/* Tags area for this chunk */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {chunk.tags.length > 0 ? (
                            chunk.tags.map(t => (
                                <span key={t.id} className="text-xs bg-blue-900/50 text-blue-200 border border-blue-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <TagIcon size={10} /> {t.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-neutral-500 flex items-center gap-1 italic">
                                No tags assigned
                            </span>
                        )}
                        <button
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors border border-neutral-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Open tag assignment modal/popover
                                alert('Tagging UI coming soon!');
                            }}
                        >
                            <Plus size={12} /> Add Tag
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
