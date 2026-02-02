/**
 * Debug script to test chunk upload endpoint
 * Run this in the browser console to test the /api/recording/chunk endpoint
 */

async function testChunkUpload() {
  console.log('=== Testing Chunk Upload ===');
  
  // Step 1: Start a recording session
  console.log('\n1. Starting recording session...');
  const startResponse = await fetch('http://localhost:5001/api/recording/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  if (!startResponse.ok) {
    console.error('Failed to start session:', await startResponse.text());
    return;
  }
  
  const startResult = await startResponse.json();
  console.log('Session started:', startResult);
  const sessionId = startResult.sessionId;
  
  // Step 2: Create a test screenshot (small red square)
  console.log('\n2. Creating test screenshot...');
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  const screenshotBase64 = canvas.toDataURL('image/png');
  console.log('Screenshot created, length:', screenshotBase64.length);
  
  // Step 3: Prepare step data
  console.log('\n3. Preparing step data...');
  const stepData = {
    sessionId: sessionId,
    orderIndex: 0,
    actionType: 'click',
    targetText: 'Test Button',
    posX: 100,
    posY: 200,
    viewportWidth: 1920,
    viewportHeight: 1080,
    screenshotBase64: screenshotBase64
  };
  
  console.log('Step data (without base64):', {
    ...stepData,
    screenshotBase64: `<${screenshotBase64.length} chars>`
  });
  
  // Step 4: Upload chunk
  console.log('\n4. Uploading chunk...');
  const chunkResponse = await fetch('http://localhost:5001/api/recording/chunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stepData)
  });
  
  console.log('Response status:', chunkResponse.status);
  
  if (!chunkResponse.ok) {
    const errorText = await chunkResponse.text();
    console.error('Upload failed:', errorText);
    
    // Try to parse as JSON
    try {
      const errorJson = JSON.parse(errorText);
      console.error('Error details:', errorJson);
    } catch (e) {
      console.error('Raw error:', errorText);
    }
    return;
  }
  
  const chunkResult = await chunkResponse.json();
  console.log('Upload successful:', chunkResult);
  
  // Step 5: Stop recording
  console.log('\n5. Stopping recording...');
  const stopResponse = await fetch('http://localhost:5001/api/recording/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionId })
  });
  
  if (!stopResponse.ok) {
    console.error('Failed to stop session:', await stopResponse.text());
    return;
  }
  
  const stopResult = await stopResponse.json();
  console.log('Session stopped:', stopResult);
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testChunkUpload().catch(error => {
  console.error('Test failed:', error);
});
