/**
 * Acro Demo Recorder - Content Script
 * Handles DOM manipulation, event capture, and UI injection
 */

// Content script state
let isRecording = false;
let isPaused = false;
let shadowRoot = null;

// Initialize content script
console.log('[Acro] Content script loaded at:', new Date().toISOString());
console.log('[Acro] Initial state - isRecording:', isRecording, 'isPaused:', isPaused);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Acro] Content script received message:', message.type);
  
  switch (message.type) {
    case 'SHOW_COUNTDOWN':
      console.log('[Acro] Showing countdown for', message.seconds, 'seconds');
      showCountdown(message.seconds || 3)
        .then(() => {
          console.log('[Acro] Countdown completed');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('[Acro] Countdown error:', error);
          sendResponse({ error: error.message });
        });
      return true;
      
    case 'START_CAPTURE':
      console.log('[Acro] Received START_CAPTURE message');
      try {
        startCapture();
        console.log('[Acro] startCapture() called successfully');
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Acro] startCapture() failed:', error);
        sendResponse({ error: error.message });
      }
      break;
      
    case 'SHOW_CONTROL_BAR':
      showControlBar();
      freezePage();
      sendResponse({ success: true });
      break;
      
    case 'HIDE_CONTROL_BAR':
      hideControlBar();
      sendResponse({ success: true });
      break;
      
    case 'FREEZE_PAGE':
      freezePage();
      sendResponse({ success: true });
      break;
      
    case 'UNFREEZE_PAGE':
      unfreezePage();
      sendResponse({ success: true });
      break;
      
    case 'REMOVE_ALL_UI':
      removeAllUI();
      sendResponse({ success: true });
      break;
      
    case 'SHOW_ERROR':
      showErrorNotification(message.message || 'An error occurred')
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Show countdown overlay
 */
async function showCountdown(seconds) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'acro-countdown-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const countdownText = document.createElement('div');
    countdownText.style.cssText = `
      font-size: 120px;
      font-weight: bold;
      color: white;
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    `;
    countdownText.textContent = seconds;
    
    overlay.appendChild(countdownText);
    document.body.appendChild(overlay);
    
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownText.textContent = remaining;
      } else {
        clearInterval(interval);
        overlay.remove();
        resolve();
      }
    }, 1000);
  });
}

/**
 * Start capturing user interactions
 */
function startCapture() {
  console.log('[Acro] Starting capture, isRecording:', isRecording, 'isPaused:', isPaused);
  isRecording = true;
  isPaused = false;
  
  // Add mousedown event listener for clicks
  document.addEventListener('mousedown', handleMouseDown, true);
  
  // Add scroll event listener for scrolling
  document.addEventListener('scroll', handleScroll, true);
  
  console.log('[Acro] Capture started, event listeners added (click + scroll)');
}

/**
 * Handle mouse down events
 */
async function handleMouseDown(event) {
  console.log('[Acro] Mouse down detected, isRecording:', isRecording, 'isPaused:', isPaused);
  
  if (!isRecording || isPaused) {
    console.log('[Acro] Ignoring click - not recording or paused');
    return;
  }
  
  console.log('[Acro] Processing click event');
  
  try {
    // Get click coordinates and target info
    const posX = event.clientX;
    const posY = event.clientY;
    const targetText = event.target.innerText || event.target.value || '';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Show click ripple
    showClickRipple(posX, posY);
    
    // Capture screenshot
    const screenshot = await captureScreenshot();
    
    // Get session state
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
    const sessionId = response.session.sessionId;
    const orderIndex = response.session.stepCount + 1;
    
    // Prepare step data
    const stepData = {
      sessionId,
      orderIndex,
      actionType: 'click',
      targetText: targetText.substring(0, 500), // Limit text length
      posX,
      posY,
      viewportWidth,
      viewportHeight,
      screenshotBase64: screenshot
    };
    
    // Upload step to backend
    chrome.runtime.sendMessage({
      type: 'UPLOAD_STEP',
      data: stepData
    });
    
  } catch (error) {
    console.error('Failed to capture step:', error);
  }
}

/**
 * Handle scroll events
 */
let scrollTimeout = null;
let lastScrollY = window.scrollY;

async function handleScroll(event) {
  console.log('[Acro] Scroll detected, isRecording:', isRecording, 'isPaused:', isPaused);
  
  if (!isRecording || isPaused) {
    console.log('[Acro] Ignoring scroll - not recording or paused');
    return;
  }
  
  // Debounce scroll events - only capture after scrolling stops for 500ms
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(async () => {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;
    
    // Only capture if scroll distance is significant (> 50px)
    if (Math.abs(scrollDelta) < 50) {
      return;
    }
    
    console.log('[Acro] Processing scroll event, delta:', scrollDelta);
    lastScrollY = currentScrollY;
    
    try {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Show scroll indicator
      showScrollIndicator(scrollDelta > 0 ? 'down' : 'up');
      
      // Capture screenshot
      const screenshot = await captureScreenshot();
      
      // Get session state
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
      const sessionId = response.session.sessionId;
      const orderIndex = response.session.stepCount + 1;
      
      // Prepare step data
      const stepData = {
        sessionId,
        orderIndex,
        actionType: 'scroll',
        targetText: `Scrolled ${scrollDelta > 0 ? 'down' : 'up'} ${Math.abs(scrollDelta)}px`,
        posX: viewportWidth / 2,  // Center of viewport
        posY: currentScrollY,     // Current scroll position
        viewportWidth,
        viewportHeight,
        screenshotBase64: screenshot
      };
      
      // Upload step to backend
      chrome.runtime.sendMessage({
        type: 'UPLOAD_STEP',
        data: stepData
      });
      
    } catch (error) {
      console.error('Failed to capture scroll step:', error);
    }
  }, 500); // Wait 500ms after scrolling stops
}

/**
 * Capture screenshot of visible tab
 */
async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    console.log('[Acro] Requesting screenshot from background...');
    chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        console.error('[Acro] Screenshot request error:', errorMsg);
        
        // Check if it's a tab visibility issue
        if (errorMsg.includes('visible') || errorMsg.includes('active')) {
          reject(new Error('Recording tab must remain visible. Please do not switch tabs during recording.'));
        } else {
          reject(new Error(errorMsg));
        }
        return;
      }
      
      if (response && response.screenshot) {
        console.log('[Acro] Screenshot received, size:', response.screenshot.length);
        resolve(response.screenshot);
      } else if (response && response.error) {
        console.error('[Acro] Screenshot error from background:', response.error);
        
        // Provide more helpful error messages
        if (response.error.includes('visible') || response.error.includes('active')) {
          reject(new Error('Recording tab must remain visible. Please do not switch tabs during recording.'));
        } else {
          reject(new Error(response.error));
        }
      } else {
        console.error('[Acro] No screenshot in response:', response);
        reject(new Error('Failed to capture screenshot - no response from background'));
      }
    });
  });
}

/**
 * Show click ripple animation
 */
function showClickRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'acro-click-ripple';
  ripple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 20px;
    height: 20px;
    border: 3px solid #FF0000;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 2147483646;
    animation: acro-ripple-expand 0.5s ease-out;
  `;
  
  // Add animation keyframes if not already added
  if (!document.getElementById('acro-ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'acro-ripple-styles';
    style.textContent = `
      @keyframes acro-ripple-expand {
        0% {
          width: 20px;
          height: 20px;
          opacity: 1;
        }
        100% {
          width: 60px;
          height: 60px;
          opacity: 0;
        }
      }
      @keyframes acro-scroll-fade {
        0% {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(ripple);
  
  // Remove ripple after animation
  setTimeout(() => ripple.remove(), 500);
}

/**
 * Show scroll indicator animation
 */
function showScrollIndicator(direction) {
  const indicator = document.createElement('div');
  indicator.className = 'acro-scroll-indicator';
  indicator.style.cssText = `
    position: fixed;
    left: 50%;
    top: ${direction === 'down' ? '80%' : '20%'};
    transform: translateX(-50%);
    padding: 8px 16px;
    background: rgba(33, 150, 243, 0.9);
    color: white;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    pointer-events: none;
    z-index: 2147483646;
    animation: acro-scroll-fade 1s ease-out;
  `;
  indicator.textContent = direction === 'down' ? '↓ Scroll Down' : '↑ Scroll Up';
  
  document.body.appendChild(indicator);
  
  // Remove indicator after animation
  setTimeout(() => indicator.remove(), 1000);
}

/**
 * Show control bar using Shadow DOM
 * Requirements: 4.2, 20.1, 20.2, 20.3
 */
function showControlBar() {
  if (shadowRoot) return; // Already showing
  
  const container = document.createElement('div');
  container.id = 'acro-control-bar-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
  `;
  
  shadowRoot = container.attachShadow({ mode: 'closed' });
  
  shadowRoot.innerHTML = `
    <style>
      .control-bar {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .timer {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        min-width: 60px;
      }
      
      button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .resume-btn {
        background: #4CAF50;
        color: white;
      }
      
      .resume-btn:hover {
        background: #45a049;
      }
      
      .done-btn {
        background: #2196F3;
        color: white;
      }
      
      .done-btn:hover {
        background: #0b7dda;
      }
    </style>
    
    <div class="control-bar">
      <span class="timer">00:00</span>
      <button class="resume-btn">▶️ Continue</button>
      <button class="done-btn">✅ Done</button>
    </div>
  `;
  
  document.body.appendChild(container);
  
  // Add event listeners
  const resumeBtn = shadowRoot.querySelector('.resume-btn');
  const doneBtn = shadowRoot.querySelector('.done-btn');
  
  resumeBtn.addEventListener('click', handleResume);
  doneBtn.addEventListener('click', handleDone);
  
  isPaused = true;
}

/**
 * Hide control bar
 */
function hideControlBar() {
  const container = document.getElementById('acro-control-bar-container');
  if (container) {
    container.remove();
  }
  shadowRoot = null;
  isPaused = false;
}

/**
 * Freeze page interactions
 */
function freezePage() {
  // Create an overlay to block interactions instead of disabling pointer-events on body
  // This way the control bar (which is in a separate container) won't be affected
  const overlay = document.createElement('div');
  overlay.id = 'acro-freeze-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483646;
    pointer-events: auto;
    background: transparent;
  `;
  document.body.appendChild(overlay);
  
  // Apply grayscale filter to body
  document.body.style.filter = 'grayscale(100%)';
}

/**
 * Unfreeze page interactions
 */
function unfreezePage() {
  // Remove the freeze overlay
  const overlay = document.getElementById('acro-freeze-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Remove grayscale filter
  document.body.style.filter = '';
}

/**
 * Handle resume button click
 * Requirements: 4.5, 4.6, 21.3, 21.4
 * 
 * This implements the UI-removal-before-resume invariant:
 * 1. Hide control bar
 * 2. Unfreeze page
 * 3. Show countdown
 * 4. Resume recording (via background script)
 */
async function handleResume() {
  try {
    // Tell background script to resume (it will coordinate the sequence)
    await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
    
    // The background script will send messages to:
    // 1. Hide control bar
    // 2. Unfreeze page
    // 3. Show countdown
    // 4. Update state to recording
    
  } catch (error) {
    console.error('Failed to resume recording:', error);
  }
}

/**
 * Handle done button click
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
async function handleDone() {
  try {
    // Hide control bar and unfreeze page first
    hideControlBar();
    unfreezePage();
    isRecording = false;
    
    // Remove event listeners
    document.removeEventListener('mousedown', handleMouseDown, true);
    document.removeEventListener('scroll', handleScroll, true);
    
    // Clear scroll timeout if exists
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    
    // Stop recording via background script
    // The background script will handle:
    // - Flushing upload queue
    // - POSTing to /api/recording/stop
    // - Opening editor in new tab
    // - Clearing badge
    // - Removing all UI elements
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    
    if (response && response.error) {
      // Error occurred, show notification
      // The background script will have already shown the error
      // and reverted to paused state
      console.error('Failed to stop recording:', response.error);
    }
  } catch (error) {
    console.error('Failed to handle done:', error);
    // Show error to user
    await showErrorNotification('Failed to complete recording. Please try again.');
  }
}

/**
 * Remove all Extension UI elements
 */
function removeAllUI() {
  // Remove countdown overlay
  const countdown = document.getElementById('acro-countdown-overlay');
  if (countdown) countdown.remove();
  
  // Remove control bar
  hideControlBar();
  
  // Remove ripple styles
  const rippleStyles = document.getElementById('acro-ripple-styles');
  if (rippleStyles) rippleStyles.remove();
  
  // Remove any ripples
  document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
  
  // Remove any scroll indicators
  document.querySelectorAll('.acro-scroll-indicator').forEach(el => el.remove());
  
  // Remove error notifications
  const errorNotification = document.getElementById('acro-error-notification');
  if (errorNotification) errorNotification.remove();
  
  // Clear scroll timeout
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }
  
  // Unfreeze page
  unfreezePage();
}

/**
 * Show error notification to user
 * Requirements: 5.5
 */
async function showErrorNotification(message) {
  return new Promise((resolve) => {
    // Remove any existing error notification
    const existing = document.getElementById('acro-error-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'acro-error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: acro-slide-down 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <span>⚠️</span>
      <span>${message}</span>
      <button style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 8px;
      ">Dismiss</button>
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('acro-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'acro-notification-styles';
      style.textContent = `
        @keyframes acro-slide-down {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Add dismiss button handler
    const dismissBtn = notification.querySelector('button');
    dismissBtn.addEventListener('click', () => {
      notification.remove();
      resolve();
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
        resolve();
      }
    }, 5000);
  });
}
