import React, { useState } from 'react';
import { X, RefreshCw, Plus, Trash2, Tag as TagIcon, Settings2, FileUp } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useUIStore } from '../store/uiStore';
import { useAnalysis } from '../hooks/useAnalysis';

export const SettingsModal: React.FC = () => {
    const { isSettingsOpen, closeSettings } = useUIStore();
    const { detectionThreshold, setDetectionThreshold, isAnalyzing, currentFile } = useVideoStore();
    const {
        tagPresets, addCategory, removeCategory, addPresetTag, removePresetTag, importTagPresets
    } = useAnnotationStore();
    const { detectCuts } = useAnalysis();

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

    if (!isSettingsOpen) return null;

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const id = `cat_${Date.now()}`;
        addCategory(id, newCategoryName.trim());
        setNewCategoryName('');
    };

    const handleAddPreset = (categoryId: string) => {
        const val = newTagInputs[categoryId] || '';
        if (!val.trim()) return;
        addPresetTag(categoryId, val.trim());
        setNewTagInputs({ ...newTagInputs, [categoryId]: '' });
    };

    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (typeof json === 'object' && json !== null) {
                    importTagPresets(json);
                    alert('タグ設定をインポートしました。');
                } else {
                    alert('無効なJSON形式です。');
                }
            } catch (err) {
                alert('JSONの解析に失敗しました。');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeSettings}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings2 size={20} className="text-violet-400" />
                        <h2 className="text-lg font-bold text-neutral-100">設定</h2>
                    </div>
                    <button
                        onClick={closeSettings}
                        className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Section: Sensitivity */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <RefreshCw size={14} /> 自動検出設定
                        </h3>
                        <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-5 space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-neutral-300">検出感度 (低いほど敏感): {detectionThreshold}</label>
                                <div className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                                    初期値: 23.0
                                </div>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                step="0.5"
                                disabled={isAnalyzing}
                                value={detectionThreshold}
                                onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                                className={`w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-500 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            <p className="text-xs text-neutral-500">
                                ※ 感度を変更した後、サイドバーまたは下のボタンで動画を再解析する必要があります。
                            </p>
                            <button
                                onClick={() => currentFile && detectCuts(currentFile)}
                                disabled={isAnalyzing || !currentFile}
                                className={`w-full py-2.5 rounded-lg border flex justify-center items-center gap-2 transition-all duration-200 text-sm font-medium
                                ${isAnalyzing || !currentFile
                                        ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                                        : 'bg-violet-700 hover:bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-900/20'}`}
                            >
                                <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                                {isAnalyzing ? '解析中...' : '感度を適用して再解析'}
                            </button>
                        </div>
                    </section>

                    {/* Section: Dynamic Tag Categories */}
                    <section className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                <TagIcon size={14} className="text-emerald-400" /> タグプリセット管理
                            </h3>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded-lg border border-neutral-700 cursor-pointer transition-colors">
                                    <FileUp size={14} className="text-violet-400" /> JSONインポート
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={handleJsonImport}
                                    />
                                </label>
                                <div className="h-8 w-px bg-neutral-800 mx-1" />
                                <input
                                    type="text"
                                    placeholder="新しいカテゴリ(例: カウント)..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all w-48"
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="bg-violet-700 hover:bg-violet-600 text-white p-1.5 rounded-lg border border-violet-600 transition-colors shadow-lg shadow-violet-900/20"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                            {Object.entries(tagPresets).map(([id, category]) => (
                                <div key={id} className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-4 space-y-3 flex flex-col relative group border-t-2 border-t-violet-500/30">
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`カテゴリ「${category.label}」を削除してもよろしいですか？`)) {
                                                removeCategory(id);
                                            }
                                        }}
                                        className="absolute top-3 right-3 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="カテゴリを削除"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-2 pr-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        {category.label}
                                    </h4>

                                    <div className="flex flex-wrap gap-1.5 min-h-[40px] items-start">
                                        {category.tags.length > 0 ? (
                                            category.tags.map(tag => (
                                                <div key={tag} className="flex items-center gap-1 bg-neutral-800 border border-neutral-700/50 text-neutral-300 px-2 py-0.5 rounded-md text-[11px] hover:border-neutral-600 transition-colors group/tag">
                                                    {tag}
                                                    <button
                                                        onClick={() => removePresetTag(id, tag)}
                                                        className="text-neutral-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-neutral-600 italic">タグがありません</span>
                                        )}
                                    </div>

                                    <div className="flex gap-1.5 pt-1">
                                        <input
                                            type="text"
                                            placeholder="タグを追加..."
                                            value={newTagInputs[id] || ''}
                                            onChange={(e) => setNewTagInputs({ ...newTagInputs, [id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddPreset(id)}
                                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                                        />
                                        <button
                                            onClick={() => handleAddPreset(id)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 p-1.5 rounded-md border border-neutral-700 transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end shrink-0">
                    <button
                        onClick={closeSettings}
                        className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl transition-all font-medium border border-neutral-700"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
