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
import cv2
import numpy as np
import tempfile
import os
import uuid
import json
import asyncio

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    async def stream_analysis():
        # Save upload to a temp file
        suffix = os.path.splitext(file.filename or "video")[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
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
            yield json.dumps({
                "type": "result",
                "total_cuts": len(bookmarks),
                "bookmarks": bookmarks
            }) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(stream_analysis(), media_type="application/x-ndjson")
