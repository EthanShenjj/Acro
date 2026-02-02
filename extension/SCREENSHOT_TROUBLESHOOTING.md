# Screenshot Capture Troubleshooting Guide

## Problem
The extension is failing to capture screenshots with the error: "Failed to capture screenshot"

## Root Cause Analysis

### Chrome Extension Screenshot API Limitations

The `chrome.tabs.captureVisibleTab()` API has specific requirements:

1. **Tab Visibility**: Can ONLY capture the currently visible/active tab
2. **Window Focus**: The window containing the tab must be focused
3. **Permissions**: Requires `activeTab` and `tabs` permissions (✓ we have these)
4. **Tab State**: Tab must be fully loaded and not showing chrome:// or extension:// pages

### Common Failure Scenarios

1. **User switched tabs** - Most common issue
   - User starts recording in Tab A
   - User switches to Tab B
   - Extension tries to capture Tab A → FAILS

2. **Window not focused**
   - Recording window is minimized or behind another window
   - Screenshot capture will fail

3. **Special pages**
   - chrome:// pages (settings, extensions, etc.)
   - extension:// pages
   - about:blank before navigation
   - These cannot be captured

## Solutions Implemented

### 1. Tab Visibility Check (background.js)
```javascript
// Check if the requested tab is the currently active tab
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

if (activeTab.id !== tabId) {
  throw new Error('Recording tab is not visible. Please keep the recording tab active.');
}
```

### 2. Better Error Messages (content.js)
```javascript
// Provide helpful error messages to users
if (response.error.includes('visible') || response.error.includes('active')) {
  reject(new Error('Recording tab must remain visible. Please do not switch tabs during recording.'));
}
```

### 3. Window-Specific Capture (background.js)
```javascript
// Capture from the specific window containing the recording tab
const tab = await chrome.tabs.get(tabId);
const windowId = tab.windowId;
const screenshot = await chrome.tabs.captureVisibleTab(windowId, { ... });
```

## Testing Steps

### 1. Test Basic Screenshot Capture

Open the extension background page console (chrome://extensions → Acro Demo Recorder → Service Worker → Console) and run:

```javascript
// Test screenshot capture
async function testCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Active tab:', tab);
  
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100
    });
    console.log('✓ Screenshot captured, length:', screenshot.length);
    return screenshot;
  } catch (error) {
    console.error('✗ Screenshot failed:', error);
  }
}

testCapture();
```

### 2. Test During Recording

1. Start recording on test-page.html
2. Open browser console (F12)
3. Watch for screenshot-related messages
4. Click or scroll
5. Check if screenshots are being captured

Expected console output:
```
[Acro] Requesting screenshot from background...
[Background] Capturing screenshot for tab: 123
[Background] Screenshot captured successfully, size: 50000
[Acro] Screenshot received, size: 50000
```

### 3. Test Tab Switching Scenario

1. Start recording on test-page.html
2. Switch to another tab
3. Switch back to recording tab
4. Try to click/scroll
5. Should see error about tab visibility

### 4. Reload Extension

After making changes:
```bash
# Go to chrome://extensions
# Click the reload button for "Acro Demo Recorder"
# Or use the keyboard shortcut: Cmd+R (Mac) / Ctrl+R (Windows)
```

## Debugging Checklist

- [ ] Extension has `activeTab` and `tabs` permissions in manifest.json
- [ ] Recording tab is the currently active/visible tab
- [ ] Window containing recording tab is focused
- [ ] Not recording on chrome:// or extension:// pages
- [ ] Tab is fully loaded (not showing loading spinner)
- [ ] No browser console errors about permissions
- [ ] Extension service worker is running (not crashed)

## Alternative Solutions (If Issues Persist)

### Option 1: Use chrome.tabCapture API
- More reliable for continuous capture
- Requires `tabCapture` permission
- Can capture even when tab is not visible
- More complex implementation

### Option 2: Inject Canvas-Based Capture
- Use html2canvas or similar library
- Capture DOM directly in content script
- Doesn't require tab to be visible
- May miss some visual elements (videos, iframes)

### Option 3: User Guidance
- Show warning when user tries to switch tabs
- Pause recording automatically when tab loses focus
- Resume when tab regains focus

## Current Implementation Status

✓ Tab visibility check implemented
✓ Better error messages implemented  
✓ Window-specific capture implemented
⏳ Testing required
⏳ User guidance for tab switching (future enhancement)

## Next Steps

1. Reload the extension
2. Test on test-page.html
3. Monitor console for errors
4. If still failing, check browser console for permission errors
5. Consider implementing Option 3 (user guidance) if tab switching is common
