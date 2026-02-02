# Implementation Plan: Acro SaaS Demo Video Creation Tool

## Overview

This implementation plan breaks down the Acro project into discrete, incremental coding tasks. The plan follows a bottom-up approach: Backend → Extension → Dashboard → Editor, ensuring each component can be tested independently before integration.

The implementation includes comprehensive testing with both property-based tests and unit tests for all components.

## Tasks

### Phase 1: Backend Foundation

- [x] 1. Set up Python Flask backend project structure
  - Create project directory with virtual environment
  - Install dependencies: Flask, SQLAlchemy, MySQL connector, gTTS, Pillow, pytest, hypothesis
  - Create folder structure: models/, routes/, services/, utils/
  - Set up configuration management (config.py) for database and storage paths
  - Create app.py with Flask application initialization
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 2. Implement database models and schema
  - [x] 2.1 Create SQLAlchemy models for Projects, Folders, and Steps
    - Define Project model with id, uuid, title, folder_id, thumbnail_url, created_at, deleted_at
    - Define Folder model with id, name, type, created_at
    - Define Step model with id, project_id, order_index, action_type, target_text, script_text, audio_url, image_url, pos_x, pos_y, duration_frames
    - Set up relationships and foreign keys
    - _Requirements: 18.1, 18.2, 18.3_
  
  - [x] 2.2 Write property test for soft delete preservation
    - **Property 14: Soft delete preservation**
    - **Validates: Requirements 18.4, 18.5**
  
  - [x] 2.3 Write property test for default folder assignment
    - **Property 17: Default folder assignment**
    - **Validates: Requirements 23.3**

- [x] 3. Implement storage service for file management
  - [x] 3.1 Create StorageService class in services/storage_service.py
    - Implement save_image() to decode Base64 and save PNG files
    - Implement save_audio() to save MP3 files
    - Implement generate_thumbnail() to create 320x180 thumbnails
    - Generate unique filenames using UUID and timestamp
    - Return URLs in format /static/images/{filename} or /static/audio/{filename}
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 3.2 Write property test for image processing pipeline
    - **Property 30: Image processing pipeline**
    - **Validates: Requirements 17.1, 17.2, 17.3**
  
  - [x] 3.3 Write property test for thumbnail generation
    - **Property 31: Thumbnail generation**
    - **Validates: Requirements 15.5, 25.5**


- [x] 4. Implement TTS service for audio generation
  - [x] 4.1 Create TTSService class in services/tts_service.py
    - Implement generate_audio() using gTTS to convert text to MP3
    - Implement calculate_duration_frames() to compute frame count from audio duration (30 FPS)
    - Save generated audio files using StorageService
    - Return tuple of (audio_url, duration_frames)
    - Handle TTS failures gracefully by returning None for audio_url
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [x] 4.2 Write property test for TTS audio generation
    - **Property 27: TTS audio generation**
    - **Validates: Requirements 16.1, 16.2, 11.3, 11.4**
  
  - [x] 4.3 Write property test for duration calculation accuracy
    - **Property 28: Duration calculation accuracy**
    - **Validates: Requirements 16.3**
  
  - [x] 4.4 Write unit test for TTS failure graceful degradation
    - Test that TTS failures return None for audio_url with warning
    - _Requirements: 16.5, 24.5_

- [-] 5. Implement recording session API endpoints
  - [x] 5.1 Create routes/recording.py with session management endpoints
    - Implement POST /api/recording/start to create session and return session_id
    - Implement POST /api/recording/chunk to accept Step data and save to database
    - In chunk endpoint: decode Base64 image, save via StorageService, create Step record
    - Implement POST /api/recording/stop to finalize session and return project_id and redirect_url
    - Generate thumbnail from first Step's image on session stop
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 5.2 Write property test for session finalization
    - **Property 32: Session finalization**
    - **Validates: Requirements 15.4**
  
  - [ ] 5.3 Write unit tests for chunk upload edge cases
    - Test invalid Base64 data handling
    - Test missing required fields
    - _Requirements: 15.2, 15.3_

- [x] 6. Implement project management API endpoints
  - [x] 6.1 Create routes/projects.py with CRUD endpoints
    - Implement POST /api/projects to create new project
    - Implement GET /api/projects with optional folder_id filter
    - Implement GET /api/projects/{id} to return project details
    - Implement GET /api/projects/{id}/details to return project with all Steps
    - Implement PUT /api/projects/{id} to update title or folder_id
    - Implement DELETE /api/projects/{id} to soft delete (set deleted_at)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 6.2 Write property test for trash folder exclusion
    - **Property 15: Trash folder exclusion**
    - **Validates: Requirements 23.4**

- [x] 7. Implement folder management and step update endpoints
  - [x] 7.1 Create routes/folders.py and routes/steps.py
    - Implement GET /api/folders to return all folders
    - Implement POST /api/folders to create new folder
    - Implement PUT /api/folders/{id} to rename folder
    - Implement DELETE /api/folders/{id} with system folder protection
    - Implement POST /api/steps/{id}/update_script to regenerate TTS
    - _Requirements: 7.1, 7.3, 7.4, 11.2, 11.3_
  
  - [x] 7.2 Write property test for system folder protection
    - **Property 16: System folder protection**
    - **Validates: Requirements 23.5**
  
  - [x] 7.3 Write property test for TTS regeneration trigger
    - **Property 26: TTS regeneration trigger**
    - **Validates: Requirements 11.2**

- [x] 8. Implement static file serving and error handling
  - [x] 8.1 Set up static file routes and error handlers
    - Configure Flask to serve /static/images and /static/audio routes
    - Set correct MIME types for PNG and MP3 files
    - Implement error handlers for 400, 404, 500 status codes
    - Add request validation middleware
    - _Requirements: 17.4, 24.1, 24.2, 24.3_
  
  - [x] 8.2 Write property test for static file MIME types
    - **Property 33: Static file MIME types**
    - **Validates: Requirements 17.4**
  
  - [x] 8.3 Write property test for error response mapping
    - **Property 34: Error response mapping**
    - **Validates: Requirements 24.1, 24.2, 24.3**

- [x] 9. Database initialization and seeding
  - Create database initialization script
  - Create system folders: "All Flows" and "Trash"
  - Add database migration support (optional: use Alembic)
  - _Requirements: 23.1, 23.2_

- [ ] 10. Checkpoint - Backend testing
  - Ensure all backend tests pass
  - Test API endpoints manually using Postman or curl
  - Verify database schema is correct
  - Ask the user if questions arise

### Phase 2: Chrome Extension

- [x] 11. Set up Chrome Extension project structure
  - Create extension directory with manifest.json (Manifest V3)
  - Define permissions: tabs, activeTab, storage, scripting
  - Create background.js (Service Worker), content.js, popup.html, popup.js
  - Set up build process (optional: use webpack or vite)
  - _Requirements: 1.1, 1.2_

- [x] 12. Implement recording session state management
  - [x] 12.1 Create RecordingSession state management in background.js
    - Define RecordingSession interface with sessionId, status, startTime, stepCount
    - Implement state transitions: idle → initializing → recording → paused → stopped
    - Store state in chrome.storage.local for persistence
    - Implement state recovery on extension reload
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 12.2 Write property test for badge state machine
    - **Property 9: Badge state machine**
    - **Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5**

- [x] 13. Implement badge status management
  - [x] 13.1 Create badge update functions in background.js
    - Implement setBadgeIdle() to clear badge
    - Implement setBadgeInitializing() to set yellow background with "..."
    - Implement setBadgeRecording() to set red background with "REC" or timer
    - Implement setBadgePaused() to set gray background with "||"
    - Update badge on state transitions
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 14. Implement event capture and screenshot functionality
  - [x] 14.1 Create event capture logic in content.js
    - Add mousedown event listener to capture clicks
    - Extract coordinates (x, y), viewport size, target element innerText
    - Call chrome.tabs.captureVisibleTab to get Base64 screenshot
    - Create CapturedStep object with all required fields
    - Send captured data to background.js via chrome.runtime.sendMessage
    - _Requirements: 2.2, 2.4_
  
  - [x] 14.2 Write property test for complete step capture
    - **Property 2: Complete step capture**
    - **Validates: Requirements 2.2, 2.4**
  
  - [x] 14.3 Write property test for screenshot failure recovery
    - **Property 35: Screenshot failure recovery**
    - **Validates: Requirements 24.4**

- [x] 15. Implement UI injection and Shadow DOM
  - [x] 15.1 Create UI injection functions in content.js
    - Implement showCountdown() to display 3-2-1 countdown overlay
    - Implement showControlBar() to inject Control_Bar using Shadow DOM
    - Set Shadow DOM container z-index to 2147483647
    - Encapsulate Control_Bar styles within Shadow DOM
    - Implement hideControlBar() to remove Shadow DOM container
    - Implement showClickRipple() to display red ripple animation at click position
    - _Requirements: 1.4, 1.5, 4.2, 20.1, 20.2, 20.3_
  
  - [x] 15.2 Write property test for Shadow DOM isolation
    - **Property 10: Shadow DOM isolation**
    - **Validates: Requirements 20.3, 20.4**
  
  - [x] 15.3 Write property test for Shadow DOM cleanup
    - **Property 11: Shadow DOM cleanup**
    - **Validates: Requirements 20.5**

- [x] 16. Implement page freeze and clean recording state
  - [x] 16.1 Create page state management functions in content.js
    - Implement freezePage() to set pointerEvents='none' and apply grayscale filter
    - Implement unfreezePage() to restore pointerEvents and remove filter
    - Implement removeAllUI() to clear all Extension UI elements from DOM
    - Ensure recording state has no visible UI elements
    - _Requirements: 2.1, 4.3_
  
  - [x] 16.2 Write property test for clean recording state
    - **Property 1: Clean recording state**
    - **Validates: Requirements 2.1**
  
  - [x] 16.3 Write property test for page freeze during pause
    - **Property 8: Page freeze during pause**
    - **Validates: Requirements 4.3**

- [x] 17. Implement data upload with retry logic
  - [x] 17.1 Create upload manager in background.js
    - Implement uploadStep() to POST to /api/recording/chunk
    - Implement retry logic with exponential backoff (1s, 2s, 4s)
    - Store failed uploads in IndexedDB for later retry
    - Implement batch uploading (every 5 Steps or 10 seconds)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 25.2_
  
  - [x] 17.2 Write property test for upload retry with exponential backoff
    - **Property 4: Upload retry with exponential backoff**
    - **Validates: Requirements 3.3**
  
  - [x] 17.3 Write property test for upload data completeness
    - **Property 5: Upload data completeness**
    - **Validates: Requirements 3.2**
  
  - [x] 17.4 Write property test for upload batching
    - **Property 38: Upload batching**
    - **Validates: Requirements 25.2**

- [x] 18. Implement pause and resume functionality
  - [x] 18.1 Create pause/resume handlers in background.js and content.js
    - Implement onPause() to call mediaRecorder.pause() before UI injection
    - Wait for pause event before calling showControlBar()
    - Implement onResume() to call hideControlBar() before mediaRecorder.resume()
    - Wait for resume event before updating badge
    - Display 3-2-1 countdown after resume
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 21.1, 21.2, 21.3, 21.4_
  
  - [x] 18.2 Write property test for pause-before-UI invariant
    - **Property 6: Pause-before-UI invariant**
    - **Validates: Requirements 21.1, 21.2**
  
  - [x] 18.3 Write property test for UI-removal-before-resume invariant
    - **Property 7: UI-removal-before-resume invariant**
    - **Validates: Requirements 21.3**

- [x] 19. Implement recording completion and navigation
  - [x] 19.1 Create completion handler in background.js
    - Implement onDone() to call mediaRecorder.stop()
    - POST to /api/recording/stop with session_id
    - Open new tab with chrome.tabs.create to editor URL
    - Clear badge and remove all UI elements from recording tab
    - Handle backend processing failures with error notification
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 19.2 Write unit test for completion error handling
    - Test backend failure displays error message
    - _Requirements: 5.5_

- [x] 20. Implement click feedback ripple animation
  - [x] 20.1 Create ripple animation in content.js
    - Inject ripple element at click coordinates
    - Animate expansion over 15 frames (500ms)
    - Remove ripple element after animation completes
    - _Requirements: 2.3_
  
  - [x] 20.2 Write property test for click feedback visibility
    - **Property 3: Click feedback visibility**
    - **Validates: Requirements 2.3**

- [x] 21. Checkpoint - Extension testing
  - Test recording flow end-to-end in browser
  - Verify badge states update correctly
  - Test pause/resume functionality
  - Verify data uploads to backend
  - Ask the user if questions arise

### Phase 3: Web Dashboard

- [x] 22. Set up Next.js dashboard project
  - Create Next.js 14 project with App Router
  - Install dependencies: TailwindCSS, Axios, React Context
  - Set up project structure: app/dashboard/, components/, lib/
  - Configure TailwindCSS with custom theme
  - _Requirements: 6.1_

- [x] 23. Implement API client for backend communication
  - [x] 23.1 Create DashboardAPI class in lib/api.ts
    - Implement getProjects(folderId?) to fetch projects
    - Implement getProject(id) to fetch single project
    - Implement createProject(data) to create new project
    - Implement updateProject(id, data) to update project
    - Implement deleteProject(id) to soft delete project
    - Implement getFolders() to fetch folders
    - Implement createFolder(name) to create folder
    - Implement updateFolder(id, name) to rename folder
    - Add error handling for network and API errors
    - _Requirements: 6.2, 7.1, 7.3, 7.4, 8.2, 8.3_
  
  - [x] 23.2 Write property test for error response mapping (frontend)
    - Test network errors show "Network error" toast
    - Test 4xx errors show response message
    - Test 5xx errors show "Server error" message
    - _Requirements: 24.1, 24.2, 24.3_

- [x] 24. Implement folder sidebar navigation
  - [x] 24.1 Create Sidebar component in components/Sidebar.tsx
    - Fetch folders on mount using getFolders()
    - Display folder tree with expand/collapse functionality
    - Highlight selected folder
    - Implement folder click to filter projects
    - Add "New Folder" button with inline creation
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 24.2 Write property test for folder filtering
    - **Property 13: Folder filtering**
    - **Validates: Requirements 7.2**

- [x] 25. Implement project grid and cards
  - [x] 25.1 Create ProjectGrid and ProjectCard components
    - Fetch projects on mount using getProjects()
    - Display projects in responsive grid layout
    - Render ProjectCard with thumbnail, title, timestamp
    - Implement empty state with "Create your first Guideflow" CTA
    - Add loading skeleton during fetch
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 25.2 Write property test for project card display completeness
    - **Property 12: Project card display completeness**
    - **Validates: Requirements 6.3**
  
  - [x] 25.3 Write unit test for empty state display
    - Test empty state shows when no projects exist
    - _Requirements: 6.4_

- [x] 26. Implement project operations (rename, delete, restore)
  - [x] 26.1 Create context menu and operation handlers
    - Implement right-click context menu on ProjectCard
    - Add "Rename" option with inline text input
    - Add "Delete" option that moves project to Trash
    - Add "Restore" option for projects in Trash folder
    - Implement "Empty Trash" button to permanently delete all trash projects
    - Update UI optimistically and rollback on API failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 26.2 Write property test for soft delete preservation
    - **Property 14: Soft delete preservation**
    - **Validates: Requirements 8.3, 18.4, 18.5**

- [x] 27. Implement drag-and-drop folder assignment
  - [x] 27.1 Add drag-and-drop functionality to ProjectCard
    - Make ProjectCard draggable
    - Make folder items drop targets
    - Update project folder_id on drop using updateProject()
    - Show visual feedback during drag
    - _Requirements: 7.5_

- [x] 28. Implement "New guideflow" button integration
  - Create "New guideflow" button in dashboard header
  - Trigger Chrome Extension to start recording on click
  - Use chrome.runtime.sendMessage to communicate with extension
  - _Requirements: 6.5_

- [x] 29. Checkpoint - Dashboard testing
  - Test project CRUD operations
  - Test folder management
  - Test drag-and-drop functionality
  - Verify error handling displays correctly
  - Ask the user if questions arise

### Phase 4: Web Editor

- [x] 30. Set up Next.js editor project with Remotion
  - Create editor page at app/editor/[projectId]/page.tsx
  - Install Remotion dependencies
  - Set up Remotion configuration
  - Create Remotion composition structure
  - _Requirements: 9.1_

- [x] 31. Implement project data loading
  - [x] 31.1 Create data loading logic in editor page
    - Extract project_id from URL params
    - Fetch project details using GET /api/projects/{id}/details
    - Parse JSON response with Steps data
    - Initialize Remotion composition with Step data
    - Display error state with retry button on failure
    - Auto-start playback after successful load
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 31.2 Write unit test for project loading error handling
    - Test error state displays on API failure
    - _Requirements: 9.3_

- [x] 32. Implement Remotion video composition
  - [x] 32.1 Create AcroVideo composition component
    - Create main composition with Sequence for each Step
    - Calculate start frame for each Step based on cumulative duration
    - Render StepFrame component for each Step
    - Set composition FPS to 30, dimensions to 1920x1080
    - _Requirements: 10.1, 10.5_
  
  - [x] 32.2 Write property test for step ordering
    - **Property 18: Step ordering**
    - **Validates: Requirements 22.1**

- [x] 33. Implement step frame rendering with mouse animation
  - [x] 33.1 Create StepFrame component
    - Display Step's screenshot as background image
    - Render MouseCursor component with animation
    - Play Step's audio file synchronized with visual
    - Display click ripple when mouse reaches target
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 33.2 Write property test for mouse animation smoothness
    - **Property 22: Mouse animation smoothness**
    - **Validates: Requirements 10.2**
  
  - [x] 33.3 Write property test for audio-visual synchronization
    - **Property 23: Audio-visual synchronization**
    - **Validates: Requirements 10.3**

- [x] 34. Implement mouse cursor animation
  - [x] 34.1 Create MouseCursor component
    - Interpolate position from previous Step to current Step
    - Use easeInOutCubic easing function
    - Animate over first 60% of Step duration
    - Render cursor SVG at calculated position
    - _Requirements: 10.2_

- [x] 35. Implement step list sidebar
  - [x] 35.1 Create StepList component
    - Display all Steps in order_index sequence
    - Show thumbnail, order number, and script_text preview for each Step
    - Highlight currently playing Step
    - Implement click to seek to Step's start frame
    - Display tooltip with full script_text on hover
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  
  - [x] 35.2 Write property test for step display completeness
    - **Property 19: Step display completeness**
    - **Validates: Requirements 22.2**
  
  - [x] 35.3 Write property test for seek accuracy
    - **Property 20: Seek accuracy**
    - **Validates: Requirements 22.3**
  
  - [x] 35.4 Write property test for current step highlighting
    - **Property 21: Current step highlighting**
    - **Validates: Requirements 22.4**

- [x] 36. Implement video playback controls
  - [x] 36.1 Create VideoPlayer component wrapper
    - Wrap Remotion Player with custom controls
    - Implement play/pause button with state toggle
    - Implement progress bar with seek functionality
    - Implement playback speed selector (0.5x, 1x, 1.5x, 2x)
    - Update progress bar position during playback
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 36.2 Write property test for playback speed adjustment
    - **Property 24: Playback speed adjustment**
    - **Validates: Requirements 12.4**
  
  - [x] 36.3 Write property test for progress bar synchronization
    - **Property 25: Progress bar synchronization**
    - **Validates: Requirements 12.5**

- [x] 37. Implement script editing functionality
  - [x] 37.1 Create StepEditor component
    - Display editable text field for each Step's script_text
    - Implement save handler that POSTs to /api/steps/{id}/update_script
    - Update Remotion composition with new audio_url and duration_frames
    - Display loading state during TTS generation
    - Show error message on TTS failure
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [x] 37.2 Write property test for composition update after TTS
    - **Property 29: Composition update after TTS**
    - **Validates: Requirements 11.5**
  
  - [x] 37.3 Write unit test for TTS update error handling
    - Test error message displays on TTS failure
    - _Requirements: 11.2, 11.3_

- [x] 38. Implement video export functionality
  - [x] 38.1 Create ExportButton component
    - Implement export button click handler
    - POST to /api/projects/{id}/export to trigger rendering
    - Display progress indicator during rendering
    - Trigger browser download when MP4 URL is received
    - Handle export failures with error message
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 39. Checkpoint - Editor testing
  - Test video playback and controls
  - Test script editing and TTS regeneration
  - Test step navigation and seeking
  - Test export functionality
  - Ask the user if questions arise

### Phase 5: Integration and Polish

- [x] 40. Implement end-to-end integration
  - Test complete flow: Extension recording → Dashboard display → Editor preview
  - Verify data consistency across components
  - Test error scenarios and recovery
  - _Requirements: All_

- [x] 41. Implement performance optimizations
  - [x] 41.1 Add image compression to Extension
    - Compress screenshots before upload using canvas API
    - Target 85% quality for PNG compression
    - _Requirements: 25.1_
  
  - [x] 41.2 Write property test for image compression
    - **Property 37: Image compression**
    - **Validates: Requirements 25.1**

- [x] 42. Implement virtual scrolling for large projects
  - [x] 42.1 Add virtual scrolling to StepList component
    - Use react-window or react-virtualized library
    - Enable virtual scrolling when project has > 50 Steps
    - Render only visible Step elements
    - _Requirements: 25.3_
  
  - [x] 42.2 Write property test for virtual scrolling activation
    - **Property 39: Virtual scrolling for large projects**
    - **Validates: Requirements 25.3**

- [x] 43. Add comprehensive error boundaries
  - Wrap all major components in React error boundaries
  - Display user-friendly error messages
  - Log errors to console for debugging
  - Provide recovery actions (retry, go back)
  - _Requirements: 24.1, 24.2, 24.3_

- [x] 44. Final checkpoint - Complete system testing
  - Run all unit tests and property tests
  - Perform manual end-to-end testing
  - Test on different browsers and screen sizes
  - Verify all requirements are met
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach to enable independent component testing
