/**
 * Test screenshot capture functionality
 * Run this in the browser console on the extension background page
 */

async function testScreenshotCapture() {
  console.log('=== Testing Screenshot Capture ===');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab:', tab);
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    // Try to capture screenshot
    console.log('Attempting to capture screenshot...');
    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    
    console.log('Screenshot captured successfully!');
    console.log('Screenshot data URL length:', screenshot.length);
    console.log('Screenshot preview (first 100 chars):', screenshot.substring(0, 100));
    
    return screenshot;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testScreenshotCapture();
