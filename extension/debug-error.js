/**
 * Debug script to help identify the null[2] error
 * 
 * This error typically occurs when:
 * 1. A regex match returns null and code tries to access match[2]
 * 2. An array is null and code tries to access array[2]
 * 3. A function returns null instead of an expected array
 * 
 * To use this script:
 * 1. Open Chrome DevTools (F12)
 * 2. Go to the Console tab
 * 3. Look for the full error stack trace
 * 4. The stack trace will show the exact line number in content.js
 */

console.log('=== Acro Extension Debug ===');
console.log('Looking for null[2] error...');

// Check if content script is loaded
if (typeof isRecording !== 'undefined') {
  console.log('✓ Content script loaded');
  console.log('  isRecording:', isRecording);
  console.log('  isPaused:', isPaused);
} else {
  console.log('✗ Content script not loaded or variables not accessible');
}

// Check for common error patterns
console.log('\nChecking for potential error sources:');

// Test 1: Check if any regex patterns might fail
console.log('1. Testing regex patterns...');
try {
  const testUrl = window.location.href;
  console.log('   Current URL:', testUrl);
  
  // Common regex patterns that might be used
  const patterns = [
    /^https?:\/\/([^\/]+)/,
    /\/([^\/]+)\/([^\/]+)\/([^\/]+)/,
    /\?([^#]+)/
  ];
  
  patterns.forEach((pattern, index) => {
    const match = testUrl.match(pattern);
    console.log(`   Pattern ${index}:`, match ? `Matched (${match.length} groups)` : 'No match (null)');
  });
} catch (error) {
  console.error('   Error testing regex:', error);
}

// Test 2: Check Chrome extension APIs
console.log('\n2. Testing Chrome APIs...');
try {
  console.log('   chrome.runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');
  console.log('   chrome.storage available:', typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined');
} catch (error) {
  console.error('   Error testing Chrome APIs:', error);
}

// Test 3: Check for Shadow DOM issues
console.log('\n3. Checking Shadow DOM...');
try {
  const shadowContainers = document.querySelectorAll('[id^="acro-"]');
  console.log('   Acro elements found:', shadowContainers.length);
  shadowContainers.forEach(el => {
    console.log('   -', el.id, 'shadowRoot:', el.shadowRoot ? 'exists' : 'none');
  });
} catch (error) {
  console.error('   Error checking Shadow DOM:', error);
}

console.log('\n=== Debug Complete ===');
console.log('If you see the error, please:');
console.log('1. Copy the full error message including stack trace');
console.log('2. Note which line number in content.js is causing the error');
console.log('3. Check if the error occurs during:');
console.log('   - Page load');
console.log('   - Starting recording');
console.log('   - Clicking on the page');
console.log('   - Pausing/resuming');
