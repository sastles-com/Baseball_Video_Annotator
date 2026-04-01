import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useAnnotationStore } from '../store/annotationStore';

export const ImportButton: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importAnnotations = useAnnotationStore((s) => s.importAnnotations);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                if (!json.annotations) {
                    alert("無効なJSONファイルです。annotations フィールドが見つかりません。");
                    return;
                }

                const { globalTags, sectionTags, bookmarks, chunks } = json.annotations;
                importAnnotations({
                    globalTags: globalTags || [],
                    sectionTags: sectionTags || [],
                    bookmarks: bookmarks || [],
                    chunks: chunks || [],
                });

                alert("アノテーションをインポートしました。");
            } catch (err) {
                alert("JSONの解析に失敗しました。");
                console.error(err);
            }
        };
        reader.readAsText(file);

        // Reset input so the same file can be re-imported
        e.target.value = '';
    };

    return (
        <>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
            >
                <Upload size={16} className="text-emerald-500" /> Import JSON
            </button>
            <input
                type="file"
                accept=".json"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImport}
            />
        </>
    );
};
