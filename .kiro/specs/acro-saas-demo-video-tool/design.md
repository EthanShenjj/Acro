# Design Document: Acro SaaS Demo Video Creation Tool

## Overview

Acro is a comprehensive video creation platform consisting of four main components:

1. **Chrome Extension (Recorder)**: Captures user interactions and screenshots during demo recording
2. **Web Dashboard**: Manages projects and folders with a Guideflow-inspired interface
3. **Web Editor**: Previews and edits videos using Remotion for synthesis
4. **Backend Service**: Handles API requests, TTS generation, and data persistence

The system follows a capture-process-edit workflow where the Extension records raw interaction data, the Backend processes it into structured Steps with TTS audio, and the Editor renders it as a smooth video with animated mouse movements.

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    User[User Browser]
    Ext[Chrome Extension]
    Dash[Web Dashboard]
    Edit[Web Editor]
    API[Backend API Flask]
    DB[(MySQL Database)]
    TTS[gTTS Service]
    Storage[File Storage]
    
    User -->|installs| Ext
    User -->|accesses| Dash
    User -->|accesses| Edit
    
    Ext -->|POST /api/recording/*| API
    Dash -->|GET/PUT/DELETE /api/projects| API
    Dash -->|GET /api/folders| API
    Edit -->|GET /api/projects/{id}/details| API
    Edit -->|POST /api/steps/{id}/update_script| API
    
    API -->|read/write| DB
    API -->|generate audio| TTS
    API -->|save/retrieve files| Storage
    TTS -->|save MP3| Storage
```

### Component Interaction Flow

**Recording Flow:**
1. User clicks Extension icon → Extension shows popup
2. User clicks "Start Recording" → Extension initializes recorder
3. User performs actions → Extension captures events + screenshots
4. Extension uploads data → Backend creates Steps in database
5. User clicks "Done" → Backend finalizes Project
6. Extension opens Editor → User previews video

**Editing Flow:**
1. Editor loads Project data from Backend
2. Remotion renders video with Steps
3. User edits script text → Backend regenerates TTS
4. Editor updates composition with new audio
5. User exports → Backend renders MP4


## Components and Interfaces

### 1. Chrome Extension (Manifest V3)

**Structure:**
- `manifest.json`: Extension configuration
- `background.js`: Service Worker for event handling and state management
- `content.js`: Content script for DOM manipulation and event capture
- `popup.html/popup.js`: Initial recording setup UI
- `styles.css`: Styles for injected UI elements

**Key Interfaces:**

```typescript
// Background Service Worker
interface RecordingSession {
  sessionId: string;
  projectId: string | null;
  status: 'idle' | 'initializing' | 'recording' | 'paused' | 'stopped';
  startTime: number;
  stepCount: number;
}

interface CapturedStep {
  sessionId: string;
  orderIndex: number;
  actionType: 'click' | 'scroll';
  targetText: string;
  posX: number;
  posY: number;
  viewportWidth: number;
  viewportHeight: number;
  screenshotBase64: string;
  timestamp: number;
}

// Content Script
interface ControlBarActions {
  onResume: () => void;
  onDone: () => void;
}

interface InjectedUI {
  showCountdown: (seconds: number) => Promise<void>;
  showControlBar: (actions: ControlBarActions) => void;
  hideControlBar: () => void;
  showClickRipple: (x: number, y: number) => void;
  freezePage: () => void;
  unfreezePage: () => void;
}
```

**Badge Management:**
- Uses `chrome.action.setBadgeText()` and `chrome.action.setBadgeBackgroundColor()`
- Status mapping:
  - Idle: No badge
  - Initializing: Yellow background, "..." text
  - Recording: Red background (#FF0000), "REC" or timer
  - Paused: Gray background (#808080), "||" text

**Shadow DOM Implementation:**
- Control Bar injected via `attachShadow({mode: 'closed'})`
- Container z-index: 2147483647
- Encapsulated styles prevent page CSS interference
- Control Bar HTML structure:

```html
<div id="acro-control-bar" style="z-index: 2147483647;">
  <template shadowrootmode="closed">
    <style>
      :host { /* styles */ }
    </style>
    <div class="control-bar">
      <span class="timer">00:42</span>
      <button class="resume-btn">▶️ Continue</button>
      <button class="done-btn">✅ Done</button>
    </div>
  </template>
</div>
```


### 2. Web Dashboard (Next.js)

**Technology Stack:**
- Next.js 14 (App Router)
- TailwindCSS for styling
- Axios for API calls
- React Context for state management

**Page Structure:**
- `/app/dashboard/page.tsx`: Main dashboard layout
- `/app/dashboard/components/Sidebar.tsx`: Folder navigation
- `/app/dashboard/components/ProjectGrid.tsx`: Project card grid
- `/app/dashboard/components/ProjectCard.tsx`: Individual project card
- `/app/dashboard/components/EmptyState.tsx`: Empty state UI

**Key Interfaces:**

```typescript
interface Project {
  id: number;
  uuid: string;
  title: string;
  folderId: number;
  thumbnailUrl: string;
  createdAt: string;
  deletedAt: string | null;
}

interface Folder {
  id: number;
  name: string;
  type: 'system' | 'user';
  createdAt: string;
}

interface DashboardState {
  projects: Project[];
  folders: Folder[];
  selectedFolderId: number | null;
  loading: boolean;
  error: string | null;
}

// API Client
class DashboardAPI {
  async getProjects(folderId?: number): Promise<Project[]>;
  async getProject(id: number): Promise<Project>;
  async createProject(data: Partial<Project>): Promise<Project>;
  async updateProject(id: number, data: Partial<Project>): Promise<Project>;
  async deleteProject(id: number): Promise<void>;
  async getFolders(): Promise<Folder[]>;
  async createFolder(name: string): Promise<Folder>;
  async updateFolder(id: number, name: string): Promise<Folder>;
}
```

**Layout Design:**
- Three-column layout: Sidebar (240px) | Project Grid (flex-1) | Details Panel (320px, optional)
- Sidebar: Fixed position, folder tree with expand/collapse
- Project Grid: Responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)
- Project Card: 280x180px, thumbnail + title + timestamp + actions menu


### 3. Web Editor (Next.js + Remotion)

**Technology Stack:**
- Next.js 14 (App Router)
- Remotion 4.x for video composition
- TailwindCSS for styling
- Axios for API calls

**Page Structure:**
- `/app/editor/[projectId]/page.tsx`: Main editor page
- `/app/editor/components/VideoPlayer.tsx`: Remotion Player wrapper
- `/app/editor/components/StepList.tsx`: Sidebar step list
- `/app/editor/components/StepEditor.tsx`: Script editing panel
- `/app/editor/components/ExportButton.tsx`: Export functionality

**Key Interfaces:**

```typescript
interface Step {
  id: number;
  projectId: number;
  orderIndex: number;
  actionType: 'click' | 'scroll';
  targetText: string;
  scriptText: string;
  audioUrl: string;
  imageUrl: string;
  posX: number;
  posY: number;
  durationFrames: number;
}

interface ProjectDetails {
  id: number;
  uuid: string;
  title: string;
  steps: Step[];
  totalDurationFrames: number;
}

interface VideoComposition {
  fps: 30;
  width: 1920;
  height: 1080;
  durationInFrames: number;
}

// Remotion Composition
interface StepSequenceProps {
  steps: Step[];
  currentFrame: number;
}

interface MouseAnimationProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  durationFrames: number;
  currentFrame: number;
}
```

**Remotion Composition Structure:**

```typescript
// Main composition
export const AcroVideo: React.FC<{steps: Step[]}> = ({steps}) => {
  return (
    <AbsoluteFill>
      {steps.map((step, index) => {
        const startFrame = steps.slice(0, index)
          .reduce((sum, s) => sum + s.durationFrames, 0);
        
        return (
          <Sequence
            key={step.id}
            from={startFrame}
            durationInFrames={step.durationFrames}
          >
            <StepFrame
              step={step}
              previousStep={steps[index - 1]}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Individual step frame
const StepFrame: React.FC<{step: Step, previousStep?: Step}> = ({step, previousStep}) => {
  const frame = useCurrentFrame();
  
  return (
    <>
      <Img src={step.imageUrl} style={{width: '100%', height: '100%'}} />
      <MouseCursor
        fromX={previousStep?.posX ?? step.posX}
        fromY={previousStep?.posY ?? step.posY}
        toX={step.posX}
        toY={step.posY}
        frame={frame}
        totalFrames={step.durationFrames}
      />
      <Audio src={step.audioUrl} />
    </>
  );
};
```

**Mouse Animation:**
- Easing function: `easeInOutCubic` for smooth acceleration/deceleration
- Animation duration: First 60% of step duration (remaining 40% for audio/pause)
- Click ripple: Appears when mouse reaches target, expands over 15 frames


### 4. Backend Service (Flask + SQLAlchemy)

**Technology Stack:**
- Python 3.11+
- Flask 3.x
- SQLAlchemy 2.x (ORM)
- MySQL 8.x
- gTTS (Google Text-to-Speech)
- Pillow (image processing)

**Project Structure:**
```
backend/
├── app.py                 # Flask application entry point
├── config.py              # Configuration management
├── models/
│   ├── project.py         # Project model
│   ├── folder.py          # Folder model
│   └── step.py            # Step model
├── routes/
│   ├── projects.py        # Project CRUD endpoints
│   ├── recording.py       # Recording session endpoints
│   ├── folders.py         # Folder management endpoints
│   └── steps.py           # Step update endpoints
├── services/
│   ├── tts_service.py     # TTS generation logic
│   ├── storage_service.py # File storage logic
│   └── image_service.py   # Image processing logic
└── utils/
    ├── validators.py      # Input validation
    └── helpers.py         # Utility functions
```

**Key Interfaces:**

```python
# Models
class Project(db.Model):
    __tablename__ = 'projects'
    
    id: int
    uuid: str
    title: str
    folder_id: int
    thumbnail_url: str
    created_at: datetime
    deleted_at: datetime | None
    
    folder: Folder  # relationship
    steps: list[Step]  # relationship

class Folder(db.Model):
    __tablename__ = 'folders'
    
    id: int
    name: str
    type: str  # 'system' or 'user'
    created_at: datetime
    
    projects: list[Project]  # relationship

class Step(db.Model):
    __tablename__ = 'steps'
    
    id: int
    project_id: int
    order_index: int
    action_type: str  # 'click' or 'scroll'
    target_text: str
    script_text: str
    audio_url: str
    image_url: str
    pos_x: int
    pos_y: int
    duration_frames: int
    
    project: Project  # relationship

# Services
class TTSService:
    def generate_audio(self, text: str, language: str = 'en') -> tuple[str, int]:
        """
        Generate TTS audio from text.
        Returns: (audio_url, duration_frames)
        """
        pass
    
    def calculate_duration_frames(self, audio_path: str, fps: int = 30) -> int:
        """Calculate frame count from audio duration."""
        pass

class StorageService:
    def save_image(self, base64_data: str) -> str:
        """Save Base64 image and return URL."""
        pass
    
    def save_audio(self, audio_data: bytes) -> str:
        """Save audio file and return URL."""
        pass
    
    def generate_thumbnail(self, image_path: str) -> str:
        """Generate thumbnail and return URL."""
        pass

class ImageService:
    def decode_base64(self, base64_str: str) -> bytes:
        """Decode Base64 string to bytes."""
        pass
    
    def compress_image(self, image_bytes: bytes, quality: int = 85) -> bytes:
        """Compress image to reduce file size."""
        pass
    
    def create_thumbnail(self, image_bytes: bytes, size: tuple[int, int] = (320, 180)) -> bytes:
        """Create thumbnail from image."""
        pass
```


## Data Models

### Database Schema

**Projects Table:**
```sql
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    folder_id INT NOT NULL,
    thumbnail_url VARCHAR(512),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    INDEX idx_folder_id (folder_id),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_created_at (created_at)
);
```

**Folders Table:**
```sql
CREATE TABLE folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('system', 'user') NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type)
);

-- Initial system folders
INSERT INTO folders (name, type) VALUES 
    ('All Flows', 'system'),
    ('Trash', 'system');
```

**Steps Table:**
```sql
CREATE TABLE steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    order_index INT NOT NULL,
    action_type ENUM('click', 'scroll') NOT NULL,
    target_text TEXT,
    script_text TEXT NOT NULL,
    audio_url VARCHAR(512),
    image_url VARCHAR(512) NOT NULL,
    pos_x INT NOT NULL,
    pos_y INT NOT NULL,
    duration_frames INT NOT NULL DEFAULT 90,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_order (project_id, order_index),
    UNIQUE KEY unique_project_step (project_id, order_index)
);
```

### API Request/Response Models

**Recording Session:**

```json
// POST /api/recording/start
Request: {}
Response: {
  "sessionId": "uuid-v4",
  "status": "active"
}

// POST /api/recording/chunk
Request: {
  "sessionId": "uuid-v4",
  "orderIndex": 1,
  "actionType": "click",
  "targetText": "Submit Button",
  "posX": 450,
  "posY": 320,
  "viewportWidth": 1920,
  "viewportHeight": 1080,
  "screenshotBase64": "data:image/png;base64,iVBORw0KG..."
}
Response: {
  "stepId": 123,
  "imageUrl": "/static/images/uuid.png",
  "status": "saved"
}

// POST /api/recording/stop
Request: {
  "sessionId": "uuid-v4"
}
Response: {
  "projectId": 42,
  "uuid": "project-uuid",
  "redirectUrl": "https://app.autodemo.com/editor/project-uuid"
}
```

**Project Management:**

```json
// GET /api/projects?folderId=1
Response: {
  "projects": [
    {
      "id": 42,
      "uuid": "project-uuid",
      "title": "New Demo - 2024/01/15",
      "folderId": 1,
      "thumbnailUrl": "/static/thumbnails/uuid.png",
      "createdAt": "2024-01-15T10:30:00Z",
      "stepCount": 12
    }
  ]
}

// GET /api/projects/{id}/details
Response: {
  "id": 42,
  "uuid": "project-uuid",
  "title": "New Demo - 2024/01/15",
  "steps": [
    {
      "id": 1,
      "orderIndex": 1,
      "actionType": "click",
      "targetText": "Submit Button",
      "scriptText": "Click the submit button to save your changes",
      "audioUrl": "/static/audio/step-1-uuid.mp3",
      "imageUrl": "/static/images/step-1-uuid.png",
      "posX": 450,
      "posY": 320,
      "durationFrames": 120
    }
  ],
  "totalDurationFrames": 1440
}

// PUT /api/projects/{id}
Request: {
  "title": "Updated Demo Title",
  "folderId": 2
}
Response: {
  "id": 42,
  "uuid": "project-uuid",
  "title": "Updated Demo Title",
  "folderId": 2
}
```

**Step Updates:**

```json
// POST /api/steps/{id}/update_script
Request: {
  "scriptText": "Now click the submit button to proceed"
}
Response: {
  "id": 1,
  "scriptText": "Now click the submit button to proceed",
  "audioUrl": "/static/audio/step-1-new-uuid.mp3",
  "durationFrames": 135
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 125 acceptance criteria, I identified several areas of redundancy:

1. **Badge state properties (19.2-19.5)** can be consolidated into a single state machine property
2. **API endpoint properties (14.1-14.5, 15.1-15.4)** are testing implementation details rather than behavior
3. **UI display properties** for specific elements (1.1-1.5, 6.1, 12.1) are better tested as examples
4. **Shadow DOM properties (20.1-20.5)** can be combined into isolation and cleanup properties
5. **Error handling properties (24.1-24.3)** can be unified into error response mapping
6. **Step data completeness (3.2, 15.3)** are redundant - one property covers both

The following properties focus on unique behavioral guarantees that provide maximum validation value.

### Recording and Capture Properties

**Property 1: Clean recording state**
*For any* active recording session, the page DOM should contain no Extension UI elements (no popup, no control bar, no countdown overlay).
**Validates: Requirements 2.1**

**Property 2: Complete step capture**
*For any* mousedown event during recording, the captured Step data should include all required fields: coordinates (x, y), viewport dimensions, target element text, and Base64 screenshot.
**Validates: Requirements 2.2, 2.4**

**Property 3: Click feedback visibility**
*For any* captured click event, a ripple animation element should be injected at the click coordinates and visible in the DOM.
**Validates: Requirements 2.3**

**Property 4: Upload retry with exponential backoff**
*For any* failed upload request, the system should retry up to 3 times with delays following exponential backoff (1s, 2s, 4s).
**Validates: Requirements 3.3**

**Property 5: Upload data completeness**
*For any* Step upload request, the POST payload should contain session_id, order_index, action_type, target_text, pos_x, pos_y, viewport dimensions, and Base64 image data.
**Validates: Requirements 3.2**

### Recording State Management Properties

**Property 6: Pause-before-UI invariant**
*For any* pause operation, mediaRecorder.pause() must be called and the pause event must fire before any UI elements are injected into the DOM.
**Validates: Requirements 21.1, 21.2**

**Property 7: UI-removal-before-resume invariant**
*For any* resume operation, all injected UI elements must be removed from the DOM before mediaRecorder.resume() is called.
**Validates: Requirements 21.3**

**Property 8: Page freeze during pause**
*For any* paused recording state, the page body should have pointerEvents set to 'none' and a grayscale filter applied.
**Validates: Requirements 4.3**

**Property 9: Badge state machine**
*For any* recording session, the badge state transitions should follow the sequence: idle (no badge) → initializing (yellow "...") → recording (red "REC") → [paused (gray "||") →]* → completed (no badge), where pause/resume cycles are optional.
**Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5**

**Property 10: Shadow DOM isolation**
*For any* injected Control_Bar, the styles defined within the Shadow DOM should not be affected by page CSS, and Control_Bar styles should not leak to the page.
**Validates: Requirements 20.3, 20.4**

**Property 11: Shadow DOM cleanup**
*For any* Control_Bar removal operation, the Shadow DOM container should be completely removed from the page DOM.
**Validates: Requirements 20.5**

### Project Management Properties

**Property 12: Project card display completeness**
*For any* displayed Project card, it should contain a thumbnail image, title, and creation timestamp.
**Validates: Requirements 6.3**

**Property 13: Folder filtering**
*For any* folder selection, the displayed project list should contain only Projects where folder_id matches the selected folder's id.
**Validates: Requirements 7.2**

**Property 14: Soft delete preservation**
*For any* Project delete operation, the Project record should remain in the database with deleted_at timestamp set, and all associated Steps should remain unchanged.
**Validates: Requirements 8.3, 18.4, 18.5**

**Property 15: Trash folder exclusion**
*For any* query for "All Flows" folder, the returned Projects should exclude all Projects where folder_id equals the Trash folder's id.
**Validates: Requirements 23.4**

**Property 16: System folder protection**
*For any* delete attempt on a folder with type='system', the operation should be rejected with an error.
**Validates: Requirements 23.5**

**Property 17: Default folder assignment**
*For any* Project creation without folder_id specified, the created Project should have folder_id set to the "All Flows" system folder's id.
**Validates: Requirements 23.3**

### Video Editor Properties

**Property 18: Step ordering**
*For any* loaded Project, the Steps displayed in the sidebar should be sorted by order_index in ascending order.
**Validates: Requirements 22.1**

**Property 19: Step display completeness**
*For any* Step in the sidebar list, it should display the thumbnail image, order number, and script_text preview.
**Validates: Requirements 22.2**

**Property 20: Seek accuracy**
*For any* Step click in the sidebar, the video playback should seek to the frame number equal to the sum of duration_frames for all Steps with order_index less than the clicked Step's order_index.
**Validates: Requirements 22.3**

**Property 21: Current step highlighting**
*For any* frame during playback, the Step in the sidebar whose frame range contains the current frame should be highlighted.
**Validates: Requirements 22.4**

**Property 22: Mouse animation smoothness**
*For any* transition between consecutive Steps, the mouse cursor position should interpolate smoothly from the previous Step's (pos_x, pos_y) to the current Step's (pos_x, pos_y) using easing function.
**Validates: Requirements 10.2**

**Property 23: Audio-visual synchronization**
*For any* rendered Step, the audio playback should start at the same frame as the Step's visual content and play for exactly duration_frames.
**Validates: Requirements 10.3**

**Property 24: Playback speed adjustment**
*For any* playback speed selection (0.5x, 1x, 1.5x, 2x), the video playback rate should be set to the selected multiplier.
**Validates: Requirements 12.4**

**Property 25: Progress bar synchronization**
*For any* playing video, the progress bar position should update to reflect current_frame / total_duration_frames.
**Validates: Requirements 12.5**

### Script Editing and TTS Properties

**Property 26: TTS regeneration trigger**
*For any* script_text modification and save action, a POST request to /api/steps/{id}/update_script should be sent with the updated text.
**Validates: Requirements 11.2**

**Property 27: TTS audio generation**
*For any* script_text update request, the TTS service should generate an MP3 audio file and return audio_url and duration_frames.
**Validates: Requirements 11.3, 11.4, 16.1, 16.2**

**Property 28: Duration calculation accuracy**
*For any* generated audio file, duration_frames should equal ceil(audio_duration_seconds * 30), assuming 30 FPS.
**Validates: Requirements 16.3**

**Property 29: Composition update after TTS**
*For any* successful TTS update response, the Remotion composition should be updated with the new audio_url and duration_frames for the affected Step.
**Validates: Requirements 11.5**

### Backend API Properties

**Property 30: Image processing pipeline**
*For any* Base64 image upload, the Backend should decode the image, save it as a PNG file with a unique UUID-based filename, and return a URL in the format /static/images/{filename}.
**Validates: Requirements 17.1, 17.2, 17.3**

**Property 31: Thumbnail generation**
*For any* recording session stop, the Backend should generate a 320x180 thumbnail from the first Step's image and set it as the Project's thumbnail_url.
**Validates: Requirements 15.5, 25.5**

**Property 32: Session finalization**
*For any* POST to /api/recording/stop, the Backend should return a response containing project_id and redirect_url pointing to the editor page.
**Validates: Requirements 15.4**

**Property 33: Static file MIME types**
*For any* request to /static/* routes, the response should include the correct Content-Type header based on file extension (image/png for .png, audio/mpeg for .mp3).
**Validates: Requirements 17.4**

### Error Handling Properties

**Property 34: Error response mapping**
*For any* API error response, the Frontend should display: "Network error, please check your connection" for network failures, the response body message for 4xx errors, and "Server error, please try again later" for 5xx errors.
**Validates: Requirements 24.1, 24.2, 24.3**

**Property 35: Screenshot failure recovery**
*For any* screenshot capture failure, the Extension should log the error and continue recording subsequent Steps without interrupting the session.
**Validates: Requirements 24.4**

**Property 36: TTS failure graceful degradation**
*For any* TTS generation failure, the Backend should store the Step with audio_url set to null and return a warning in the response.
**Validates: Requirements 24.5**

### Performance Properties

**Property 37: Image compression**
*For any* screenshot capture, the image should be compressed before upload, resulting in a file size smaller than the uncompressed Base64 data.
**Validates: Requirements 25.1**

**Property 38: Upload batching**
*For any* sequence of Step captures, uploads should be batched such that a batch is sent either when 5 Steps have been captured or 10 seconds have elapsed since the last batch, whichever comes first.
**Validates: Requirements 25.2**

**Property 39: Virtual scrolling for large projects**
*For any* Project with more than 50 Steps, the step list sidebar should implement virtual scrolling, rendering only visible Step elements in the DOM.
**Validates: Requirements 25.3**


## Error Handling

### Extension Error Handling

**Screenshot Capture Failures:**
- Catch exceptions from `chrome.tabs.captureVisibleTab`
- Log error to console with context (tab ID, timestamp)
- Continue recording subsequent Steps
- Display warning badge overlay if multiple consecutive failures occur

**Upload Failures:**
- Implement exponential backoff retry (1s, 2s, 4s delays)
- Store failed uploads in IndexedDB for later retry
- Display persistent notification if all retries fail
- Provide "Retry Upload" button in notification

**Permission Errors:**
- Detect missing permissions (tabs, activeTab, storage)
- Display clear permission request dialog
- Prevent recording start until permissions granted
- Log permission denial for debugging

**State Synchronization Errors:**
- Implement state recovery from chrome.storage.local
- Reset to idle state if corrupted state detected
- Clear all injected UI elements on error
- Notify user of state reset

### Dashboard Error Handling

**API Request Failures:**
- Network errors: Display toast with retry button
- 401 Unauthorized: Redirect to login page
- 403 Forbidden: Display "Access denied" message
- 404 Not Found: Display "Project not found" message
- 500 Server Error: Display generic error with support contact

**Data Loading Failures:**
- Show skeleton loaders during fetch
- Display error state with retry button
- Preserve last successful data in cache
- Log errors to error tracking service

**Folder Operation Failures:**
- Validate folder names (non-empty, max 255 chars)
- Prevent deletion of non-empty folders
- Show confirmation dialog for destructive actions
- Rollback UI state on API failure

### Editor Error Handling

**Project Loading Failures:**
- Display full-page error state with retry button
- Check for invalid project_id in URL
- Handle missing or corrupted Step data
- Provide "Back to Dashboard" link

**Remotion Rendering Errors:**
- Catch rendering exceptions in error boundary
- Display error message with frame number
- Provide "Skip Step" option for problematic Steps
- Log rendering errors with Step details

**TTS Update Failures:**
- Revert script_text to previous value on failure
- Display inline error message below text field
- Preserve audio_url from before failed update
- Allow user to retry or cancel

**Export Failures:**
- Display progress with cancel button
- Handle timeout errors (> 5 minutes)
- Provide partial export if some Steps fail
- Store export settings for retry

### Backend Error Handling

**Database Errors:**
- Wrap all queries in try-catch blocks
- Return 500 status with generic error message
- Log full error details to application logs
- Implement database connection retry logic

**File Storage Errors:**
- Check disk space before saving files
- Return 507 Insufficient Storage if disk full
- Implement cleanup of orphaned files
- Validate file paths to prevent directory traversal

**TTS Service Errors:**
- Catch gTTS exceptions (network, rate limit)
- Return 503 Service Unavailable for TTS failures
- Store Step without audio_url on failure
- Implement TTS request queue with rate limiting

**Validation Errors:**
- Validate all input data before processing
- Return 400 Bad Request with specific field errors
- Check file size limits (max 10MB per image)
- Sanitize user input to prevent injection attacks


## Testing Strategy

### Dual Testing Approach

This project requires both **unit tests** and **property-based tests** for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs through randomization
- Both approaches are complementary and necessary

**Balance Principle**: Avoid writing too many unit tests for scenarios that property tests already cover. Focus unit tests on:
- Specific examples that demonstrate correct behavior
- Integration points between components
- Edge cases and error conditions

Property tests handle comprehensive input coverage through randomization.

### Property-Based Testing Configuration

**Library Selection:**
- **JavaScript/TypeScript**: Use `fast-check` library
- **Python**: Use `hypothesis` library

**Test Configuration:**
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: acro-saas-demo-video-tool, Property {number}: {property_text}`

**Example Property Test Structure (TypeScript):**

```typescript
import fc from 'fast-check';

describe('Property 2: Complete step capture', () => {
  // Feature: acro-saas-demo-video-tool, Property 2: Complete step capture
  it('should capture all required fields for any mousedown event', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({min: 0, max: 1920}),
          y: fc.integer({min: 0, max: 1080}),
          targetText: fc.string(),
          viewportWidth: fc.integer({min: 800, max: 3840}),
          viewportHeight: fc.integer({min: 600, max: 2160}),
        }),
        (mouseEvent) => {
          const capturedStep = captureMouseEvent(mouseEvent);
          
          expect(capturedStep).toHaveProperty('posX', mouseEvent.x);
          expect(capturedStep).toHaveProperty('posY', mouseEvent.y);
          expect(capturedStep).toHaveProperty('targetText', mouseEvent.targetText);
          expect(capturedStep).toHaveProperty('viewportWidth', mouseEvent.viewportWidth);
          expect(capturedStep).toHaveProperty('viewportHeight', mouseEvent.viewportHeight);
          expect(capturedStep).toHaveProperty('screenshotBase64');
          expect(capturedStep.screenshotBase64).toMatch(/^data:image\/png;base64,/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Example Property Test Structure (Python):**

```python
from hypothesis import given, strategies as st
import pytest

class TestImageProcessing:
    # Feature: acro-saas-demo-video-tool, Property 30: Image processing pipeline
    @given(
        base64_image=st.text(min_size=100, max_size=10000).map(
            lambda s: f"data:image/png;base64,{s}"
        )
    )
    def test_image_processing_pipeline(self, base64_image):
        """For any Base64 image upload, should decode, save, and return URL."""
        result = storage_service.save_image(base64_image)
        
        assert result.startswith('/static/images/')
        assert result.endswith('.png')
        
        # Verify file exists
        filename = result.split('/')[-1]
        assert os.path.exists(f'static/images/{filename}')
```

### Component-Specific Testing

#### Chrome Extension Tests

**Unit Tests:**
- Badge state transitions for specific scenarios
- Shadow DOM creation and cleanup
- Event listener registration
- Message passing between background and content scripts

**Property Tests:**
- Property 1: Clean recording state
- Property 2: Complete step capture
- Property 3: Click feedback visibility
- Property 4: Upload retry with exponential backoff
- Property 6: Pause-before-UI invariant
- Property 7: UI-removal-before-resume invariant
- Property 9: Badge state machine
- Property 10: Shadow DOM isolation

**Integration Tests:**
- End-to-end recording flow (start → capture → stop)
- Extension-to-backend communication
- Tab navigation and cleanup

#### Dashboard Tests

**Unit Tests:**
- Project card rendering with mock data
- Folder tree expansion/collapse
- Context menu display
- Empty state display

**Property Tests:**
- Property 12: Project card display completeness
- Property 13: Folder filtering
- Property 14: Soft delete preservation
- Property 15: Trash folder exclusion
- Property 16: System folder protection
- Property 17: Default folder assignment

**Integration Tests:**
- API integration with mock backend
- Drag-and-drop folder assignment
- Project CRUD operations

#### Editor Tests

**Unit Tests:**
- Video player controls (play/pause/seek)
- Step list rendering
- Script editing UI
- Export button behavior

**Property Tests:**
- Property 18: Step ordering
- Property 19: Step display completeness
- Property 20: Seek accuracy
- Property 22: Mouse animation smoothness
- Property 23: Audio-visual synchronization
- Property 24: Playback speed adjustment
- Property 25: Progress bar synchronization
- Property 26: TTS regeneration trigger
- Property 29: Composition update after TTS

**Integration Tests:**
- Remotion composition rendering
- API integration for project loading
- TTS update flow

#### Backend Tests

**Unit Tests:**
- Model validation
- Route handlers with mock data
- Database query construction
- File path generation

**Property Tests:**
- Property 27: TTS audio generation
- Property 28: Duration calculation accuracy
- Property 30: Image processing pipeline
- Property 31: Thumbnail generation
- Property 32: Session finalization
- Property 33: Static file MIME types
- Property 34: Error response mapping
- Property 37: Image compression
- Property 38: Upload batching

**Integration Tests:**
- Full API endpoint testing with test database
- TTS service integration
- File storage operations
- Database transaction handling

### Test Data Generation

**For Property Tests:**
- Use library generators (fast-check arbitraries, hypothesis strategies)
- Generate realistic data (valid coordinates, reasonable text lengths)
- Include edge cases in generators (empty strings, max values, special characters)

**For Unit Tests:**
- Create fixture files for common test data
- Use factory functions for model creation
- Mock external services (TTS, file storage)

### Continuous Integration

**Pre-commit Hooks:**
- Run linters (ESLint, Pylint)
- Run fast unit tests (< 5 seconds)
- Check code formatting

**CI Pipeline:**
- Run all unit tests
- Run all property tests (100+ iterations each)
- Generate coverage reports (target: 80%+ coverage)
- Run integration tests
- Build and deploy to staging

### Performance Testing

**Load Testing:**
- Test concurrent recording sessions (10+ users)
- Test large project loading (100+ Steps)
- Test export rendering performance
- Monitor memory usage during video playback

**Benchmarks:**
- Screenshot capture time (target: < 100ms)
- Upload latency (target: < 500ms)
- TTS generation time (target: < 2s per Step)
- Video export time (target: < 30s for 2-minute video)
