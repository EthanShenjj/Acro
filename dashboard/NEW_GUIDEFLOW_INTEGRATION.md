# New Guideflow Button Integration

## Overview

The "New Guideflow" button in the dashboard header allows users to start a new recording session directly from the web interface. This feature integrates the dashboard with the Chrome Extension using the Chrome Extension messaging API.

## Implementation Details

### Dashboard Component (`app/dashboard/page.tsx`)

The dashboard page includes:

1. **New Guideflow Button**: A prominent button in the header that triggers recording
2. **Loading State**: Shows a spinner while starting the recording
3. **Error Handling**: Displays user-friendly error messages if the extension is not installed or fails to respond

### Key Features

- **Extension Detection**: Checks if the Chrome Extension API is available
- **Extension Communication**: Uses `chrome.runtime.sendMessage` to communicate with the extension
- **Error Messages**: Provides clear feedback when:
  - Extension is not installed
  - Extension is not responding
  - Browser doesn't support Chrome Extension API
  - Recording fails to start

### Chrome Extension Integration

The extension's `background.js` handles the `START_RECORDING_FROM_DASHBOARD` message by:

1. Creating a new tab for recording
2. Initializing a recording session with the backend
3. Showing a countdown in the new tab
4. Starting the recording

### Configuration

The extension ID must be configured in the dashboard's environment variables:

```env
NEXT_PUBLIC_EXTENSION_ID=your_extension_id_here
```

To get the extension ID:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Load the Acro extension
4. Copy the ID shown under the extension name

### Manifest Configuration

The extension's `manifest.json` includes `externally_connectable` to allow the dashboard to send messages:

```json
"externally_connectable": {
  "matches": [
    "http://localhost:3000/*",
    "http://localhost:3001/*",
    "https://*.autodemo.com/*"
  ]
}
```

## User Flow

1. User clicks "New Guideflow" button in dashboard
2. Dashboard sends message to Chrome Extension
3. Extension creates a new tab
4. Extension starts recording session with backend
5. Extension shows countdown in new tab
6. Recording begins automatically

## Error Handling

### Extension Not Installed
```
Acro Chrome Extension is not installed or not responding. 
Please install the extension first.
```

### Browser Not Supported
```
Chrome extension API not available. 
Please use Chrome or Edge browser.
```

### Recording Failed
```
Failed to start recording. Please try again.
```

## Testing

To test the integration:

1. Install the Chrome Extension
2. Configure the extension ID in `.env.local`
3. Start the dashboard (`npm run dev`)
4. Click the "New Guideflow" button
5. Verify a new tab opens and recording starts

## Requirements Validation

This implementation satisfies **Requirement 6.5**:

> WHEN the user clicks "New guideflow" button, THE Dashboard SHALL trigger the Extension to start a new recording session

✅ Button created in dashboard header  
✅ Uses `chrome.runtime.sendMessage` to communicate with extension  
✅ Extension starts new recording session  
✅ Error handling for missing extension  
✅ User feedback during loading and errors  

## Future Enhancements

- Add a visual indicator when extension is not installed
- Provide a direct link to install the extension
- Add keyboard shortcut for starting recording
- Show recording status in dashboard while recording is active
