import React, { useEffect } from 'react';
import { useContextMenuStore } from '../store/contextMenuStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useVideoStore } from '../store/videoStore';
import { BookmarkPlus, Tag as TagIcon, Play } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const ContextMenu: React.FC = () => {
    const { isOpen, x, y, time, targetChunkId, closeMenu } = useContextMenuStore();
    const {
        addBookmark, addTagToChunk,
        tagPresets
    } = useAnnotationStore();
    const { setPlayed, duration, setIsPlaying } = useVideoStore();

    useEffect(() => {
        const handleClickOutside = () => {
            if (isOpen) closeMenu();
        };
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside);
        };
    }, [isOpen, closeMenu]);

    if (!isOpen) return null;

    const handleAddBookmark = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (time !== null) {
            addBookmark(time);
        }
        closeMenu();
    };

    const handlePlayFromHere = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (time !== null && duration > 0) {
            setPlayed(time / duration);
            setIsPlaying(true);
        }
        closeMenu();
    };

    const handleAddTag = (e: React.MouseEvent, tagName: string) => {
        e.stopPropagation();
        if (targetChunkId) {
            addTagToChunk(targetChunkId, {
                id: uuidv4(),
                name: tagName,
                category: 'chunk'
            });
        }
        closeMenu();
    };

    return (
        <div
            className="fixed z-50 bg-neutral-900/90 backdrop-blur-xl border border-neutral-700 rounded-xl shadow-2xl py-2 min-w-[200px] overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-100"
            style={{ top: y, left: x }}
            onClick={(e) => e.stopPropagation()}
        >
            {time !== null && (
                <>
                    <button
                        className="w-full text-left px-4 py-2 text-neutral-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-2"
                        onClick={handleAddBookmark}
                    >
                        <BookmarkPlus size={16} /> Add Bookmark Here
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-2"
                        onClick={handlePlayFromHere}
                    >
                        <Play size={16} /> Play from here
                    </button>
                </>
            )}

            {targetChunkId && (
                <>
                    {time !== null && <div className="h-px bg-neutral-800 my-1 w-full" />}

                    {Object.entries(tagPresets).map(([id, category], index) => (
                        <React.Fragment key={id}>
                            {index > 0 && <div className="h-px bg-neutral-800 my-1 w-full" />}
                            <div className="px-4 py-1.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                                Quick Tags ({category.label})
                            </div>
                            {category.tags.length > 0 ? (
                                category.tags.map(tag => (
                                    <button
                                        key={tag}
                                        className="w-full text-left px-4 py-1.5 text-neutral-300 hover:bg-violet-900/30 transition-colors flex items-center gap-2 group"
                                        onClick={(e) => handleAddTag(e, tag)}
                                    >
                                        <TagIcon size={14} className="text-violet-400 group-hover:text-violet-300" /> {tag}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-1.5 text-[10px] text-neutral-600 italic">No tags</div>
                            )}
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    );
};
