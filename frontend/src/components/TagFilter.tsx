import React, { useState } from 'react';
import { useAnnotationStore } from '../store/annotationStore';
import { Filter, X } from 'lucide-react';

export const TagFilter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { tagPresets, activeTagFilters, toggleTagFilter, clearAllFilters } = useAnnotationStore();

    const activeCount = Object.values(activeTagFilters).reduce((sum, tags) => sum + tags.length, 0);
    const categories = Object.entries(tagPresets);

    if (categories.length === 0) return null;

    return (
        <div className="mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors w-full
                    ${activeCount > 0
                        ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-300'}`}
            >
                <Filter size={12} />
                <span>フィルタ</span>
                {activeCount > 0 && (
                    <span className="ml-auto bg-emerald-500 text-neutral-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {activeCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="mt-2 p-3 bg-neutral-800/80 border border-neutral-700 rounded-xl space-y-3">
                    {categories.map(([categoryId, category]) => {
                        const selectedTags = activeTagFilters[categoryId] || [];
                        return (
                            <div key={categoryId}>
                                <div className="text-[10px] text-neutral-500 mb-1.5 uppercase tracking-wider">
                                    {category.label}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {category.tags.map(tagName => {
                                        const isActive = selectedTags.includes(tagName);
                                        return (
                                            <button
                                                key={tagName}
                                                onClick={() => toggleTagFilter(categoryId, tagName)}
                                                className={`text-xs px-2 py-0.5 rounded-md border transition-colors
                                                    ${isActive
                                                        ? 'bg-emerald-600/40 border-emerald-500/50 text-emerald-300'
                                                        : 'bg-neutral-700/50 border-neutral-600 text-neutral-400 hover:text-neutral-300 hover:border-neutral-500'}`}
                                            >
                                                {tagName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {activeCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                            <X size={10} /> クリア
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
