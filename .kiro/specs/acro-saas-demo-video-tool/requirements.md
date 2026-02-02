# Requirements Document: Acro SaaS Demo Video Creation Tool

## Introduction

Acro is a SaaS product demo video creation tool that helps product managers and customer success teams quickly create professional demo videos. The system consists of a Chrome extension that captures user interactions, a web dashboard for project management, a video editor for customization, and a backend service for processing and storage.

The core value proposition is automation (no manual keyframe editing), management (centralized project organization), and editability (instant voice regeneration).

## Glossary

- **Extension**: The Chrome browser extension component that captures user interactions
- **Dashboard**: The web-based project management interface
- **Editor**: The web-based video editing and preview interface
- **Recorder**: The recording functionality within the Extension
- **Step**: A single captured user interaction (click, scroll) with associated screenshot and metadata
- **Project**: A collection of Steps representing a complete demo recording
- **Guideflow**: A synonym for Project, used in user-facing UI
- **TTS_Service**: Text-to-Speech service that converts narration text to audio
- **Backend**: The server-side API and processing service
- **Badge**: The Chrome extension icon status indicator
- **Control_Bar**: The floating toolbar shown during recording pause
- **Shadow_DOM**: Isolated DOM tree for injecting UI without page interference

## Requirements

### Requirement 1: Chrome Extension Recording Initialization

**User Story:** As a user, I want to start recording my product demo, so that I can capture my interactions automatically.

#### Acceptance Criteria

1. WHEN a user clicks the Extension icon in the browser toolbar, THE Extension SHALL display a native popup interface with recording options
2. WHEN the popup is displayed, THE Extension SHALL show a microphone permission toggle and recording range selection (current tab or new window)
3. WHEN the user clicks the "Start Recording" button, THE Extension SHALL close the popup and change the Badge background to yellow with "..." text
4. WHEN initialization completes, THE Extension SHALL display a countdown overlay (3-2-1) in the center of the page
5. WHEN the countdown reaches zero, THE Extension SHALL remove the countdown overlay and change the Badge to red background with "REC" text

### Requirement 2: Immersive Recording Capture

**User Story:** As a user, I want the recording to capture my interactions without UI interference, so that my demo videos are clean and professional.

#### Acceptance Criteria

1. WHEN recording is active, THE Extension SHALL remove all Extension UI elements from the page DOM
2. WHEN the user clicks any element on the page, THE Recorder SHALL capture the mousedown event with coordinates (x, y), viewport size, and target element innerText
3. WHEN the user clicks any element, THE Recorder SHALL display a red ripple animation at the click position
4. WHEN a click is captured, THE Recorder SHALL call chrome.tabs.captureVisibleTab to obtain a PNG screenshot in Base64 format
5. WHEN recording is active, THE Badge SHALL display a dynamic timer showing elapsed recording time

### Requirement 3: Recording Data Upload

**User Story:** As a user, I want my recorded interactions automatically saved, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN a Step is captured, THE Recorder SHALL POST the screenshot and metadata to the Backend API endpoint /api/recording/chunk
2. WHEN the upload request is sent, THE Recorder SHALL include session_id, order_index, action_type, target_text, pos_x, pos_y, viewport dimensions, and Base64 image data
3. IF the upload fails, THEN THE Recorder SHALL retry the upload up to 3 times with exponential backoff
4. WHEN all retries fail, THE Recorder SHALL store the data locally and notify the user of the upload failure

### Requirement 4: Recording Pause and Resume Control

**User Story:** As a user, I want to pause and resume recording, so that I can prepare the next part of my demo without capturing unwanted actions.

#### Acceptance Criteria

1. WHEN the user clicks the Extension icon during active recording, THE Recorder SHALL immediately pause the media recording stream
2. WHEN the recording is paused, THE Recorder SHALL inject the Control_Bar at the top of the page using Shadow_DOM
3. WHEN the Control_Bar is displayed, THE Extension SHALL apply a grayscale filter to the page and set pointerEvents to 'none' on the page body
4. WHEN the Control_Bar is displayed, THE Badge SHALL change to gray background with "||" text
5. WHEN the user clicks the Resume button on the Control_Bar, THE Extension SHALL remove the Control_Bar, restore page interactivity, display a 3-2-1 countdown, and resume recording
6. WHEN the countdown completes after resume, THE Badge SHALL return to red background with "REC" text

### Requirement 5: Recording Completion and Navigation

**User Story:** As a user, I want to finish recording and immediately preview my video, so that I can quickly review and edit my demo.

#### Acceptance Criteria

1. WHEN the user clicks the "Done" button on the Control_Bar, THE Recorder SHALL stop the media recording stream
2. WHEN recording stops, THE Recorder SHALL POST to /api/recording/stop with the session_id
3. WHEN the Backend responds with project_id and redirect_url, THE Extension SHALL open a new browser tab navigating to the Editor page at the provided URL
4. WHEN the new tab opens, THE Extension SHALL clear the Badge status and remove all injected UI elements from the original recording tab
5. WHEN the Backend processing fails, THE Extension SHALL display an error message "Processing failed, please try again" and retain the recording data locally

### Requirement 6: Project Management Dashboard

**User Story:** As a user, I want to view and organize all my demo projects, so that I can easily find and manage my recordings.

#### Acceptance Criteria

1. WHEN a user navigates to the Dashboard, THE Dashboard SHALL display a three-column layout with sidebar navigation, project list, and details panel
2. WHEN the Dashboard loads, THE Dashboard SHALL fetch and display all Projects using GET /api/projects
3. WHEN Projects are displayed, THE Dashboard SHALL show each Project as a card with thumbnail image, title, and creation timestamp
4. WHEN no Projects exist, THE Dashboard SHALL display an empty state with "Create your first Guideflow" call-to-action button
5. WHEN the user clicks "New guideflow" button, THE Dashboard SHALL trigger the Extension to start a new recording session

### Requirement 7: Folder Organization

**User Story:** As a user, I want to organize my projects into folders, so that I can maintain a structured library of demos.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a folder tree in the left sidebar using GET /api/folders
2. WHEN the user clicks a folder, THE Dashboard SHALL filter the project list to show only Projects in that folder
3. WHEN the user clicks "New Folder" button, THE Dashboard SHALL create a new folder using POST /api/folders and add it to the tree
4. WHERE folder management is enabled, THE Dashboard SHALL support renaming folders through inline editing
5. WHEN the user drags a Project to a different folder, THE Dashboard SHALL update the Project's folder_id using PUT /api/projects/{id}

### Requirement 8: Project Operations

**User Story:** As a user, I want to rename and delete projects, so that I can maintain an organized workspace.

#### Acceptance Criteria

1. WHEN the user right-clicks a Project card, THE Dashboard SHALL display a context menu with "Rename" and "Delete" options
2. WHEN the user selects "Rename", THE Dashboard SHALL show an inline text input and save changes using PUT /api/projects/{id}
3. WHEN the user selects "Delete", THE Dashboard SHALL move the Project to the Trash folder (soft delete) using PUT /api/projects/{id}
4. WHEN a Project is in the Trash folder, THE Dashboard SHALL display a "Restore" option in the context menu
5. WHEN the user clicks "Empty Trash", THE Dashboard SHALL permanently delete all Projects in the Trash using DELETE /api/projects/trash

### Requirement 9: Video Editor Data Loading

**User Story:** As a developer, I want the Editor to load project data efficiently, so that users can preview their videos quickly.

#### Acceptance Criteria

1. WHEN the Editor page loads with a project_id in the URL, THE Editor SHALL fetch project details using GET /api/projects/{id}/details
2. WHEN the API response is received, THE Editor SHALL parse the JSON data containing all Steps with image URLs, audio URLs, coordinates, and durations
3. IF the API request fails, THEN THE Editor SHALL display an error message "Failed to load project" and provide a retry button
4. WHEN project data is loaded, THE Editor SHALL initialize the Remotion composition with the Step data
5. WHEN initialization completes, THE Editor SHALL automatically start video playback

### Requirement 10: Video Synthesis and Rendering

**User Story:** As a user, I want to see my recorded interactions as a smooth video with mouse movements and narration, so that I can create professional demos.

#### Acceptance Criteria

1. WHEN the Editor renders a Step, THE Editor SHALL display the Step's screenshot as the background image
2. WHEN transitioning between Steps, THE Editor SHALL animate a fake mouse cursor smoothly moving from the previous Step's coordinates to the current Step's coordinates
3. WHEN a Step is displayed, THE Editor SHALL play the Step's TTS audio file synchronized with the visual content
4. WHEN the mouse cursor reaches the target coordinates, THE Editor SHALL display a click ripple animation
5. WHEN all Steps have been rendered, THE Editor SHALL loop back to the beginning or stop based on user playback settings

### Requirement 11: Script Editing and TTS Regeneration

**User Story:** As a user, I want to edit the narration for each step, so that I can customize the voice-over without re-recording.

#### Acceptance Criteria

1. WHEN the Editor displays the step list sidebar, THE Editor SHALL show each Step with its current script_text in an editable text field
2. WHEN the user modifies the script_text and clicks "Save" or presses Enter, THE Editor SHALL POST the updated text to /api/steps/{id}/update_script
3. WHEN the Backend receives the update request, THE TTS_Service SHALL generate new audio from the updated text
4. WHEN the TTS generation completes, THE Backend SHALL return the new audio_url and duration_frames
5. WHEN the Editor receives the response, THE Editor SHALL update the Remotion composition with the new audio and re-render the affected Step

### Requirement 12: Video Playback Controls

**User Story:** As a user, I want standard video controls, so that I can navigate and review my demo effectively.

#### Acceptance Criteria

1. WHEN the Editor displays the video player, THE Editor SHALL show play/pause button, progress bar, and playback speed selector
2. WHEN the user clicks the play/pause button, THE Editor SHALL toggle video playback state
3. WHEN the user drags the progress bar, THE Editor SHALL seek to the corresponding frame in the video timeline
4. WHEN the user selects a playback speed (0.5x, 1x, 1.5x, 2x), THE Editor SHALL adjust the video playback rate accordingly
5. WHEN the video is playing, THE Editor SHALL update the progress bar position in real-time

### Requirement 13: Video Export

**User Story:** As a user, I want to export my demo as an MP4 file, so that I can share it with my team or customers.

#### Acceptance Criteria

1. WHEN the user clicks the "Export" button, THE Editor SHALL send a render request to POST /api/projects/{id}/export
2. WHEN the Backend receives the export request, THE Backend SHALL trigger Remotion server-side rendering to generate an MP4 file
3. WHEN rendering is in progress, THE Editor SHALL display a progress indicator showing rendering percentage
4. WHEN rendering completes, THE Backend SHALL return a download URL for the MP4 file
5. WHEN the download URL is received, THE Editor SHALL automatically trigger a browser download of the MP4 file

### Requirement 14: Backend Project Management API

**User Story:** As a developer, I want RESTful APIs for project management, so that the frontend can perform CRUD operations.

#### Acceptance Criteria

1. THE Backend SHALL provide POST /api/projects endpoint that creates a new Project and returns project_id and uuid
2. THE Backend SHALL provide GET /api/projects endpoint that returns a list of all Projects with optional folder_id filter
3. THE Backend SHALL provide GET /api/projects/{id} endpoint that returns detailed information for a specific Project
4. THE Backend SHALL provide PUT /api/projects/{id} endpoint that updates Project title or folder_id
5. THE Backend SHALL provide DELETE /api/projects/{id} endpoint that performs soft delete by setting deleted_at timestamp

### Requirement 15: Backend Recording Session Management

**User Story:** As a developer, I want APIs to manage recording sessions, so that the Extension can upload data incrementally.

#### Acceptance Criteria

1. THE Backend SHALL provide POST /api/recording/start endpoint that creates a recording session and returns session_id
2. THE Backend SHALL provide POST /api/recording/chunk endpoint that accepts Step data including Base64 image, coordinates, and metadata
3. WHEN receiving a chunk, THE Backend SHALL decode the Base64 image, save it to storage, and create a Step record in the database
4. THE Backend SHALL provide POST /api/recording/stop endpoint that finalizes the session and returns project_id and redirect_url
5. WHEN a session is stopped, THE Backend SHALL generate a thumbnail from the first Step's image and update the Project record

### Requirement 16: Backend TTS Service Integration

**User Story:** As a developer, I want text-to-speech conversion, so that narration can be automatically generated from text.

#### Acceptance Criteria

1. WHEN the Backend receives script_text for a Step, THE TTS_Service SHALL convert the text to MP3 audio using gTTS
2. WHEN audio generation completes, THE TTS_Service SHALL save the MP3 file to storage and return the audio_url
3. WHEN audio is generated, THE TTS_Service SHALL calculate the audio duration in seconds and convert it to duration_frames (assuming 30 FPS)
4. THE Backend SHALL store the audio_url and duration_frames in the Steps table
5. IF TTS generation fails, THEN THE Backend SHALL return an error response with status code 500 and error message

### Requirement 17: Backend Resource Storage

**User Story:** As a developer, I want reliable file storage for images and audio, so that media assets are accessible to the frontend.

#### Acceptance Criteria

1. WHEN the Backend receives a Base64 encoded image, THE Backend SHALL decode it and save it as a PNG file in the local filesystem
2. WHEN the Backend saves a file, THE Backend SHALL generate a unique filename using UUID and timestamp
3. WHEN a file is saved, THE Backend SHALL return a publicly accessible URL in the format /static/images/{filename}
4. THE Backend SHALL serve static files from the /static route with appropriate MIME types
5. WHERE production deployment is used, THE Backend SHALL support uploading files to AWS S3 and returning S3 URLs

### Requirement 18: Database Schema and Data Integrity

**User Story:** As a developer, I want a well-structured database schema, so that data relationships are maintained correctly.

#### Acceptance Criteria

1. THE Backend SHALL create a Projects table with columns: id (PK), uuid, title, folder_id (FK), thumbnail_url, created_at, deleted_at
2. THE Backend SHALL create a Folders table with columns: id (PK), name, type (system/user), created_at
3. THE Backend SHALL create a Steps table with columns: id (PK), project_id (FK), order_index, action_type, target_text, script_text, audio_url, image_url, pos_x, pos_y, duration_frames
4. WHEN a Project is deleted, THE Backend SHALL set the deleted_at timestamp rather than removing the record (soft delete)
5. WHEN a Project is deleted, THE Backend SHALL maintain referential integrity by keeping associated Steps in the database

### Requirement 19: Extension Badge Status Management

**User Story:** As a user, I want clear visual feedback on recording status, so that I always know if recording is active.

#### Acceptance Criteria

1. WHEN the Extension is idle, THE Extension SHALL display no Badge text and default icon color
2. WHEN recording is initializing, THE Extension SHALL set Badge background to yellow (#FFAA00) and text to "..."
3. WHEN recording is active, THE Extension SHALL set Badge background to red (#FF0000) and text to "REC" or elapsed time
4. WHEN recording is paused, THE Extension SHALL set Badge background to gray (#808080) and text to "||"
5. WHEN recording completes, THE Extension SHALL clear the Badge text and restore default icon color

### Requirement 20: Extension Shadow DOM Isolation

**User Story:** As a developer, I want injected UI to be isolated from page styles, so that the Control_Bar renders consistently across all websites.

#### Acceptance Criteria

1. WHEN the Extension injects the Control_Bar, THE Extension SHALL create a Shadow_DOM root attached to a container element
2. WHEN the Shadow_DOM is created, THE Extension SHALL set the container's z-index to 2147483647 (maximum integer value)
3. WHEN styles are applied to the Control_Bar, THE Extension SHALL encapsulate all CSS within the Shadow_DOM to prevent style leakage
4. WHEN the page has existing styles, THE Shadow_DOM SHALL prevent page CSS from affecting the Control_Bar appearance
5. WHEN the Control_Bar is removed, THE Extension SHALL remove the Shadow_DOM container from the page DOM

### Requirement 21: Recording Stream Synchronization

**User Story:** As a developer, I want precise control over recording state, so that pauses and resumes don't create artifacts in the video.

#### Acceptance Criteria

1. WHEN the user triggers pause, THE Recorder SHALL call mediaRecorder.pause() before injecting any UI elements
2. WHEN pause() is called, THE Recorder SHALL wait for the pause event to fire before proceeding with UI injection
3. WHEN the user triggers resume, THE Recorder SHALL remove all UI elements before calling mediaRecorder.resume()
4. WHEN resume() is called, THE Recorder SHALL wait for the resume event to fire before updating the Badge status
5. WHEN recording stops, THE Recorder SHALL call mediaRecorder.stop() and wait for the dataavailable event before uploading final data

### Requirement 22: Editor Step List Navigation

**User Story:** As a user, I want to see all steps in a sidebar, so that I can navigate to specific parts of my demo.

#### Acceptance Criteria

1. WHEN the Editor loads, THE Editor SHALL display a sidebar listing all Steps in order_index sequence
2. WHEN a Step is displayed in the list, THE Editor SHALL show the Step's thumbnail, order number, and script_text preview
3. WHEN the user clicks a Step in the list, THE Editor SHALL seek the video playback to that Step's start frame
4. WHEN a Step is currently playing, THE Editor SHALL highlight that Step in the sidebar list
5. WHEN the user hovers over a Step, THE Editor SHALL display a tooltip with the full script_text

### Requirement 23: Folder System Initialization

**User Story:** As a user, I want default folders available immediately, so that I can start organizing projects without setup.

#### Acceptance Criteria

1. WHEN the Backend initializes the database, THE Backend SHALL create a system folder named "All Flows" with type='system'
2. WHEN the Backend initializes the database, THE Backend SHALL create a system folder named "Trash" with type='system'
3. WHEN a new Project is created without specifying folder_id, THE Backend SHALL assign it to the "All Flows" folder
4. WHEN Projects are queried with folder_id for "All Flows", THE Backend SHALL return all Projects except those in Trash
5. THE Backend SHALL prevent deletion of system folders (type='system')

### Requirement 24: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I know how to resolve issues.

#### Acceptance Criteria

1. WHEN any API request fails with a network error, THE Frontend SHALL display a toast notification with "Network error, please check your connection"
2. WHEN the Backend returns a 4xx error, THE Frontend SHALL display the error message from the response body
3. WHEN the Backend returns a 5xx error, THE Frontend SHALL display "Server error, please try again later"
4. WHEN the Extension fails to capture a screenshot, THE Extension SHALL log the error to the console and continue recording subsequent Steps
5. WHEN TTS generation fails for a Step, THE Backend SHALL store the Step without audio_url and return a warning in the response

### Requirement 25: Performance and Resource Management

**User Story:** As a user, I want the tool to perform efficiently, so that recording and editing don't slow down my browser.

#### Acceptance Criteria

1. WHEN capturing screenshots, THE Recorder SHALL compress PNG images to reduce file size before upload
2. WHEN uploading Step data, THE Recorder SHALL batch uploads every 5 Steps or 10 seconds, whichever comes first
3. WHEN the Editor loads a Project with more than 50 Steps, THE Editor SHALL implement virtual scrolling in the step list sidebar
4. WHEN rendering video in the Editor, THE Editor SHALL use Remotion's lazy loading to render only visible frames
5. WHEN the Backend processes images, THE Backend SHALL generate thumbnails at 320x180 resolution for Project cards
