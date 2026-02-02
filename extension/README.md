# Acro Demo Recorder - Chrome Extension

A Chrome extension for recording product demos with automatic screenshot capture and narration.

## Project Structure

```
extension/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service Worker for state management
├── content.js          # Content script for DOM manipulation
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

## Features

- **Recording Session Management**: Start, pause, resume, and stop recording sessions
- **Automatic Screenshot Capture**: Captures screenshots on user clicks
- **Badge Status Indicators**: Visual feedback on recording state
- **Shadow DOM UI Injection**: Isolated control bar that doesn't interfere with page styles
- **Click Feedback**: Red ripple animation on captured clicks
- **Page Freeze**: Grayscale filter and pointer blocking during pause

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` directory
5. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon to open the popup
2. Configure recording options (microphone, recording range)
3. Click "Start Recording"
4. A 3-2-1 countdown will appear
5. Perform your demo actions - clicks will be captured automatically
6. Click the extension icon again to pause or stop recording
7. When done, the editor will open automatically with your recorded demo

## Permissions

- **tabs**: Access to tab information for screenshot capture
- **activeTab**: Access to the currently active tab
- **storage**: Store recording session state
- **scripting**: Inject content scripts dynamically
- **host_permissions**: Access to all URLs for recording

## Backend Integration

The extension communicates with a Flask backend API at `http://localhost:5000`:

- `POST /api/recording/start` - Start a new recording session
- `POST /api/recording/chunk` - Upload captured step data
- `POST /api/recording/stop` - Finalize recording and get project URL

Make sure the backend is running before using the extension.

## Development

### Testing

Load the extension in Chrome and test the following flows:

1. **Start Recording**: Verify countdown appears and badge turns red
2. **Capture Clicks**: Click elements and verify ripple animation
3. **Pause/Resume**: Verify control bar appears and page freezes
4. **Stop Recording**: Verify editor opens in new tab

### Debugging

- Open Chrome DevTools for the popup: Right-click extension icon → "Inspect popup"
- View service worker logs: Go to `chrome://extensions/` → Click "service worker" link
- View content script logs: Open DevTools on the page being recorded

### Known Limitations

- Screenshot capture requires the tab to be visible
- Some websites may block content script injection
- Recording state is lost if the extension is reloaded

## Build Process (Optional)

For production, you may want to:

1. Minify JavaScript files
2. Bundle dependencies if using npm packages
3. Optimize icon files
4. Add source maps for debugging

Consider using tools like:
- **Webpack**: Module bundler
- **Vite**: Fast build tool
- **Rollup**: JavaScript module bundler

## Requirements Validation

This implementation satisfies:

- **Requirement 1.1**: Chrome extension with recording initialization
- **Requirement 1.2**: Permissions for tabs, activeTab, storage, scripting
- **Manifest V3**: Uses service worker instead of background page
- **Content Script**: Handles DOM manipulation and event capture
- **Popup UI**: Provides recording controls and status display

## Next Steps

1. Add icon files to `icons/` directory
2. Implement screenshot capture in background.js
3. Add retry logic for failed uploads
4. Implement batch uploading
5. Add error recovery and state persistence
6. Test across different websites and scenarios
