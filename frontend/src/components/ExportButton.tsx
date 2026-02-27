import React from 'react';
import { useAnnotationStore } from '../store/annotationStore';
import { Download } from 'lucide-react';

export const ExportButton: React.FC = () => {
    const { bookmarks, chunks, globalTags, sectionTags } = useAnnotationStore();

    const handleExport = () => {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            annotations: {
                globalTags,
                sectionTags,
                bookmarks: bookmarks.map(b => ({ id: b.id, time: b.time })),
                chunks: chunks.map(c => ({
                    id: c.id,
                    startTime: c.startTime,
                    endTime: c.endTime,
                    tags: c.tags
                }))
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `baseball_annotations_${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-900/20"
        >
            <Download size={16} /> Export JSON
        </button>
    );
};
