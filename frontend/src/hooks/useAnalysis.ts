import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';

export const useAnalysis = () => {
    const { setAnalyzing, setAnalysisProgress, detectionThreshold, setBackendStatus } = useVideoStore();

    const checkBackendHealth = async () => {
        const { backendUrl } = useVideoStore.getState();
        const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${baseUrl}/api/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                setBackendStatus('online');
                return true;
            }
        } catch (err) {
            console.error("Backend health check failed:", err);
        }
        setBackendStatus('offline');
        return false;
    };

    const detectCuts = async (file: File) => {
        if (!file) return;

        // check health first
        const isOnline = await checkBackendHealth();
        if (!isOnline) {
            alert("バックエンドサーバーに接続できません。\nbash start_backend.sh でサーバーを起動してください。");
            return;
        }

        // Clear previous bookmarks for analysis
        useAnnotationStore.setState({ bookmarks: [], chunks: [] });

        setAnalyzing(true);
        setAnalysisProgress(0);

        try {
            const { backendUrl } = useVideoStore.getState();
            const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

            // --- Binary Chunked Upload (Raw blobs for performance) ---
            const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(7);

            for (let i = 0; i < totalChunks; i++) {
                // Yield to the main thread briefly for UI
                if (i % 3 === 0) await new Promise(resolve => setTimeout(resolve, 0));

                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                // Update progress (Upload is first 50%)
                setAnalysisProgress(Math.round(((i) / totalChunks) * 50));

                const formData = new FormData();
                formData.append('file', chunk, file.name);
                formData.append('index', i.toString());
                formData.append('total', totalChunks.toString());
                formData.append('session_id', sessionId);
                formData.append('filename', file.name);

                const uploadResponse = await fetch(`${baseUrl}/api/upload-chunk`, {
                    method: 'POST',
                    body: formData, // Sending raw binary as multipart/form-data
                });

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
                }
            }

            setAnalysisProgress(50); // Upload complete

            // --- Start Analysis on Assembled File ---
            const response = await fetch(`${baseUrl}/api/detect-cuts-chunked`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    filename: file.name,
                    threshold: detectionThreshold,
                }),
            });

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'progress') {
                            // Map 0-100 analysis progress to 50-100 overall progress
                            setAnalysisProgress(50 + Math.round(data.value / 2));
                        } else if (data.type === 'result') {
                            console.log("SUCCESS: Received final result!", data);
                            const store = useAnnotationStore.getState();
                            const { duration } = useVideoStore.getState();
                            store.setBookmarksAndChunks(data.bookmarks, duration);
                            setAnalysisProgress(100);
                        } else if (data.type === 'error') {
                            console.error("Analysis backend error:", data.message);
                            alert(`解析エラー: ${data.message}`);
                        }
                    } catch (e) {
                        console.error("JSON parse error on line:", line);
                    }
                }
            }
            if (buffer.trim()) {
                try {
                    const data = JSON.parse(buffer);
                    if (data.type === 'result') {
                        const store = useAnnotationStore.getState();
                        data.bookmarks.forEach((b: any) => store.addBookmark(b.time));
                        setAnalysisProgress(100);
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.error("Auto-detect failed:", err);
            setBackendStatus('offline');
            alert("解析に失敗しました。バックエンドとの接続を確認してください。");
        } finally {
            setAnalyzing(false);
        }
    };

    return { detectCuts, checkBackendHealth };
};
