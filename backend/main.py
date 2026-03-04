"""
Baseball Video Analyzer - FastAPI Backend

Purpose: Provide API endpoints for video analysis, focusing on cut point detection.
Main Endpoint: POST /api/detect-cuts
  - Accepts a video file upload
  - Streams progress updates as JSON chunks
  - Final chunk contains the detected bookmarks
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import cv2
import numpy as np
import tempfile
import os
import uuid
import json
import base64
import logging

# Filter out health check logs to reduce noise
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "/api/health" not in record.getMessage()

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

app = FastAPI(
    title="Baseball Video Analyzer API",
    description="Backend API for frame cut detection in baseball match videos",
    version="1.1.0"
)

# Allow requests from local dev and lolipop
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://tajmahal.mond.jp",
        "https://mc.lolipop.jp",
    ],
    allow_origin_regex="https://.*\\.mc\\.lolipop\\.jp",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Use disk-backed directory for temp files (server /tmp is only 256MB tmpfs)
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/detect-cuts")
async def detect_cuts(
    file: UploadFile = File(...),
    threshold: float = Form(50.0),
    min_interval: float = Form(0.5),
):
    """
    Detect frame cuts (camera stop/restart) in a baseball video.
    Streams progress updates back to the client.
    """

    # Validate file type
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a video.")

    # Save upload to disk-backed uploads dir (not /tmp which is tiny tmpfs)
    suffix = os.path.splitext(file.filename or "video")[1] or ".mp4"
    tmp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{suffix}")
    with open(tmp_path, "wb") as f:
        f.write(await file.read())

    return StreamingResponse(_run_video_analysis(tmp_path, threshold, min_interval), media_type="application/x-ndjson")


# --- Pydantic models for JSON-based chunk upload ---
class ChunkUploadRequest(BaseModel):
    data: str  # Base64-encoded binary chunk
    chunkIndex: int
    totalChunks: int
    sessionId: str
    filename: str

class ChunkedAnalysisRequest(BaseModel):
    sessionId: str
    filename: str
    threshold: float = 50.0
    min_interval: float = 0.5


@app.post("/api/upload-chunk")
async def upload_chunk(req: ChunkUploadRequest):
    """
    Receive a Base64-encoded chunk of a video file and append it to a temporary file.
    Uses JSON body instead of multipart/form-data to bypass Lolipop's reverse proxy restrictions.
    """
    tmp_path = os.path.join(UPLOAD_DIR, f"{req.sessionId}.part")
    
    # Decode Base64 data back to binary
    chunk_bytes = base64.b64decode(req.data)
    
    # Append mode for index > 0, write mode for the first chunk
    mode = "ab" if req.chunkIndex > 0 else "wb"
    with open(tmp_path, mode) as f:
        f.write(chunk_bytes)
        
    return {"status": "success", "chunkIndex": req.chunkIndex, "totalChunks": req.totalChunks}

@app.post("/api/detect-cuts-chunked")
async def detect_cuts_chunked(req: ChunkedAnalysisRequest):
    """
    Start analysis on a fully assembled chunked video file.
    """
    tmp_path_part = os.path.join(UPLOAD_DIR, f"{req.sessionId}.part")
    
    if not os.path.exists(tmp_path_part):
        raise HTTPException(status_code=400, detail="Chunked file not found. Upload might have failed.")
        
    suffix = os.path.splitext(req.filename)[1] or ".mp4"
    valid_tmp_path = os.path.join(UPLOAD_DIR, f"{req.sessionId}{suffix}")
    
    # Rename to have a valid video extension for OpenCV
    os.rename(tmp_path_part, valid_tmp_path)
    
    return StreamingResponse(_run_video_analysis(valid_tmp_path, req.threshold, req.min_interval), media_type="application/x-ndjson")

async def _run_video_analysis(video_path: str, threshold: float, min_interval: float):
    """
    Shared generator function to run OpenCV analysis and yield JSON progress.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            yield json.dumps({"type": "error", "message": "Could not open video file"}) + "\n"
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        
        yield json.dumps({"type": "start", "total_frames": total_frames}) + "\n"

        prev_gray = None
        cut_times = []
        last_cut_time = -min_interval

        frame_idx = 0
        # Report progress every 5%
        report_step = max(1, total_frames // 20)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            current_time_sec = frame_idx / fps

            if prev_gray is not None:
                diff = float(np.mean(cv2.absdiff(gray, prev_gray)))
                if diff > threshold and (current_time_sec - last_cut_time) >= min_interval:
                    cut_times.append(round(current_time_sec, 3))
                    last_cut_time = current_time_sec

            prev_gray = gray
            frame_idx += 1

            if frame_idx % report_step == 0:
                progress = int((frame_idx / total_frames) * 100)
                yield json.dumps({"type": "progress", "value": progress}) + "\n"
                # Give some breathing room for the stream
                await asyncio.sleep(0.01)

        cap.release()

        # Result
        bookmarks = [{"id": str(uuid.uuid4()), "time": t} for t in cut_times]
        final_json = json.dumps({
            "type": "result",
            "total_cuts": len(bookmarks),
            "bookmarks": bookmarks
        }) + "\n"
        
        # Padding to force Nginx buffer flush (typically 4KB needed, we send a bit)
        padding = " " * 4096 + "\n"
        yield final_json + padding

    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)
