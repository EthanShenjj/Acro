# Chunk Upload 400 Error Troubleshooting

## Problem
Getting 400 errors when uploading recording chunks to `/api/recording/chunk`:
```
127.0.0.1 - - [02/Feb/2026 15:45:38] "POST /api/recording/chunk HTTP/1.1" 400 -
```

## Changes Made

### 1. Enhanced Backend Logging (`backend/routes/recording.py`)
Added detailed logging to see what data is being received:
- Logs all received fields (except full base64 data)
- Shows which required fields are missing
- Helps identify the exact cause of 400 errors

### 2. Enhanced Extension Logging (`extension/background.js`)
Added logging to see what data is being sent:
- Logs step data before upload (without full base64)
- Logs response status and error details
- Shows retry attempts with exponential backoff

### 3. Debug Test Script (`extension/debug-chunk-upload.js`)
Created a standalone test script to verify the endpoint works correctly.

## Debugging Steps

### Step 1: Check Backend Logs
Look for the new detailed log messages:
```
INFO: Received chunk upload request: {'sessionId': '...', 'orderIndex': 0, ...}
ERROR: Missing required fields: ['screenshotBase64']. Received fields: [...]
```

### Step 2: Check Extension Console
Open Chrome DevTools > Console and look for:
```
[Background] Uploading step data: {sessionId: '...', orderIndex: 0, ...}
[Background] Upload failed: 400 {"error": "Bad Request", "message": "..."}
```

### Step 3: Run Debug Test Script
1. Open any webpage
2. Open Chrome DevTools Console
3. Copy and paste the contents of `extension/debug-chunk-upload.js`
4. Press Enter to run
5. Check the console output for detailed test results

### Step 4: Verify Required Fields
The backend expects these fields in the chunk upload:
- `sessionId` (string) - Session UUID from /api/recording/start
- `orderIndex` (number) - Step sequence number (0-based)
- `actionType` (string) - Type of action (e.g., 'click', 'type', 'scroll')
- `posX` (number) - X coordinate of action
- `posY` (number) - Y coordinate of action
- `screenshotBase64` (string) - Base64-encoded PNG image with data URI prefix

Optional fields:
- `targetText` (string) - Text description of target element
- `viewportWidth` (number) - Viewport width in pixels
- `viewportHeight` (number) - Viewport height in pixels

## Common Issues

### Issue 1: Missing screenshotBase64
**Symptom**: Error message says "Missing required fields: screenshotBase64"

**Causes**:
- Screenshot capture failed in content script
- Screenshot is null or undefined
- Tab is not visible (chrome.tabs.captureVisibleTab only works on visible tabs)

**Solution**:
- Check content script console for screenshot capture errors
- Ensure recording tab is active and visible
- Check if screenshot has proper data URI format: `data:image/png;base64,...`

### Issue 2: Invalid Session ID
**Symptom**: Error message says "Invalid session ID"

**Causes**:
- Recording session was not started
- Session ID is null or undefined
- Session expired or was cleared

**Solution**:
- Ensure /api/recording/start was called successfully
- Check that sessionId is being stored in recordingSession state
- Verify sessionId is being passed to content script

### Issue 3: Invalid Base64 Data
**Symptom**: Error message says "Invalid Base64 image data"

**Causes**:
- Screenshot is not in proper base64 format
- Data URI prefix is missing or incorrect
- Image data is corrupted

**Solution**:
- Verify screenshot starts with `data:image/png;base64,`
- Check that canvas.toDataURL() is working correctly
- Test with a simple test image (see debug script)

### Issue 4: JSON Parsing Error
**Symptom**: Backend logs show "No JSON data in request body"

**Causes**:
- Content-Type header is missing or incorrect
- Request body is empty
- JSON.stringify() failed

**Solution**:
- Verify Content-Type header is set to 'application/json'
- Check that stepData object is valid before stringify
- Look for JSON serialization errors in console

## Testing the Fix

### Test 1: Backend Endpoint Test
```bash
# Start backend
cd backend
python app.py

# In another terminal, test the endpoint
curl -X POST http://localhost:5001/api/recording/start \
  -H "Content-Type: application/json" \
  -d '{}'

# Note the sessionId, then test chunk upload
curl -X POST http://localhost:5001/api/recording/chunk \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "orderIndex": 0,
    "actionType": "click",
    "targetText": "Test",
    "posX": 100,
    "posY": 200,
    "screenshotBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

### Test 2: Extension Test
1. Load the extension in Chrome
2. Open a test page
3. Start recording
4. Perform a click action
5. Check both extension console and backend logs
6. Look for the new detailed log messages

### Test 3: Debug Script Test
1. Open any webpage
2. Open Chrome DevTools Console
3. Run the debug script (see Step 3 above)
4. Verify all steps complete successfully

## Next Steps

After running the debugging steps above, you should see detailed error messages that indicate:
1. Which fields are missing from the request
2. What data is actually being sent
3. Where in the flow the error occurs

Share the log output from:
- Backend console (with the new detailed logs)
- Extension console (with the new upload logs)
- Debug script output

This will help identify the exact cause of the 400 errors.
