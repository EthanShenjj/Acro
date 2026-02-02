# Chrome Extension Testing Guide

This guide will help you test the Acro Demo Recorder Chrome Extension end-to-end.

## Prerequisites

Before testing the extension, ensure:

1. **Backend is running**: The Flask backend must be running on `http://localhost:5000`
2. **Database is initialized**: Run the database initialization script
3. **Extension is loaded**: Load the unpacked extension in Chrome

## Setup Instructions

### 1. Start the Backend Server

```bash
cd backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Initialize the database
python init_db.py

# Start the Flask server
python app.py
```

The backend should start on `http://localhost:5000`. Verify it's running by visiting:
- http://localhost:5000/api/folders (should return system folders)

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` directory from this project
5. The Acro Demo Recorder extension should appear in your extensions list

**Note**: You'll need extension icons. If they're missing, you can:
- Use the `extension/icons/generate-icons.html` file to create placeholder icons
- Or temporarily comment out the icon references in `manifest.json`

### 3. Verify Extension Installation

1. Look for the Acro extension icon in your Chrome toolbar
2. Click the icon - you should see the popup with "Start Recording" button
3. Check the browser console for any errors (F12 → Console tab)

## Test Scenarios

### Test 1: Recording Flow End-to-End

**Objective**: Verify the complete recording workflow from start to finish.

**Steps**:

1. **Start Recording**
   - Click the Acro extension icon
   - Verify popup shows "Ready to record" status
   - Click "Start Recording" button
   - Expected: 3-2-1 countdown appears on the page
   - Expected: Badge turns red with "REC" text
   - Expected: Countdown disappears after 3 seconds

2. **Capture Interactions**
   - Click on various elements on the page (buttons, links, text)
   - Expected: Red ripple animation appears at each click location
   - Expected: Badge remains red with "REC"
   - Check browser console for upload messages

3. **Verify Data Upload**
   - Open browser DevTools (F12) → Network tab
   - Filter by "recording"
   - Expected: POST requests to `/api/recording/chunk` for each click
   - Expected: Requests return 200 status
   - Check backend console for received data

4. **Complete Recording**
   - Click the extension icon again
   - Expected: Control bar appears at top of page
   - Expected: Page becomes grayscale and unclickable
   - Expected: Badge turns gray with "||" text
   - Click "Done" button on control bar
   - Expected: New tab opens with editor URL
   - Expected: Badge clears (no text)
   - Expected: Control bar disappears

**Success Criteria**:
- ✅ Countdown displays correctly
- ✅ Clicks are captured with ripple animations
- ✅ Data uploads to backend successfully
- ✅ Editor opens in new tab with project ID

### Test 2: Badge State Transitions

**Objective**: Verify badge updates correctly through all states.

**Steps**:

1. **Idle State**
   - Extension installed but not recording
   - Expected: No badge text, default icon

2. **Initializing State**
   - Click "Start Recording"
   - Expected: Badge shows yellow background with "..." text
   - Duration: Brief (1-2 seconds)

3. **Recording State**
   - After countdown completes
   - Expected: Badge shows red background (#FF0000) with "REC" text
   - Remains red while recording

4. **Paused State**
   - Click extension icon during recording
   - Expected: Badge shows gray background (#808080) with "||" text
   - Remains gray while paused

5. **Back to Recording**
   - Click "Continue" on control bar
   - Expected: Badge returns to red with "REC"

6. **Stopped State**
   - Click "Done" on control bar
   - Expected: Badge clears (no text, default icon)

**Success Criteria**:
- ✅ Badge transitions follow state machine: idle → initializing → recording → paused → recording → stopped → idle
- ✅ Colors match requirements (yellow, red, gray)
- ✅ Text matches requirements ("...", "REC", "||")

### Test 3: Pause and Resume Functionality

**Objective**: Verify pause/resume works correctly with proper UI sequencing.

**Steps**:

1. **Start Recording**
   - Start a recording session
   - Capture 2-3 clicks

2. **Pause Recording**
   - Click extension icon
   - Expected: Page freezes (grayscale, no pointer events)
   - Expected: Control bar appears at top
   - Expected: Badge turns gray with "||"
   - Try clicking on page elements
   - Expected: Clicks are blocked (page is frozen)

3. **Verify Pause State**
   - Control bar should show:
     - Timer (elapsed time)
     - "▶️ Continue" button
     - "✅ Done" button
   - Page should be grayscale and unclickable

4. **Resume Recording**
   - Click "▶️ Continue" button
   - Expected: Control bar disappears
   - Expected: Page unfreezes (color restored, clickable)
   - Expected: 3-2-1 countdown appears
   - Expected: Badge turns red with "REC" after countdown
   - Capture more clicks
   - Expected: Clicks are captured normally

5. **Pause Again**
   - Click extension icon again
   - Expected: Pause works as before

6. **Complete Recording**
   - Click "✅ Done" button
   - Expected: Recording stops and editor opens

**Success Criteria**:
- ✅ Page freezes correctly during pause (grayscale + no pointer events)
- ✅ Control bar appears/disappears at correct times
- ✅ Countdown shows before resuming
- ✅ Recording continues after resume
- ✅ Multiple pause/resume cycles work correctly

### Test 4: Data Upload Verification

**Objective**: Verify captured data is uploaded correctly to backend.

**Steps**:

1. **Start Recording**
   - Start a new recording session
   - Note the session ID from backend logs

2. **Capture Steps**
   - Click on 5 different elements
   - Wait 10 seconds (for batch upload)

3. **Check Backend**
   - Open backend console
   - Expected: Log messages showing received chunks
   - Check database:
     ```bash
     # In backend directory
     python -c "from app import app, db; from models.step import Step; \
     with app.app_context(): print(Step.query.count())"
     ```
   - Expected: 5 steps in database

4. **Verify Step Data**
   - Each step should have:
     - session_id
     - order_index (1, 2, 3, 4, 5)
     - action_type ('click')
     - target_text (text from clicked element)
     - pos_x, pos_y (click coordinates)
     - viewport_width, viewport_height
     - image_url (path to saved screenshot)

5. **Check Uploaded Files**
   - Navigate to `backend/static/images/`
   - Expected: 5 PNG files (one per click)
   - Files should be named with UUID + timestamp

**Success Criteria**:
- ✅ All clicks are uploaded to backend
- ✅ Step data is complete and accurate
- ✅ Screenshots are saved correctly
- ✅ Batch uploading works (uploads every 5 steps or 10 seconds)

### Test 5: Error Handling

**Objective**: Verify extension handles errors gracefully.

**Steps**:

1. **Backend Offline Test**
   - Stop the backend server
   - Start recording
   - Expected: Error message in console
   - Expected: Extension shows error notification
   - Capture some clicks
   - Expected: Uploads fail but extension continues
   - Expected: Failed uploads stored in IndexedDB

2. **Screenshot Failure Test**
   - Start recording on a page with restricted permissions
   - Expected: Error logged to console
   - Expected: Recording continues for subsequent clicks

3. **Network Error Test**
   - Use browser DevTools to throttle network (Offline mode)
   - Start recording and capture clicks
   - Expected: Retry logic activates (1s, 2s, 4s delays)
   - Expected: After 3 retries, data stored in IndexedDB
   - Expected: User notified of upload failure

**Success Criteria**:
- ✅ Extension doesn't crash on errors
- ✅ Failed uploads are retried with exponential backoff
- ✅ Failed uploads stored in IndexedDB after max retries
- ✅ User receives clear error messages

## Troubleshooting

### Extension Not Loading

**Issue**: Extension fails to load in Chrome

**Solutions**:
- Check for syntax errors in manifest.json
- Ensure all referenced files exist (background.js, content.js, popup.html, icons)
- Check Chrome console for error messages
- Try reloading the extension (chrome://extensions/ → Reload button)

### Backend Connection Failed

**Issue**: Extension can't connect to backend

**Solutions**:
- Verify backend is running: `curl http://localhost:5000/api/folders`
- Check CORS settings in backend (should allow extension origin)
- Check browser console for CORS errors
- Verify backend URL in extension code matches actual backend URL

### Badge Not Updating

**Issue**: Extension badge doesn't change color/text

**Solutions**:
- Check browser console for errors in background.js
- Verify `chrome.action` API is available (Manifest V3)
- Try reloading the extension
- Check if badge updates are being called (add console.logs)

### Screenshots Not Capturing

**Issue**: Screenshots fail to capture

**Solutions**:
- Ensure extension has `activeTab` permission
- Check if page allows screenshots (some sites block it)
- Verify `chrome.tabs.captureVisibleTab` is being called
- Check browser console for permission errors

### Control Bar Not Showing

**Issue**: Control bar doesn't appear when paused

**Solutions**:
- Check if Shadow DOM is supported in browser
- Verify content script is injected (check page console)
- Check for CSS conflicts with page styles
- Verify z-index is high enough (2147483647)

## Test Results Checklist

After completing all tests, verify:

- [ ] Recording starts with countdown
- [ ] Badge states transition correctly (idle → initializing → recording → paused → stopped)
- [ ] Clicks are captured with ripple animations
- [ ] Screenshots are taken for each click
- [ ] Data uploads to backend successfully
- [ ] Batch uploading works (5 steps or 10 seconds)
- [ ] Pause freezes page (grayscale + no pointer events)
- [ ] Control bar appears during pause
- [ ] Resume shows countdown and unfreezes page
- [ ] Multiple pause/resume cycles work
- [ ] Stop recording opens editor in new tab
- [ ] Badge clears after recording stops
- [ ] All UI elements removed after stop
- [ ] Error handling works (retry logic, IndexedDB storage)
- [ ] Extension doesn't crash on errors

## Next Steps

Once all tests pass:

1. Document any issues found
2. Fix any bugs discovered during testing
3. Proceed to Phase 3: Web Dashboard implementation
4. Consider adding automated tests for critical flows

## Notes

- This is a **manual testing checkpoint** - automated tests exist but manual verification is essential
- Test on different websites to ensure compatibility
- Test with different screen sizes and resolutions
- Consider testing on different Chrome versions if possible
- Keep browser console open during testing to catch errors early
