import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';

export const useAnalysis = () => {
    const { setAnalyzing, setAnalysisProgress, detectionThreshold } = useVideoStore();

    const detectCuts = async (file: File) => {
        if (!file) return;

        // Clear previous bookmarks for analysis
        useAnnotationStore.setState({ bookmarks: [], chunks: [] });

        setAnalyzing(true);
        setAnalysisProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('threshold', detectionThreshold.toString());

            const response = await fetch('http://localhost:8000/api/detect-cuts', {
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
                        if (data.type === 'progress') {
                            setAnalysisProgress(data.value);
                        } else if (data.type === 'result') {
                            const store = useAnnotationStore.getState();
                            data.bookmarks.forEach((b: any) => store.addBookmark(b.time));
                            setAnalysisProgress(100);
                        } else if (data.type === 'error') {
                            console.error("Analysis error:", data.message);
                        }
                    } catch (e) {
                        console.error("Error parsing progress line:", e);
                    }
                }
            }
        } catch (err) {
            console.error("Auto-detect failed:", err);
        } finally {
            setAnalyzing(false);
        }
    };

    return { detectCuts };
};
