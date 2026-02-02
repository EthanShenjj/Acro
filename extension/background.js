/**
 * Acro Demo Recorder - Background Service Worker
 * Handles recording session state management and communication between components
 */

/**
 * @typedef {Object} RecordingSession
 * @property {string|null} sessionId - Unique identifier for the recording session
 * @property {number|null} projectId - Project ID after session is finalized
 * @property {'idle'|'initializing'|'recording'|'paused'|'stopped'} status - Current recording state
 * @property {number|null} startTime - Timestamp when recording started
 * @property {number} stepCount - Number of steps captured in this session
 * @property {number|null} currentTabId - ID of the tab being recorded
 */

/**
 * Recording session state
 * @type {RecordingSession}
 */
let recordingSession = {
  sessionId: null,
  projectId: null,
  status: 'idle', // idle | initializing | recording | paused | stopped
  startTime: null,
  stepCount: 0,
  currentTabId: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Acro Demo Recorder installed');
  // Initialize storage
  chrome.storage.local.set({ recordingSession });
});

// Handle extension icon click
// Requirements: 4.1 - When user clicks Extension icon during active recording, pause
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, current state:', recordingSession.status);

  // If recording is active, pause it
  if (recordingSession.status === 'recording') {
    try {
      await handlePauseRecording();
      console.log('Recording paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }
  // Note: Starting recording is handled by the popup, not the icon click
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'GET_SESSION_STATE':
      sendResponse({ session: recordingSession });
      break;

    case 'START_RECORDING':
      handleStartRecording(message.data)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'START_RECORDING_FROM_DASHBOARD':
      // Handle recording start from dashboard
      // Requirements: 6.5 - Dashboard triggers Extension to start recording
      handleStartRecordingFromDashboard()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'PAUSE_RECORDING':
      handlePauseRecording()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'RESUME_RECORDING':
      handleResumeRecording()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'STOP_RECORDING':
      handleStopRecording()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'UPLOAD_STEP':
      handleUploadStep(message.data)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'CAPTURE_SCREENSHOT':
      captureScreenshot(sender.tab.id)
        .then(screenshot => sendResponse({ screenshot }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Validate state transition
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} - Whether transition is valid
 */
function isValidStateTransition(fromState, toState) {
  const validTransitions = {
    'idle': ['initializing'],
    'initializing': ['recording', 'idle'],
    'recording': ['paused', 'stopped'],
    'paused': ['recording', 'stopped', 'idle'],  // Allow paused -> idle for error recovery
    'stopped': ['idle']
  };

  return validTransitions[fromState]?.includes(toState) || false;
}

/**
 * Update recording session state
 * @param {Partial<RecordingSession>} updates - State updates to apply
 * @throws {Error} - If state transition is invalid
 */
async function updateSessionState(updates) {
  if (updates.status && updates.status !== recordingSession.status) {
    if (!isValidStateTransition(recordingSession.status, updates.status)) {
      throw new Error(`Invalid state transition: ${recordingSession.status} -> ${updates.status}`);
    }
  }

  recordingSession = { ...recordingSession, ...updates };
  await saveSessionState();

  if (updates.status) {
    await updateBadge();
  }
}

/**
 * Start recording session
 */
async function handleStartRecording(data) {
  try {
    // If not in idle state, reset to idle first
    if (recordingSession.status !== 'idle') {
      await updateSessionState({
        sessionId: null,
        projectId: null,
        status: 'idle',
        startTime: null,
        stepCount: 0,
        currentTabId: null
      });
    }

    // Update state to initializing
    await updateSessionState({ status: 'initializing' });

    // Get the current tab ID
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabId = tab?.id || null;

    if (!currentTabId) {
      throw new Error('No active tab found');
    }

    // Call backend to create session
    const response = await fetch('http://localhost:5001/api/recording/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Failed to start recording session');
    }

    const result = await response.json();

    console.log('[Background] Recording session created:', result.sessionId);

    // Update session state to recording
    await updateSessionState({
      sessionId: result.sessionId,
      status: 'recording',
      startTime: Date.now(),
      stepCount: 0,
      currentTabId: currentTabId
    });

    // Send START_CAPTURE message to content script after a delay
    // This ensures the message is sent after popup closes
    setTimeout(async () => {
      try {
        console.log('[Background] Sending START_CAPTURE to tab', currentTabId);
        const captureResponse = await chrome.tabs.sendMessage(currentTabId, {
          type: 'START_CAPTURE'
        });
        console.log('[Background] START_CAPTURE sent successfully:', captureResponse);
      } catch (error) {
        console.error('[Background] Failed to send START_CAPTURE:', error);
      }
    }, 3100); // Send after countdown completes (3s) + small buffer

    return { success: true, sessionId: result.sessionId };
  } catch (error) {
    // Revert to idle on error
    await updateSessionState({ status: 'idle' });
    throw error;
  }
}

/**
 * Start recording session from dashboard
 * Requirements: 6.5 - Dashboard triggers Extension to start recording
 * 
 * This function handles recording initiation from the web dashboard.
 * It opens a new tab and starts recording in that tab.
 */
async function handleStartRecordingFromDashboard() {
  try {
    // Check if already recording
    if (recordingSession.status !== 'idle') {
      throw new Error('Recording already in progress');
    }

    // Create a new tab for recording
    const newTab = await chrome.tabs.create({
      url: 'about:blank',
      active: true
    });

    // Wait for tab to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update state to initializing
    await updateSessionState({
      status: 'initializing',
      currentTabId: newTab.id
    });

    // Call backend to create session
    const response = await fetch('http://localhost:5001/api/recording/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Failed to start recording session');
    }

    const result = await response.json();

    // Show countdown in the new tab
    try {
      await chrome.tabs.sendMessage(newTab.id, { type: 'SHOW_COUNTDOWN', seconds: 3 });
    } catch (error) {
      console.warn('Could not show countdown in new tab:', error);
    }

    // Update session state to recording
    await updateSessionState({
      sessionId: result.sessionId,
      status: 'recording',
      startTime: Date.now(),
      stepCount: 0,
      currentTabId: newTab.id
    });

    return { success: true, sessionId: result.sessionId, tabId: newTab.id };
  } catch (error) {
    // Revert to idle on error
    await updateSessionState({ status: 'idle', currentTabId: null });
    throw error;
  }
}

/**
 * Pause recording session
 * Requirements: 4.1, 21.1, 21.2
 * 
 * This function implements the pause-before-UI invariant:
 * 1. Update state to paused (this stops event capture)
 * 2. Wait for state update to complete
 * 3. Then notify content script to show UI
 */
async function handlePauseRecording() {
  try {
    // First, update state to paused
    // This ensures recording is paused before any UI is injected
    await updateSessionState({ status: 'paused' });

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Now that state is paused, tell content script to freeze page and show control bar
    await chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_PAGE' });
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROL_BAR' });

    return { success: true };
  } catch (error) {
    console.error('Failed to pause recording:', error);
    throw error;
  }
}

/**
 * Resume recording session
 * Requirements: 4.5, 4.6, 21.3, 21.4
 * 
 * This function implements the UI-removal-before-resume invariant:
 * 1. Hide control bar and unfreeze page
 * 2. Show countdown
 * 3. Update state to recording (this resumes event capture)
 * 4. Badge is updated after state change
 */
async function handleResumeRecording() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // First, remove all UI elements before resuming
    await chrome.tabs.sendMessage(tab.id, { type: 'HIDE_CONTROL_BAR' });
    await chrome.tabs.sendMessage(tab.id, { type: 'UNFREEZE_PAGE' });

    // Show countdown before resuming
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_COUNTDOWN', seconds: 3 });

    // Now that UI is removed and countdown is complete, resume recording
    await updateSessionState({ status: 'recording' });

    return { success: true };
  } catch (error) {
    console.error('Failed to resume recording:', error);
    throw error;
  }
}

/**
 * Stop recording session
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * This function implements the recording completion flow:
 * 1. Flush any remaining uploads in the queue
 * 2. POST to /api/recording/stop with session_id (returns immediately)
 * 3. Open new tab with editor URL (shows loading state)
 * 4. Clear badge and remove all UI elements from recording tab
 * 5. Handle backend processing failures with error notification
 */
async function handleStopRecording() {
  const currentTabId = recordingSession.currentTabId;
  const currentSessionId = recordingSession.sessionId;

  try {
    console.log('[Background] Starting stop recording process...');
    console.log('[Background] Current session:', recordingSession);
    console.log('[Background] Upload queue length:', uploadQueue.length);
    console.log('[Background] Active upload promise:', !!activeUploadPromise);

    // Start flushing upload queue concurrently (don't await yet)
    console.log('[Background] Flushing upload queue (concurrently)...');
    const flushPromise = flushUploadQueue();

    // Call backend to finalize session
    // Requirement 5.2: POST to /api/recording/stop with session_id
    // Backend now returns immediately with status: "processing"
    console.log('[Background] Calling /api/recording/stop with sessionId:', currentSessionId);
    const response = await fetch('http://localhost:5001/api/recording/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId })
    });

    console.log('[Background] Stop recording response status:', response.status);

    if (!response.ok) {
      // Requirement 5.5: Handle backend processing failures
      const errorText = await response.text();
      console.error('[Background] Backend error:', errorText);
      throw new Error(`Backend processing failed: ${errorText || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Background] Stop recording result:', result);

    // Update state to stopped
    await updateSessionState({
      status: 'stopped',
      projectId: result.projectId
    });

    // Requirement 5.3: Open new tab with chrome.tabs.create to editor URL
    // The editor page will show loading state and poll for completion
    console.log('[Background] Opening editor in new tab:', result.redirectUrl);
    const editorUrl = `${result.redirectUrl}?sessionId=${currentSessionId}`;
    const newTab = await chrome.tabs.create({
      url: editorUrl,
      active: true
    });
    console.log('[Background] New tab created:', newTab.id);

    // Requirement 5.4: Clear badge and remove all UI elements from recording tab
    // Clear badge (this happens automatically when state transitions to idle)
    await updateSessionState({
      sessionId: null,
      projectId: null,
      status: 'idle',
      startTime: null,
      stepCount: 0,
      currentTabId: null
    });

    console.log('[Background] State reset to idle');

    // Remove all UI elements from the recording tab
    if (currentTabId) {
      try {
        console.log('[Background] Removing UI from recording tab:', currentTabId);
        await chrome.tabs.sendMessage(currentTabId, { type: 'REMOVE_ALL_UI' });
      } catch (error) {
        // Tab might be closed or navigated away, ignore error
        console.warn('Could not remove UI from recording tab:', error);
      }
    }

    console.log('[Background] Stop recording completed successfully');

    // Wait for uploads to complete before finishing the background task
    // This ensures data integrity but doesn't block the tab opening
    console.log('[Background] Waiting for background uploads to complete...');
    try {
      await flushPromise;
      console.log('[Background] Background uploads completed');
    } catch (e) {
      console.warn('[Background] Background uploads finished with warning:', e);
    } finally {
      // Signal backend that uploads are done (2-phase stop)
      // MUST happen even if uploads failed/timed out, otherwise backend hangs in 'uploading'
      try {
        console.log('[Background] Calling /api/recording/finish...');
        await fetch('http://localhost:5001/api/recording/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentSessionId })
        });
        console.log('[Background] Recording finished successfully');
      } catch (finishError) {
        console.error('[Background] Failed to call finish endpoint:', finishError);
      }
    }

    return { success: true, projectId: result.projectId };
  } catch (error) {
    // Requirement 5.5: Handle backend processing failures with error notification
    console.error('[Background] Failed to stop recording:', error);

    // Display error notification to user
    if (currentTabId) {
      try {
        await chrome.tabs.sendMessage(currentTabId, {
          type: 'SHOW_ERROR',
          message: 'Processing failed, please try again'
        });
      } catch (notificationError) {
        console.error('Could not show error notification:', notificationError);
      }
    }

    // Revert to paused state so user can retry
    await updateSessionState({ status: 'paused' });

    throw error;
  }
}

/**
 * Upload Manager
 * Handles step uploads with retry logic, exponential backoff, and batching
 * Requirements: 3.1, 3.2, 3.3, 3.4, 25.2
 */

// Upload queue for batching
let uploadQueue = [];
let batchTimer = null;
let activeUploadPromise = null; // Track ongoing upload batch
const BATCH_SIZE = 5;
const BATCH_TIMEOUT_MS = 2000; // 2 seconds - reduced for faster uploads

// IndexedDB setup for failed uploads
const DB_NAME = 'AcroRecorder';
const DB_VERSION = 1;
const STORE_NAME = 'failedUploads';

/**
 * Initialize IndexedDB for storing failed uploads
 */
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('sessionId', 'sessionId', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Store failed upload in IndexedDB
 */
async function storeFailedUpload(stepData) {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const failedUpload = {
      ...stepData,
      timestamp: Date.now(),
      retryCount: 0
    };

    await new Promise((resolve, reject) => {
      const request = store.add(failedUpload);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('Stored failed upload in IndexedDB:', failedUpload);
  } catch (error) {
    console.error('Failed to store upload in IndexedDB:', error);
  }
}

/**
 * Upload step with exponential backoff retry logic
 * Requirements: 3.3
 * @param {Object} stepData - Step data to upload
 * @param {number} retryCount - Current retry attempt (0-based)
 * @returns {Promise<Object>} - Upload result
 */
async function uploadStepWithRetry(stepData, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

  try {
    // Log what we're sending (without the large base64 data)
    const debugData = { ...stepData };
    if (debugData.screenshotBase64) {
      debugData.screenshotBase64 = `<base64 data ${debugData.screenshotBase64.length} chars>`;
    }
    console.log('[Background] Uploading step data:', debugData);

    const response = await fetch('http://localhost:5001/api/recording/chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stepData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[Background] Upload successful:', result);
    return { success: true, stepId: result.stepId };

  } catch (error) {
    console.error(`Upload attempt ${retryCount + 1} failed:`, error);

    if (retryCount < MAX_RETRIES) {
      // Wait with exponential backoff
      const delay = RETRY_DELAYS[retryCount];
      console.log(`Retrying upload in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry
      return uploadStepWithRetry(stepData, retryCount + 1);
    } else {
      // All retries failed, store in IndexedDB
      console.error('All upload retries failed, storing in IndexedDB');
      await storeFailedUpload(stepData);

      // Notify user of upload failure
      console.warn('Upload failed after 3 retries. Data stored locally for later retry.');

      throw new Error('Upload failed after maximum retries');
    }
  }
}

/**
 * Add step to upload queue for batching
 * Requirements: 25.2
 */
function queueStepForUpload(stepData) {
  uploadQueue.push(stepData);

  // Process batch if we've reached batch size
  if (uploadQueue.length >= BATCH_SIZE) {
    processBatch();
  } else {
    // Reset batch timer
    if (batchTimer) {
      clearTimeout(batchTimer);
    }

    // Set timer to process batch after timeout
    batchTimer = setTimeout(() => {
      processBatch();
    }, BATCH_TIMEOUT_MS);
  }
}

/**
 * Process batch of queued uploads
 * Requirements: 25.2
 */
async function processBatch() {
  if (uploadQueue.length === 0) {
    return;
  }

  // Clear batch timer
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  // Get current batch
  const batch = [...uploadQueue];
  uploadQueue = [];

  console.log(`Processing batch of ${batch.length} steps`);

  // Create a promise for this batch to track completion
  const batchPromise = (async () => {
    // Upload steps in parallel
    const uploadPromises = batch.map(async (stepData) => {
      try {
        await uploadStepWithRetry(stepData);
        await updateSessionState({ stepCount: recordingSession.stepCount + 1 });
      } catch (error) {
        console.error('Failed to upload step in batch:', error);
      }
    });

    await Promise.all(uploadPromises);
  })();

  // Update active upload promise
  if (activeUploadPromise) {
    // Chain with existing promise
    activeUploadPromise = activeUploadPromise.then(() => batchPromise);
  } else {
    activeUploadPromise = batchPromise;
  }

  // When done, check if we are the last active promise and clear it if so
  // Note: simpler approach is just to let it chain, 
  // but clearing helps GC and prevents indefinite growth if we wanted to be stricter
  await batchPromise;
}

/**
 * Upload step data to backend (legacy handler for direct uploads)
 * Now uses the upload manager with batching
 */
async function handleUploadStep(stepData) {
  try {
    // Add to batch queue instead of uploading immediately
    queueStepForUpload(stepData);

    return { success: true, queued: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Flush any remaining uploads in the queue and wait for ALL active uploads
 * Should be called when recording stops
 */
async function flushUploadQueue() {
  console.log('Flushing upload queue...');

  // 1. Process anything currently in the queue
  if (uploadQueue.length > 0) {
    console.log(`Processing remaining ${uploadQueue.length} items in queue`);
    await processBatch();
  }

  // 2. Wait for all active uploads to complete with timeout
  if (activeUploadPromise) {
    console.log('Waiting for active uploads to complete (max 10s)...');
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload sync timeout')), 10000);
      });

      // Race the active uploads against the timeout
      await Promise.race([activeUploadPromise, timeoutPromise]);
      console.log('All active uploads completed');
    } catch (error) {
      if (error.message === 'Upload sync timeout') {
        console.warn('Upload sync timed out after 10s, proceeding with stop anyway');
      } else {
        console.error('Error waiting for active uploads:', error);
      }
    }
    activeUploadPromise = null;
  }
}

/**
 * Capture screenshot of visible tab
 * Note: Image compression is not available in Service Workers (no Canvas API)
 * Screenshots are captured at full quality
 * 
 * IMPORTANT: chrome.tabs.captureVisibleTab can only capture the currently visible tab.
 * If the recording tab is not visible (user switched tabs), this will fail.
 */
async function captureScreenshot(tabId) {
  try {
    console.log('[Background] Capturing screenshot for tab:', tabId);

    // Check if the requested tab is the currently active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab) {
      throw new Error('No active tab found');
    }

    if (activeTab.id !== tabId) {
      console.warn('[Background] Recording tab is not visible. Active tab:', activeTab.id, 'Recording tab:', tabId);
      throw new Error('Recording tab is not visible. Please keep the recording tab active.');
    }

    // Get the window ID of the tab
    const tab = await chrome.tabs.get(tabId);
    const windowId = tab.windowId;

    // Capture screenshot at full quality from the specific window
    const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png',
      quality: 100
    });

    console.log('[Background] Screenshot captured successfully, size:', screenshot.length);
    return screenshot;
  } catch (error) {
    console.error('[Background] Failed to capture screenshot:', error);
    console.error('[Background] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Set badge to idle state (clear badge)
 * Requirements: 19.1
 */
async function setBadgeIdle() {
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#000000' });
}

/**
 * Set badge to initializing state (yellow background with "...")
 * Requirements: 19.2
 */
async function setBadgeInitializing() {
  await chrome.action.setBadgeText({ text: '...' });
  await chrome.action.setBadgeBackgroundColor({ color: '#FFAA00' });
}

/**
 * Set badge to recording state (red background with "REC" or timer)
 * Requirements: 19.3
 */
async function setBadgeRecording() {
  await chrome.action.setBadgeText({ text: 'REC' });
  await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
}

/**
 * Set badge to paused state (gray background with "||")
 * Requirements: 19.4
 */
async function setBadgePaused() {
  await chrome.action.setBadgeText({ text: '||' });
  await chrome.action.setBadgeBackgroundColor({ color: '#808080' });
}

/**
 * Update extension badge based on recording state
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
async function updateBadge() {
  switch (recordingSession.status) {
    case 'idle':
    case 'stopped':
      await setBadgeIdle();
      break;

    case 'initializing':
      await setBadgeInitializing();
      break;

    case 'recording':
      await setBadgeRecording();
      break;

    case 'paused':
      await setBadgePaused();
      break;
  }
}

/**
 * Save session state to storage
 */
async function saveSessionState() {
  await chrome.storage.local.set({ recordingSession });
}

/**
 * Restore session state from storage
 */
async function restoreSessionState() {
  try {
    const result = await chrome.storage.local.get('recordingSession');
    if (result.recordingSession) {
      recordingSession = result.recordingSession;
      console.log('Restored session state:', recordingSession);

      // Update badge to reflect restored state
      await updateBadge();

      // If session was in recording or paused state, log warning
      if (recordingSession.status === 'recording' || recordingSession.status === 'paused') {
        console.warn('Extension reloaded during active recording session. State preserved.');
      }
    }
  } catch (error) {
    console.error('Failed to restore session state:', error);
    // Initialize with default state on error
    recordingSession = {
      sessionId: null,
      projectId: null,
      status: 'idle',
      startTime: null,
      stepCount: 0,
      currentTabId: null
    };
    await saveSessionState();
  }
}

// Restore state on service worker startup
restoreSessionState();
