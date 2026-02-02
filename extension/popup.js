/**
 * Acro Demo Recorder - Popup Script
 * Handles popup UI interactions and recording controls
 */

// DOM elements
const statusEl = document.getElementById('status');
const idleView = document.getElementById('idle-view');
const recordingView = document.getElementById('recording-view');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const microphoneToggle = document.getElementById('microphone-toggle');
const recordingRange = document.getElementById('recording-range');
const sessionIdEl = document.getElementById('session-id');
const stepCountEl = document.getElementById('step-count');
const durationEl = document.getElementById('duration');
const errorMessageEl = document.getElementById('error-message');

// State
let durationInterval = null;

// Initialize popup
async function init() {
  // Get current session state
  const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
  const session = response.session;
  
  updateUI(session);
  
  // Add event listeners
  startBtn.addEventListener('click', handleStartRecording);
  pauseBtn.addEventListener('click', handlePauseRecording);
  stopBtn.addEventListener('click', handleStopRecording);
}

/**
 * Update UI based on session state
 */
function updateUI(session) {
  switch (session.status) {
    case 'idle':
    case 'stopped':
      statusEl.textContent = 'Ready to record';
      statusEl.className = 'status idle';
      idleView.style.display = 'block';
      recordingView.style.display = 'none';
      stopDurationTimer();
      break;
      
    case 'initializing':
      statusEl.textContent = 'Initializing...';
      statusEl.className = 'status idle';
      startBtn.disabled = true;
      break;
      
    case 'recording':
      statusEl.textContent = '🔴 Recording';
      statusEl.className = 'status recording';
      idleView.style.display = 'none';
      recordingView.style.display = 'block';
      pauseBtn.textContent = 'Pause Recording';
      updateRecordingInfo(session);
      startDurationTimer(session.startTime);
      break;
      
    case 'paused':
      statusEl.textContent = '⏸️ Paused';
      statusEl.className = 'status paused';
      pauseBtn.textContent = 'Resume Recording';
      updateRecordingInfo(session);
      stopDurationTimer();
      break;
  }
}

/**
 * Update recording info display
 */
function updateRecordingInfo(session) {
  sessionIdEl.textContent = session.sessionId ? session.sessionId.substring(0, 8) + '...' : '-';
  stepCountEl.textContent = session.stepCount || 0;
}

/**
 * Start duration timer
 */
function startDurationTimer(startTime) {
  stopDurationTimer();
  
  function updateDuration() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    durationEl.textContent = `${minutes}:${seconds}`;
  }
  
  updateDuration();
  durationInterval = setInterval(updateDuration, 1000);
}

/**
 * Stop duration timer
 */
function stopDurationTimer() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  durationEl.textContent = '00:00';
}

/**
 * Handle start recording button click
 */
async function handleStartRecording() {
  try {
    startBtn.disabled = true;
    hideError();
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Start recording via background script
    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      data: {
        microphoneEnabled: microphoneToggle.checked,
        recordingRange: recordingRange.value
      }
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    console.log('[Popup] Recording started, session ID:', response.sessionId);
    
    // Show countdown in content script
    try {
      const countdownResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_COUNTDOWN',
        seconds: 3
      });
      console.log('[Popup] Countdown message sent, response:', countdownResponse);
    } catch (error) {
      console.error('[Popup] Failed to send countdown:', error);
      throw new Error('无法与页面通信，请刷新页面后重试');
    }
    
    // Note: START_CAPTURE will be sent by background script after countdown
    console.log('[Popup] Countdown started, background will send START_CAPTURE after 3.5s');
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 500);
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    showError(error.message);
    startBtn.disabled = false;
  }
}

/**
 * Handle pause recording button click
 */
async function handlePauseRecording() {
  try {
    // Get current session state
    const stateResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
    const session = stateResponse.session;
    
    if (session.status === 'recording') {
      // Pause recording
      await chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
      
      // Get current tab and show control bar
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROL_BAR' });
      await chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_PAGE' });
      
    } else if (session.status === 'paused') {
      // Resume recording
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'HIDE_CONTROL_BAR' });
      await chrome.tabs.sendMessage(tab.id, { type: 'UNFREEZE_PAGE' });
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_COUNTDOWN', seconds: 3 });
      
      await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
    }
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Failed to pause/resume recording:', error);
    showError(error.message);
  }
}

/**
 * Handle stop recording button click
 */
async function handleStopRecording() {
  try {
    stopBtn.disabled = true;
    hideError();
    
    // Stop recording
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Failed to stop recording:', error);
    showError(error.message);
    stopBtn.disabled = false;
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
  errorMessageEl.style.display = 'none';
}

// Initialize popup when DOM is ready
init();
