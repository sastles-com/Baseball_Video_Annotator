import React, { useState, useEffect } from 'react';
import { Upload, Settings, Scissors, RefreshCw } from 'lucide-react';
import { useVideoStore } from './store/videoStore';
import { useAnnotationStore } from './store/annotationStore';
import { useContextMenuStore } from './store/contextMenuStore';
import { useUIStore } from './store/uiStore';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { ChunkList } from './components/ChunkList';
import { ContextMenu } from './components/ContextMenu';
import { SettingsModal } from './components/SettingsModal';
import { ExportButton } from './components/ExportButton';
import { ImportButton } from './components/ImportButton';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAnalysis } from './hooks/useAnalysis';

function App() {
  const {
    videoUrl, setVideoUrl, isPlaying, setIsPlaying, played, duration, setPlayed,
    isAnalyzing, analysisProgress, detectionThreshold,
    setCurrentFile
  } = useVideoStore();
  const { addBookmark, initializePresets } = useAnnotationStore();
  const { openMenu } = useContextMenuStore();
  const { openSettings } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const { detectCuts } = useAnalysis();

  useEffect(() => {
    initializePresets();
  }, [initializePresets]);

  // Keyboard Shortcuts
  useHotkeys('space', (e) => {
    e.preventDefault();
    if (videoUrl) setIsPlaying(!isPlaying);
  }, [isPlaying, videoUrl]);

  useHotkeys('b', (e) => {
    e.preventDefault();
    if (videoUrl && duration > 0) {
      addBookmark(played * duration);
    }
  }, [played, duration, videoUrl]);

  useHotkeys('shift+b', (e) => {
    e.preventDefault();
    if (!videoUrl || duration === 0) return;
    const currentTime = played * duration;
    const state = useAnnotationStore.getState();
    const target = state.bookmarks.find(b => Math.abs(b.time - currentTime) < 0.5);
    if (target) {
      state.removeBookmark(target.id);
    }
  }, [played, duration, videoUrl]);

  useHotkeys('left', (e) => {
    e.preventDefault();
    jumpToBookmark('prev');
  }, [played, duration, videoUrl]);

  useHotkeys('right', (e) => {
    e.preventDefault();
    jumpToBookmark('next');
  }, [played, duration, videoUrl]);

  const jumpToBookmark = (direction: 'next' | 'prev') => {
    const state = useAnnotationStore.getState();
    const bookmarks = state.bookmarks;
    if (bookmarks.length === 0 || !videoUrl) return;

    const currentTime = played * duration;
    let targetTime = 0;

    if (direction === 'prev') {
      const prev = [...bookmarks].reverse().find(b => b.time < currentTime - 0.5);
      targetTime = prev ? prev.time : 0;
    } else {
      const next = bookmarks.find(b => b.time > currentTime + 0.5);
      if (next) {
        targetTime = next.time;
      } else {
        return;
      }
    }

    const playedValue = targetTime / (duration || 1);
    setPlayed(playedValue);

    const targetChunk = state.chunks.find(c => Math.abs(c.startTime - targetTime) < 0.1);
    if (targetChunk) {
      state.setSelectedChunkId(targetChunk.id);
    }
  };

  useHotkeys('mod+z', (e) => {
    e.preventDefault();
    useAnnotationStore.getState().undo();
  });

  useHotkeys('[', (e) => {
    e.preventDefault();
    jumpToBookmark('prev');
  }, [played, duration, videoUrl]);

  useHotkeys(']', (e) => {
    e.preventDefault();
    jumpToBookmark('next');
  }, [played, duration, videoUrl]);

  const processFile = (file: File) => {
    if (file) {
      useAnnotationStore.setState({ bookmarks: [], chunks: [] });
      setCurrentFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      detectCuts(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|qt)$/i))) {
      processFile(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!videoUrl || duration === 0) return;

    const currentTime = played * duration;
    const state = useAnnotationStore.getState();

    const targetChunkId = state.selectedChunkId || state.chunks.find(
      c => currentTime >= c.startTime && currentTime <= c.endTime
    )?.id;

    openMenu(e.clientX, e.clientY, currentTime, targetChunkId ?? undefined);
  };

  return (
    <div
      className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans overflow-hidden select-none outline-none"
      onContextMenu={handleContextMenu}
      tabIndex={0}
    >
      <ContextMenu />
      <SettingsModal />

      {/* Header */}
      <header className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Scissors size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
            Baseball Video Annotator
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ImportButton />
          <ExportButton />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left side: Video Player and Timeline */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div
            className={`flex-1 min-h-0 bg-neutral-900/50 rounded-2xl relative transition-all duration-300
               ${isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-900/10' : ''}
             `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {videoUrl ? (
              <VideoPlayer />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 absolute inset-0 bg-neutral-900/50 border border-neutral-800 border-dashed rounded-2xl">
                <div className="w-20 h-20 rounded-full bg-neutral-800/80 flex items-center justify-center mb-6 border border-neutral-700/50 shadow-xl">
                  <Upload size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-200 mb-2">Upload Match Video</h2>
                <p className="text-neutral-500 mb-8 max-w-sm text-center text-sm">
                  Drag and drop your MP4/WebM file here.<br />
                  <span className="text-xs text-neutral-600 mt-2 block">Shortcuts: Space (Play/Pause), B (Bookmark), Arrows (Seek)</span>
                </p>
                <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 rounded-xl cursor-pointer transition-all duration-200 shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 pointer-events-auto">
                  Select Video File
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mov,.mkv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-x-0 bottom-8 flex justify-center z-20 pointer-events-none">
                <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 w-72 pointer-events-auto scale-in duration-300">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <RefreshCw size={16} className="animate-spin" />
                    Analyzing cuts ({analysisProgress}%)...
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="shrink-0 h-40">
            <Timeline />
          </div>
        </div>

        {/* Right side: Sidebar for tags and chunks */}
        <aside className="w-96 bg-neutral-900/80 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl backdrop-blur-md shrink-0 z-10">
          <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-neutral-200">Video Segments</h2>
              <p className="text-xs text-neutral-500 mt-1">Generated chunks from bookmarks</p>
            </div>
            <button
              onClick={openSettings}
              className="text-neutral-400 hover:text-white transition-colors p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700"
            >
              <Settings size={16} />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-hidden flex flex-col">
            {videoUrl ? (
              <>
                <div className="flex-1 overflow-y-auto">
                  <ChunkList />
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800 shrink-0 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-semibold text-neutral-300">ツール</h3>
                    <div className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                      感度: {detectionThreshold}
                    </div>
                  </div>

                  <div className="px-1 space-y-2">
                    <div className="flex justify-between text-[10px] text-neutral-500">
                      <span>検出感度 (低いほど敏感)</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="0.5"
                      disabled={isAnalyzing}
                      value={detectionThreshold}
                      onChange={(e) => useVideoStore.getState().setDetectionThreshold(parseFloat(e.target.value))}
                      className={`w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-500 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <button
                    onClick={() => useVideoStore.getState().currentFile && detectCuts(useVideoStore.getState().currentFile!)}
                    disabled={isAnalyzing || !useVideoStore.getState().currentFile}
                    className={`w-full py-2 rounded-lg border flex justify-center items-center gap-2 transition-all duration-200 text-sm
                      ${isAnalyzing || !useVideoStore.getState().currentFile
                        ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                        : 'bg-violet-700 hover:bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-900/20'}`}
                  >
                    <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                    {isAnalyzing ? '解析中...' : '閾値を適用して再解析'}
                  </button>

                  <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm py-2 rounded-lg border border-neutral-700 transition-colors flex justify-center items-center gap-2">
                    <span className="text-emerald-500">+</span> グローバルタグ追加 (チーム・投手名)
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-700/50 p-8 flex flex-col items-center justify-center text-center h-full">
                <Scissors size={24} className="text-neutral-600 mb-3" />
                <p className="text-neutral-400 text-sm">Upload a video to start segmenting into chunks.</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
