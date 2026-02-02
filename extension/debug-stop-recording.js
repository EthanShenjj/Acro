/**
 * Debug script for testing stop recording functionality
 * Open browser console and paste this script to test
 */

console.log('=== Stop Recording Debug ===');

// Check if control bar exists
const controlBar = document.getElementById('acro-control-bar');
console.log('Control bar exists:', !!controlBar);

if (controlBar) {
  const shadowRoot = controlBar.shadowRoot;
  console.log('Shadow root exists:', !!shadowRoot);
  
  if (shadowRoot) {
    const doneBtn = shadowRoot.querySelector('.done-btn');
    const resumeBtn = shadowRoot.querySelector('.resume-btn');
    
    console.log('Done button exists:', !!doneBtn);
    console.log('Resume button exists:', !!resumeBtn);
    
    if (doneBtn) {
      console.log('Done button text:', doneBtn.textContent);
      console.log('Done button listeners:', getEventListeners(doneBtn));
      
      // Try clicking programmatically
      console.log('Attempting to click Done button...');
      doneBtn.click();
    }
  }
}

// Check recording state
chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }, (response) => {
  console.log('Current session state:', response);
});

// Test stop recording message directly
console.log('Testing STOP_RECORDING message...');
chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
  console.log('Stop recording response:', response);
  if (chrome.runtime.lastError) {
    console.error('Runtime error:', chrome.runtime.lastError);
  }
});
