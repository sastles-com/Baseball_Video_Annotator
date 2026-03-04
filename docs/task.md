# Video Annotation Tool Tasks

- [x] Environment Setup & Backend
  - [x] Initialize FastAPI & OpenCV backend.
  - [x] Implement streaming /api/detect-cuts endpoint.
- [x] Frontend Core & Video Player
  - [x] Refactor to native HTML5 video for better control.
  - [x] Implement scrubbing and navigation buttons.
  - [x] Implement bookmark jumping (←/→) and video sync.
- [x] Bookmark & Analysis Enhancements
  - [x] Automatic cut detection on video load.
  - [x] Streaming progress bar (floating UI).
  - [x] Bookmark deletion (Shift+B & context menu).
  - [x] Sensitivity slider for cut detection.
  - [x] Re-analysis button logic.
- [x] Settings & Customization
  - [x] Settings Modal (Sensitivity & Categories).
  - [x] Dynamic Tag Categories (Add/Remove).
  - [x] JSON Tag Import (Import tags.json).
  - [x] Persistence (localStorage).
  - [x] Backend URL Configuration (for production/local mix).
- [x] Final Polish & Docs
  - [x] Verify all keyboard shortcuts.
  - [x] Complete walkthrough (Include Delete Bookmark & JSON Import).
  - [x] Deploy to Lolipop Managed Cloud (Fixing Nginx/CORS/Disk limits).
  - [x] Debugging Video Playback & Seeking issues (Memoization & Async processing).

