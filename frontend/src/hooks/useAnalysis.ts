import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';

export const useAnalysis = () => {
    const { setAnalyzing, setAnalysisProgress, detectionThreshold, setBackendStatus } = useVideoStore();

    const checkBackendHealth = async () => {
        const { backendUrl } = useVideoStore.getState();
        const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('threshold', detectionThreshold.toString());

            const { backendUrl } = useVideoStore.getState();
            const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

            const response = await fetch(`${baseUrl}/api/detect-cuts`, {
                method: 'POST',
                body: formData,
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
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        console.log("Received analysis data:", data);
                        if (data.type === 'progress') {
                            setAnalysisProgress(data.value);
                        } else if (data.type === 'result') {
                            const store = useAnnotationStore.getState();
                            data.bookmarks.forEach((b: any) => store.addBookmark(b.time));
                            setAnalysisProgress(100);
                        } else if (data.type === 'error') {
                            console.error("Analysis error:", data.message);
                            alert(`解析エラー: ${data.message}`);
                        }
                    } catch (e) {
                        console.error("Error parsing progress line:", e);
                    }
                }
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
