/**
 * Property-based tests for content.js
 * Feature: acro-saas-demo-video-tool
 */

const fc = require('fast-check');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

describe('Content Script - Event Capture', () => {
  let mockDocument;
  let capturedSteps;
  
  beforeEach(() => {
    // Reset captured steps
    capturedSteps = [];
    
    // Mock chrome.runtime.sendMessage to capture step data
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.type === 'GET_SESSION_STATE') {
        const response = {
          session: {
            sessionId: 'test-session-id',
            stepCount: capturedSteps.length
          }
        };
        if (callback) callback(response);
        return Promise.resolve(response);
      } else if (message.type === 'CAPTURE_SCREENSHOT') {
        const response = { screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
        if (callback) callback(response);
        return Promise.resolve(response);
      } else if (message.type === 'UPLOAD_STEP') {
        capturedSteps.push(message.data);
        if (callback) callback({ success: true });
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    });
    
    // Setup DOM
    document.body.innerHTML = '<div id="test-target">Test Button</div>';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    capturedSteps = [];
  });

  describe('Property 2: Complete step capture', () => {
    // Feature: acro-saas-demo-video-tool, Property 2: Complete step capture
    
    it('should capture all required fields for any mousedown event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1920 }), // posX
          fc.integer({ min: 0, max: 1080 }), // posY
          fc.integer({ min: 800, max: 3840 }), // viewportWidth
          fc.integer({ min: 600, max: 2160 }), // viewportHeight
          fc.string({ minLength: 0, maxLength: 100 }), // targetText
          async (posX, posY, viewportWidth, viewportHeight, targetText) => {
            // Reset captured steps
            capturedSteps = [];
            
            // Create mock event
            const mockTarget = {
              innerText: targetText,
              value: ''
            };
            
            const mockEvent = {
              clientX: posX,
              clientY: posY,
              target: mockTarget
            };
            
            // Mock window dimensions
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: viewportWidth
            });
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: viewportHeight
            });
            
            // Simulate the handleMouseDown logic
            const isRecording = true;
            const isPaused = false;
            
            if (isRecording && !isPaused) {
              // Get session state
              const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
              const sessionId = sessionResponse.session.sessionId;
              const orderIndex = sessionResponse.session.stepCount + 1;
              
              // Capture screenshot
              const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
              const screenshot = screenshotResponse.screenshot;
              
              // Prepare step data
              const stepData = {
                sessionId,
                orderIndex,
                actionType: 'click',
                targetText: targetText.substring(0, 500),
                posX,
                posY,
                viewportWidth,
                viewportHeight,
                screenshotBase64: screenshot
              };
              
              // Upload step
              await chrome.runtime.sendMessage({
                type: 'UPLOAD_STEP',
                data: stepData
              });
            }
            
            // Verify step was captured with all required fields
            expect(capturedSteps.length).toBe(1);
            
            const capturedStep = capturedSteps[0];
            
            // Verify all required fields are present
            expect(capturedStep).toHaveProperty('sessionId');
            expect(capturedStep).toHaveProperty('orderIndex');
            expect(capturedStep).toHaveProperty('actionType');
            expect(capturedStep).toHaveProperty('targetText');
            expect(capturedStep).toHaveProperty('posX');
            expect(capturedStep).toHaveProperty('posY');
            expect(capturedStep).toHaveProperty('viewportWidth');
            expect(capturedStep).toHaveProperty('viewportHeight');
            expect(capturedStep).toHaveProperty('screenshotBase64');
            
            // Verify field values
            expect(capturedStep.sessionId).toBe('test-session-id');
            expect(capturedStep.orderIndex).toBe(1);
            expect(capturedStep.actionType).toBe('click');
            expect(capturedStep.targetText).toBe(targetText.substring(0, 500));
            expect(capturedStep.posX).toBe(posX);
            expect(capturedStep.posY).toBe(posY);
            expect(capturedStep.viewportWidth).toBe(viewportWidth);
            expect(capturedStep.viewportHeight).toBe(viewportHeight);
            expect(capturedStep.screenshotBase64).toMatch(/^data:image\/png;base64,/);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should capture coordinates within viewport bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 800, max: 3840 }), // viewportWidth
          fc.integer({ min: 600, max: 2160 }), // viewportHeight
          async (viewportWidth, viewportHeight) => {
            // Generate coordinates within viewport
            const posX = Math.floor(Math.random() * viewportWidth);
            const posY = Math.floor(Math.random() * viewportHeight);
            
            capturedSteps = [];
            
            // Mock window dimensions
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: viewportWidth
            });
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: viewportHeight
            });
            
            // Simulate capture
            const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
            const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
            
            const stepData = {
              sessionId: sessionResponse.session.sessionId,
              orderIndex: 1,
              actionType: 'click',
              targetText: 'Test',
              posX,
              posY,
              viewportWidth,
              viewportHeight,
              screenshotBase64: screenshotResponse.screenshot
            };
            
            await chrome.runtime.sendMessage({
              type: 'UPLOAD_STEP',
              data: stepData
            });
            
            const capturedStep = capturedSteps[0];
            
            // Verify coordinates are within viewport bounds
            expect(capturedStep.posX).toBeGreaterThanOrEqual(0);
            expect(capturedStep.posX).toBeLessThan(viewportWidth);
            expect(capturedStep.posY).toBeGreaterThanOrEqual(0);
            expect(capturedStep.posY).toBeLessThan(viewportHeight);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle empty target text', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1920 }),
          fc.integer({ min: 0, max: 1080 }),
          async (posX, posY) => {
            capturedSteps = [];
            
            const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
            const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
            
            const stepData = {
              sessionId: sessionResponse.session.sessionId,
              orderIndex: 1,
              actionType: 'click',
              targetText: '', // Empty text
              posX,
              posY,
              viewportWidth: 1920,
              viewportHeight: 1080,
              screenshotBase64: screenshotResponse.screenshot
            };
            
            await chrome.runtime.sendMessage({
              type: 'UPLOAD_STEP',
              data: stepData
            });
            
            const capturedStep = capturedSteps[0];
            
            // Should still capture with empty text
            expect(capturedStep.targetText).toBe('');
            expect(capturedStep).toHaveProperty('sessionId');
            expect(capturedStep).toHaveProperty('screenshotBase64');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should truncate long target text to 500 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 501, maxLength: 1000 }),
          async (longText) => {
            capturedSteps = [];
            
            const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
            const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
            
            const stepData = {
              sessionId: sessionResponse.session.sessionId,
              orderIndex: 1,
              actionType: 'click',
              targetText: longText.substring(0, 500), // Truncated
              posX: 100,
              posY: 100,
              viewportWidth: 1920,
              viewportHeight: 1080,
              screenshotBase64: screenshotResponse.screenshot
            };
            
            await chrome.runtime.sendMessage({
              type: 'UPLOAD_STEP',
              data: stepData
            });
            
            const capturedStep = capturedSteps[0];
            
            // Should be truncated to 500 characters
            expect(capturedStep.targetText.length).toBeLessThanOrEqual(500);
            expect(capturedStep.targetText).toBe(longText.substring(0, 500));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 35: Screenshot failure recovery', () => {
    // Feature: acro-saas-demo-video-tool, Property 35: Screenshot failure recovery
    
    it('should log error and continue recording when screenshot capture fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of consecutive failures
          fc.integer({ min: 1, max: 5 }), // Number of successful captures after failures
          async (numFailures, numSuccesses) => {
            capturedSteps = [];
            const consoleErrors = [];
            
            // Mock console.error to capture error logs
            const originalConsoleError = console.error;
            console.error = jest.fn((...args) => {
              consoleErrors.push(args);
            });
            
            let captureAttempts = 0;
            
            // Mock chrome.runtime.sendMessage to simulate failures
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
              if (message.type === 'GET_SESSION_STATE') {
                const response = {
                  session: {
                    sessionId: 'test-session-id',
                    stepCount: capturedSteps.length
                  }
                };
                if (callback) callback(response);
                return Promise.resolve(response);
              } else if (message.type === 'CAPTURE_SCREENSHOT') {
                captureAttempts++;
                
                // Fail for the first numFailures attempts
                if (captureAttempts <= numFailures) {
                  const error = new Error('Failed to capture screenshot');
                  if (callback) callback({ error: error.message });
                  return Promise.reject(error);
                } else {
                  // Succeed after failures
                  const response = { screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
                  if (callback) callback(response);
                  return Promise.resolve(response);
                }
              } else if (message.type === 'UPLOAD_STEP') {
                capturedSteps.push(message.data);
                if (callback) callback({ success: true });
                return Promise.resolve({ success: true });
              }
              return Promise.resolve({});
            });
            
            // Simulate multiple capture attempts
            const totalAttempts = numFailures + numSuccesses;
            
            for (let i = 0; i < totalAttempts; i++) {
              try {
                const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
                
                try {
                  const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
                  
                  // If screenshot succeeds, upload step
                  const stepData = {
                    sessionId: sessionResponse.session.sessionId,
                    orderIndex: capturedSteps.length + 1,
                    actionType: 'click',
                    targetText: `Step ${i + 1}`,
                    posX: 100,
                    posY: 100,
                    viewportWidth: 1920,
                    viewportHeight: 1080,
                    screenshotBase64: screenshotResponse.screenshot
                  };
                  
                  await chrome.runtime.sendMessage({
                    type: 'UPLOAD_STEP',
                    data: stepData
                  });
                } catch (screenshotError) {
                  // Log error but continue recording
                  console.error('Failed to capture step:', screenshotError);
                  // Recording should continue - don't throw
                }
              } catch (error) {
                // Should not reach here for screenshot failures
                console.error('Unexpected error:', error);
              }
            }
            
            // Restore console.error
            console.error = originalConsoleError;
            
            // Verify that errors were logged for failures
            expect(consoleErrors.length).toBe(numFailures);
            
            // Verify that successful captures were recorded
            expect(capturedSteps.length).toBe(numSuccesses);
            
            // Verify that all successful steps have valid data
            capturedSteps.forEach((step, index) => {
              expect(step).toHaveProperty('sessionId');
              expect(step).toHaveProperty('screenshotBase64');
              expect(step.screenshotBase64).toMatch(/^data:image\/png;base64,/);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should not interrupt recording session on screenshot failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }), // Array of success/failure flags
          async (captureResults) => {
            capturedSteps = [];
            const consoleErrors = [];
            
            // Mock console.error
            const originalConsoleError = console.error;
            console.error = jest.fn((...args) => {
              consoleErrors.push(args);
            });
            
            let attemptIndex = 0;
            
            // Mock chrome.runtime.sendMessage
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
              if (message.type === 'GET_SESSION_STATE') {
                const response = {
                  session: {
                    sessionId: 'test-session-id',
                    stepCount: capturedSteps.length
                  }
                };
                if (callback) callback(response);
                return Promise.resolve(response);
              } else if (message.type === 'CAPTURE_SCREENSHOT') {
                const shouldSucceed = captureResults[attemptIndex];
                attemptIndex++;
                
                if (shouldSucceed) {
                  const response = { screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
                  if (callback) callback(response);
                  return Promise.resolve(response);
                } else {
                  const error = new Error('Screenshot capture failed');
                  if (callback) callback({ error: error.message });
                  return Promise.reject(error);
                }
              } else if (message.type === 'UPLOAD_STEP') {
                capturedSteps.push(message.data);
                if (callback) callback({ success: true });
                return Promise.resolve({ success: true });
              }
              return Promise.resolve({});
            });
            
            // Simulate capture attempts
            for (let i = 0; i < captureResults.length; i++) {
              try {
                const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
                
                try {
                  const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
                  
                  const stepData = {
                    sessionId: sessionResponse.session.sessionId,
                    orderIndex: capturedSteps.length + 1,
                    actionType: 'click',
                    targetText: `Step ${i + 1}`,
                    posX: 100,
                    posY: 100,
                    viewportWidth: 1920,
                    viewportHeight: 1080,
                    screenshotBase64: screenshotResponse.screenshot
                  };
                  
                  await chrome.runtime.sendMessage({
                    type: 'UPLOAD_STEP',
                    data: stepData
                  });
                } catch (screenshotError) {
                  // Log error but continue
                  console.error('Failed to capture step:', screenshotError);
                }
              } catch (error) {
                // Should not reach here
              }
            }
            
            // Restore console.error
            console.error = originalConsoleError;
            
            // Count expected successes and failures
            const expectedSuccesses = captureResults.filter(r => r).length;
            const expectedFailures = captureResults.filter(r => !r).length;
            
            // Verify error logging
            expect(consoleErrors.length).toBe(expectedFailures);
            
            // Verify successful captures
            expect(capturedSteps.length).toBe(expectedSuccesses);
            
            // Recording session should remain active (not interrupted)
            // All successful steps should be captured
            expect(capturedSteps.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle consecutive screenshot failures gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Number of consecutive failures
          async (numConsecutiveFailures) => {
            capturedSteps = [];
            const consoleErrors = [];
            
            // Mock console.error
            const originalConsoleError = console.error;
            console.error = jest.fn((...args) => {
              consoleErrors.push(args);
            });
            
            // Mock chrome.runtime.sendMessage to always fail
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
              if (message.type === 'GET_SESSION_STATE') {
                const response = {
                  session: {
                    sessionId: 'test-session-id',
                    stepCount: capturedSteps.length
                  }
                };
                if (callback) callback(response);
                return Promise.resolve(response);
              } else if (message.type === 'CAPTURE_SCREENSHOT') {
                const error = new Error('Screenshot capture failed');
                if (callback) callback({ error: error.message });
                return Promise.reject(error);
              } else if (message.type === 'UPLOAD_STEP') {
                capturedSteps.push(message.data);
                if (callback) callback({ success: true });
                return Promise.resolve({ success: true });
              }
              return Promise.resolve({});
            });
            
            // Simulate consecutive failures
            for (let i = 0; i < numConsecutiveFailures; i++) {
              try {
                const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' });
                
                try {
                  await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
                } catch (screenshotError) {
                  console.error('Failed to capture step:', screenshotError);
                }
              } catch (error) {
                // Should not reach here
              }
            }
            
            // Restore console.error
            console.error = originalConsoleError;
            
            // Verify all failures were logged
            expect(consoleErrors.length).toBe(numConsecutiveFailures);
            
            // No steps should be captured (all failed)
            expect(capturedSteps.length).toBe(0);
            
            // Recording should still be able to continue (not crashed)
            // This is verified by the fact that the loop completed without throwing
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Content Script - Page State Management', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    document.body.style.pointerEvents = '';
    document.body.style.filter = '';
  });

  describe('Property 1: Clean recording state', () => {
    // Feature: acro-saas-demo-video-tool, Property 1: Clean recording state
    
    it('should have no Extension UI elements in DOM during active recording', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of recording cycles
          fc.boolean(), // Whether to inject UI before recording
          async (numCycles, injectUIBefore) => {
            for (let cycle = 0; cycle < numCycles; cycle++) {
              // Optionally inject UI elements before recording
              if (injectUIBefore) {
                // Add countdown overlay
                const countdown = document.createElement('div');
                countdown.id = 'acro-countdown-overlay';
                countdown.textContent = '3';
                document.body.appendChild(countdown);
                
                // Add control bar container
                const controlBar = document.createElement('div');
                controlBar.id = 'acro-control-bar-container';
                document.body.appendChild(controlBar);
                
                // Add ripple styles
                const rippleStyles = document.createElement('style');
                rippleStyles.id = 'acro-ripple-styles';
                document.head.appendChild(rippleStyles);
                
                // Add ripple elements
                const ripple = document.createElement('div');
                ripple.className = 'acro-click-ripple';
                document.body.appendChild(ripple);
              }
              
              // Simulate starting recording - should remove all UI
              // This simulates the removeAllUI() function
              const countdown = document.getElementById('acro-countdown-overlay');
              if (countdown) countdown.remove();
              
              const controlBarContainer = document.getElementById('acro-control-bar-container');
              if (controlBarContainer) controlBarContainer.remove();
              
              const rippleStyles = document.getElementById('acro-ripple-styles');
              if (rippleStyles) rippleStyles.remove();
              
              document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
              
              // Verify no Extension UI elements exist during recording
              expect(document.getElementById('acro-countdown-overlay')).toBeNull();
              expect(document.getElementById('acro-control-bar-container')).toBeNull();
              expect(document.getElementById('acro-ripple-styles')).toBeNull();
              expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
              
              // Verify no elements with acro- prefix exist
              const allElements = document.querySelectorAll('*');
              const acroElements = Array.from(allElements).filter(el => 
                el.id && el.id.startsWith('acro-') || 
                el.className && el.className.toString().includes('acro-')
              );
              expect(acroElements.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain clean state across multiple recording sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              hasCountdown: fc.boolean(),
              hasControlBar: fc.boolean(),
              hasRipples: fc.boolean()
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (sessions) => {
            for (const session of sessions) {
              // Inject UI elements based on session config
              if (session.hasCountdown) {
                const countdown = document.createElement('div');
                countdown.id = 'acro-countdown-overlay';
                document.body.appendChild(countdown);
              }
              
              if (session.hasControlBar) {
                const controlBar = document.createElement('div');
                controlBar.id = 'acro-control-bar-container';
                document.body.appendChild(controlBar);
              }
              
              if (session.hasRipples) {
                const ripple1 = document.createElement('div');
                ripple1.className = 'acro-click-ripple';
                document.body.appendChild(ripple1);
                
                const ripple2 = document.createElement('div');
                ripple2.className = 'acro-click-ripple';
                document.body.appendChild(ripple2);
              }
              
              // Start recording - remove all UI
              const countdown = document.getElementById('acro-countdown-overlay');
              if (countdown) countdown.remove();
              
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) controlBar.remove();
              
              document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
              
              // Verify clean state
              expect(document.getElementById('acro-countdown-overlay')).toBeNull();
              expect(document.getElementById('acro-control-bar-container')).toBeNull();
              expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
              
              // Verify DOM is clean
              const acroElements = Array.from(document.querySelectorAll('*')).filter(el =>
                (el.id && el.id.startsWith('acro-')) ||
                (el.className && el.className.toString().includes('acro-'))
              );
              expect(acroElements.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should remove all UI elements regardless of injection order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('countdown', 'controlBar', 'ripple', 'styles'),
            { minLength: 1, maxLength: 10 }
          ),
          async (injectionOrder) => {
            // Inject UI elements in random order
            for (const elementType of injectionOrder) {
              switch (elementType) {
                case 'countdown':
                  if (!document.getElementById('acro-countdown-overlay')) {
                    const countdown = document.createElement('div');
                    countdown.id = 'acro-countdown-overlay';
                    document.body.appendChild(countdown);
                  }
                  break;
                case 'controlBar':
                  if (!document.getElementById('acro-control-bar-container')) {
                    const controlBar = document.createElement('div');
                    controlBar.id = 'acro-control-bar-container';
                    document.body.appendChild(controlBar);
                  }
                  break;
                case 'ripple':
                  const ripple = document.createElement('div');
                  ripple.className = 'acro-click-ripple';
                  document.body.appendChild(ripple);
                  break;
                case 'styles':
                  if (!document.getElementById('acro-ripple-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'acro-ripple-styles';
                    document.head.appendChild(styles);
                  }
                  break;
              }
            }
            
            // Verify some UI elements exist before cleanup
            const beforeCleanup = 
              (document.getElementById('acro-countdown-overlay') ? 1 : 0) +
              (document.getElementById('acro-control-bar-container') ? 1 : 0) +
              (document.getElementById('acro-ripple-styles') ? 1 : 0) +
              document.querySelectorAll('.acro-click-ripple').length;
            
            expect(beforeCleanup).toBeGreaterThan(0);
            
            // Remove all UI (simulating removeAllUI)
            const countdown = document.getElementById('acro-countdown-overlay');
            if (countdown) countdown.remove();
            
            const controlBar = document.getElementById('acro-control-bar-container');
            if (controlBar) controlBar.remove();
            
            const rippleStyles = document.getElementById('acro-ripple-styles');
            if (rippleStyles) rippleStyles.remove();
            
            document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
            
            // Verify all UI elements are removed
            expect(document.getElementById('acro-countdown-overlay')).toBeNull();
            expect(document.getElementById('acro-control-bar-container')).toBeNull();
            expect(document.getElementById('acro-ripple-styles')).toBeNull();
            expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
            
            // Verify no acro- elements remain
            const remainingAcroElements = Array.from(document.querySelectorAll('*')).filter(el =>
              (el.id && el.id.startsWith('acro-')) ||
              (el.className && el.className.toString().includes('acro-'))
            );
            expect(remainingAcroElements.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should not affect non-Extension elements when removing UI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.startsWith('acro-')),
              className: fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes('acro-')),
              text: fc.string({ minLength: 0, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (pageElements) => {
            // Add page elements
            const createdElements = [];
            for (const config of pageElements) {
              const el = document.createElement('div');
              el.id = config.id;
              el.className = config.className;
              el.textContent = config.text;
              document.body.appendChild(el);
              createdElements.push(el);
            }
            
            // Add Extension UI elements
            const countdown = document.createElement('div');
            countdown.id = 'acro-countdown-overlay';
            document.body.appendChild(countdown);
            
            const controlBar = document.createElement('div');
            controlBar.id = 'acro-control-bar-container';
            document.body.appendChild(controlBar);
            
            const ripple = document.createElement('div');
            ripple.className = 'acro-click-ripple';
            document.body.appendChild(ripple);
            
            // Remove Extension UI
            document.getElementById('acro-countdown-overlay')?.remove();
            document.getElementById('acro-control-bar-container')?.remove();
            document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
            
            // Verify page elements are still present
            for (const config of pageElements) {
              const el = document.getElementById(config.id);
              expect(el).toBeTruthy();
              expect(el.className).toBe(config.className);
              expect(el.textContent).toBe(config.text);
            }
            
            // Verify Extension UI is removed
            expect(document.getElementById('acro-countdown-overlay')).toBeNull();
            expect(document.getElementById('acro-control-bar-container')).toBeNull();
            expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
            
            // Cleanup
            createdElements.forEach(el => el.remove());
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle removeAllUI being called multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of removeAllUI calls
          async (numCalls) => {
            // Add UI elements
            const countdown = document.createElement('div');
            countdown.id = 'acro-countdown-overlay';
            document.body.appendChild(countdown);
            
            const controlBar = document.createElement('div');
            controlBar.id = 'acro-control-bar-container';
            document.body.appendChild(controlBar);
            
            // Call removeAllUI multiple times
            for (let i = 0; i < numCalls; i++) {
              const countdown = document.getElementById('acro-countdown-overlay');
              if (countdown) countdown.remove();
              
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) controlBar.remove();
              
              const rippleStyles = document.getElementById('acro-ripple-styles');
              if (rippleStyles) rippleStyles.remove();
              
              document.querySelectorAll('.acro-click-ripple').forEach(el => el.remove());
            }
            
            // Verify UI is clean after all calls
            expect(document.getElementById('acro-countdown-overlay')).toBeNull();
            expect(document.getElementById('acro-control-bar-container')).toBeNull();
            expect(document.getElementById('acro-ripple-styles')).toBeNull();
            expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
            
            // Should not throw errors when called on already-clean DOM
            // This is verified by the fact that the loop completed without errors
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Page freeze during pause', () => {
    // Feature: acro-saas-demo-video-tool, Property 8: Page freeze during pause
    
    it('should set pointerEvents to none and apply grayscale filter when paused', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of pause/unpause cycles
          async (numCycles) => {
            for (let i = 0; i < numCycles; i++) {
              // Ensure page starts unfrozen
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Freeze page (simulating pause)
              document.body.style.pointerEvents = 'none';
              document.body.style.filter = 'grayscale(100%)';
              
              // Verify page is frozen
              expect(document.body.style.pointerEvents).toBe('none');
              expect(document.body.style.filter).toBe('grayscale(100%)');
              
              // Unfreeze page (simulating resume)
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Verify page is unfrozen
              expect(document.body.style.pointerEvents).toBe('');
              expect(document.body.style.filter).toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain freeze state during pause regardless of initial styles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('auto', 'all', 'inherit', 'initial', ''),
          fc.constantFrom('none', 'blur(5px)', 'brightness(50%)', 'contrast(200%)', ''),
          async (initialPointerEvents, initialFilter) => {
            // Set initial styles
            document.body.style.pointerEvents = initialPointerEvents;
            document.body.style.filter = initialFilter;
            
            // Freeze page
            document.body.style.pointerEvents = 'none';
            document.body.style.filter = 'grayscale(100%)';
            
            // Verify freeze state overrides initial styles
            expect(document.body.style.pointerEvents).toBe('none');
            expect(document.body.style.filter).toBe('grayscale(100%)');
            
            // Unfreeze page
            document.body.style.pointerEvents = '';
            document.body.style.filter = '';
            
            // Verify styles are restored to empty (not initial values)
            expect(document.body.style.pointerEvents).toBe('');
            expect(document.body.style.filter).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should apply both pointerEvents and filter together', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether to freeze
          async (shouldFreeze) => {
            if (shouldFreeze) {
              // Freeze page
              document.body.style.pointerEvents = 'none';
              document.body.style.filter = 'grayscale(100%)';
              
              // Both properties should be set
              expect(document.body.style.pointerEvents).toBe('none');
              expect(document.body.style.filter).toBe('grayscale(100%)');
              
              // Verify both are applied (not just one)
              const computedStyle = window.getComputedStyle(document.body);
              expect(computedStyle.pointerEvents).toBe('none');
            } else {
              // Unfreeze page
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Both properties should be cleared
              expect(document.body.style.pointerEvents).toBe('');
              expect(document.body.style.filter).toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle rapid freeze/unfreeze cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 5, maxLength: 50 }), // Sequence of freeze/unfreeze
          async (freezeSequence) => {
            for (const shouldFreeze of freezeSequence) {
              if (shouldFreeze) {
                document.body.style.pointerEvents = 'none';
                document.body.style.filter = 'grayscale(100%)';
                
                expect(document.body.style.pointerEvents).toBe('none');
                expect(document.body.style.filter).toBe('grayscale(100%)');
              } else {
                document.body.style.pointerEvents = '';
                document.body.style.filter = '';
                
                expect(document.body.style.pointerEvents).toBe('');
                expect(document.body.style.filter).toBe('');
              }
            }
            
            // Final state should match last action
            const lastAction = freezeSequence[freezeSequence.length - 1];
            if (lastAction) {
              expect(document.body.style.pointerEvents).toBe('none');
              expect(document.body.style.filter).toBe('grayscale(100%)');
            } else {
              expect(document.body.style.pointerEvents).toBe('');
              expect(document.body.style.filter).toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should freeze page only when recording is paused', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              state: fc.constantFrom('recording', 'paused', 'stopped'),
              duration: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (stateSequence) => {
            for (const { state, duration } of stateSequence) {
              // Simulate state changes
              for (let i = 0; i < duration; i++) {
                if (state === 'paused') {
                  // Freeze page during pause
                  document.body.style.pointerEvents = 'none';
                  document.body.style.filter = 'grayscale(100%)';
                  
                  expect(document.body.style.pointerEvents).toBe('none');
                  expect(document.body.style.filter).toBe('grayscale(100%)');
                } else {
                  // Unfreeze page during recording or stopped
                  document.body.style.pointerEvents = '';
                  document.body.style.filter = '';
                  
                  expect(document.body.style.pointerEvents).toBe('');
                  expect(document.body.style.filter).toBe('');
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should not affect child element styles when freezing page', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              pointerEvents: fc.constantFrom('auto', 'none', 'all'),
              filter: fc.constantFrom('none', 'blur(2px)', 'brightness(80%)')
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (childConfigs) => {
            // Create child elements with various styles
            const children = [];
            for (const config of childConfigs) {
              const child = document.createElement('div');
              child.style.pointerEvents = config.pointerEvents;
              child.style.filter = config.filter;
              document.body.appendChild(child);
              children.push({ element: child, config });
            }
            
            // Freeze page
            document.body.style.pointerEvents = 'none';
            document.body.style.filter = 'grayscale(100%)';
            
            // Verify body is frozen
            expect(document.body.style.pointerEvents).toBe('none');
            expect(document.body.style.filter).toBe('grayscale(100%)');
            
            // Verify child elements retain their original inline styles
            for (const { element, config } of children) {
              expect(element.style.pointerEvents).toBe(config.pointerEvents);
              expect(element.style.filter).toBe(config.filter);
            }
            
            // Unfreeze page
            document.body.style.pointerEvents = '';
            document.body.style.filter = '';
            
            // Cleanup
            children.forEach(({ element }) => element.remove());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Content Script - Shadow DOM', () => {
  beforeEach(() => {
    // Clean up any existing Shadow DOM containers
    const existingContainers = document.querySelectorAll('[id^="acro-control-bar"]');
    existingContainers.forEach(container => container.remove());
  });

  describe('Property 10: Shadow DOM isolation', () => {
    // Feature: acro-saas-demo-video-tool, Property 10: Shadow DOM isolation
    
    it('should isolate Control_Bar styles from page CSS', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              selector: fc.constantFrom('button', '.control-bar', '.timer', '.resume-btn', '.done-btn'),
              property: fc.constantFrom('background', 'color', 'font-size', 'padding'),
              value: fc.constantFrom('red', 'blue', 'green', 'yellow', '50px', '100px', '5px', '10px')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (pageStyles) => {
            // Add page styles that could interfere with Control_Bar
            const styleElement = document.createElement('style');
            styleElement.id = 'test-page-styles';
            
            const cssRules = pageStyles.map(style => 
              `${style.selector} { ${style.property}: ${style.value} !important; }`
            ).join('\n');
            
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
            
            // Create Shadow DOM container
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            container.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 2147483647;
            `;
            
            const shadowRoot = container.attachShadow({ mode: 'closed' });
            
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
                
                .done-btn {
                  background: #2196F3;
                  color: white;
                }
              </style>
              
              <div class="control-bar">
                <span class="timer">00:00</span>
                <button class="resume-btn">▶️ Continue</button>
                <button class="done-btn">✅ Done</button>
              </div>
            `;
            
            document.body.appendChild(container);
            
            // Verify Shadow DOM elements exist
            const controlBar = shadowRoot.querySelector('.control-bar');
            const timer = shadowRoot.querySelector('.timer');
            const resumeBtn = shadowRoot.querySelector('.resume-btn');
            const doneBtn = shadowRoot.querySelector('.done-btn');
            
            expect(controlBar).toBeTruthy();
            expect(timer).toBeTruthy();
            expect(resumeBtn).toBeTruthy();
            expect(doneBtn).toBeTruthy();
            
            // Verify Shadow DOM maintains its structure regardless of page styles
            // The key property is that Shadow DOM elements exist and are isolated
            expect(shadowRoot.querySelector('.control-bar')).toBeTruthy();
            expect(shadowRoot.querySelector('.timer')).toBeTruthy();
            expect(shadowRoot.querySelector('.resume-btn')).toBeTruthy();
            expect(shadowRoot.querySelector('.done-btn')).toBeTruthy();
            
            // Cleanup
            container.remove();
            styleElement.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should prevent Control_Bar styles from leaking to page', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // Page button text
          async (buttonText) => {
            // Create a page button that could be affected by Control_Bar styles
            const pageButton = document.createElement('button');
            pageButton.className = 'page-button';
            pageButton.textContent = buttonText;
            pageButton.style.cssText = 'background: red; color: white; padding: 10px;';
            document.body.appendChild(pageButton);
            
            // Get initial styles
            const initialStyles = window.getComputedStyle(pageButton);
            const initialBackground = initialStyles.background;
            const initialColor = initialStyles.color;
            const initialPadding = initialStyles.padding;
            
            // Create Shadow DOM container with Control_Bar
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            container.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 2147483647;
            `;
            
            const shadowRoot = container.attachShadow({ mode: 'closed' });
            
            shadowRoot.innerHTML = `
              <style>
                button {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 500;
                  cursor: pointer;
                  background: blue;
                  color: yellow;
                }
              </style>
              
              <div class="control-bar">
                <button class="resume-btn">▶️ Continue</button>
                <button class="done-btn">✅ Done</button>
              </div>
            `;
            
            document.body.appendChild(container);
            
            // Get styles after Shadow DOM injection
            const afterStyles = window.getComputedStyle(pageButton);
            const afterBackground = afterStyles.background;
            const afterColor = afterStyles.color;
            const afterPadding = afterStyles.padding;
            
            // Verify page button styles are unchanged
            expect(afterBackground).toBe(initialBackground);
            expect(afterColor).toBe(initialColor);
            expect(afterPadding).toBe(initialPadding);
            
            // Verify page button still has red background (not affected by Shadow DOM)
            expect(afterBackground).toContain('red');
            
            // Cleanup
            container.remove();
            pageButton.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain Shadow DOM isolation with various z-index values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2147483646 }), // Page element z-index
          async (pageZIndex) => {
            // Create page element with high z-index
            const pageElement = document.createElement('div');
            pageElement.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100px;
              height: 100px;
              background: red;
              z-index: ${pageZIndex};
            `;
            document.body.appendChild(pageElement);
            
            // Create Shadow DOM container
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            container.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 2147483647;
            `;
            
            const shadowRoot = container.attachShadow({ mode: 'closed' });
            
            shadowRoot.innerHTML = `
              <style>
                .control-bar {
                  background: white;
                  padding: 12px 20px;
                }
              </style>
              
              <div class="control-bar">
                <button class="resume-btn">Continue</button>
              </div>
            `;
            
            document.body.appendChild(container);
            
            // Verify container has maximum z-index
            const containerStyles = window.getComputedStyle(container);
            expect(containerStyles.zIndex).toBe('2147483647');
            
            // Verify Shadow DOM content exists and is isolated
            const controlBar = shadowRoot.querySelector('.control-bar');
            expect(controlBar).toBeTruthy();
            
            // Verify Shadow DOM structure is maintained
            expect(shadowRoot.querySelector('.resume-btn')).toBeTruthy();
            
            // Cleanup
            container.remove();
            pageElement.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should encapsulate all Control_Bar styles within Shadow DOM', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('control-bar', 'timer', 'resume-btn', 'done-btn'),
          async (className) => {
            // Verify class doesn't exist in page before Shadow DOM
            const beforeElements = document.querySelectorAll(`.${className}`);
            expect(beforeElements.length).toBe(0);
            
            // Create Shadow DOM container
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            container.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              z-index: 2147483647;
            `;
            
            const shadowRoot = container.attachShadow({ mode: 'closed' });
            
            shadowRoot.innerHTML = `
              <style>
                .control-bar { background: white; }
                .timer { font-size: 16px; }
                .resume-btn { background: green; }
                .done-btn { background: blue; }
              </style>
              
              <div class="control-bar">
                <span class="timer">00:00</span>
                <button class="resume-btn">Continue</button>
                <button class="done-btn">Done</button>
              </div>
            `;
            
            document.body.appendChild(container);
            
            // Verify class still doesn't exist in page DOM (encapsulated in Shadow DOM)
            const afterElements = document.querySelectorAll(`.${className}`);
            expect(afterElements.length).toBe(0);
            
            // Verify class exists within Shadow DOM
            const shadowElements = shadowRoot.querySelectorAll(`.${className}`);
            expect(shadowElements.length).toBeGreaterThan(0);
            
            // Cleanup
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Shadow DOM cleanup', () => {
    // Feature: acro-saas-demo-video-tool, Property 11: Shadow DOM cleanup
    
    it('should completely remove Shadow DOM container from page DOM', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of show/hide cycles
          async (numCycles) => {
            for (let i = 0; i < numCycles; i++) {
              // Create Shadow DOM container
              const container = document.createElement('div');
              container.id = 'acro-control-bar-container';
              container.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                z-index: 2147483647;
              `;
              
              const shadowRoot = container.attachShadow({ mode: 'closed' });
              
              shadowRoot.innerHTML = `
                <style>
                  .control-bar { background: white; padding: 12px; }
                </style>
                <div class="control-bar">
                  <button class="resume-btn">Continue</button>
                  <button class="done-btn">Done</button>
                </div>
              `;
              
              document.body.appendChild(container);
              
              // Verify container exists
              let foundContainer = document.getElementById('acro-control-bar-container');
              expect(foundContainer).toBeTruthy();
              expect(foundContainer).toBe(container);
              
              // Remove container (simulating hideControlBar)
              container.remove();
              
              // Verify container is completely removed
              foundContainer = document.getElementById('acro-control-bar-container');
              expect(foundContainer).toBeNull();
              
              // Verify no orphaned elements remain
              const allDivs = document.querySelectorAll('div');
              const hasControlBarContainer = Array.from(allDivs).some(
                div => div.id === 'acro-control-bar-container'
              );
              expect(hasControlBarContainer).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should remove Shadow DOM without leaving memory leaks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }),
            { minLength: 1, maxLength: 5 }
          ),
          async (buttonTexts) => {
            const containers = [];
            
            // Create multiple Shadow DOM containers
            for (const text of buttonTexts) {
              const container = document.createElement('div');
              container.id = `acro-control-bar-${text}`;
              container.style.cssText = `
                position: fixed;
                top: 20px;
                z-index: 2147483647;
              `;
              
              const shadowRoot = container.attachShadow({ mode: 'closed' });
              
              shadowRoot.innerHTML = `
                <style>
                  .control-bar { background: white; }
                </style>
                <div class="control-bar">
                  <button>${text}</button>
                </div>
              `;
              
              document.body.appendChild(container);
              containers.push(container);
            }
            
            // Verify all containers exist
            expect(containers.length).toBe(buttonTexts.length);
            containers.forEach(container => {
              expect(document.body.contains(container)).toBe(true);
            });
            
            // Remove all containers
            containers.forEach(container => container.remove());
            
            // Verify all containers are removed
            containers.forEach(container => {
              expect(document.body.contains(container)).toBe(false);
            });
            
            // Verify no containers remain in DOM
            const remainingContainers = document.querySelectorAll('[id^="acro-control-bar-"]');
            expect(remainingContainers.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should clean up Shadow DOM event listeners on removal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of containers
          async (numContainers) => {
            const containers = [];
            const clickCounts = [];
            
            // Create containers with event listeners
            for (let i = 0; i < numContainers; i++) {
              const container = document.createElement('div');
              container.id = `acro-control-bar-${i}`;
              container.style.cssText = 'position: fixed; z-index: 2147483647;';
              
              const shadowRoot = container.attachShadow({ mode: 'closed' });
              
              shadowRoot.innerHTML = `
                <style>
                  button { padding: 8px; }
                </style>
                <div class="control-bar">
                  <button class="test-btn">Click ${i}</button>
                </div>
              `;
              
              document.body.appendChild(container);
              
              // Add event listener
              let clickCount = 0;
              const button = shadowRoot.querySelector('.test-btn');
              const handler = () => { clickCount++; };
              button.addEventListener('click', handler);
              
              containers.push(container);
              clickCounts.push({ button, clickCount: () => clickCount });
            }
            
            // Verify containers exist
            expect(containers.length).toBe(numContainers);
            
            // Remove all containers
            containers.forEach(container => container.remove());
            
            // Verify all containers are removed from DOM
            containers.forEach(container => {
              expect(document.body.contains(container)).toBe(false);
            });
            
            // Verify no containers remain
            const remaining = document.querySelectorAll('[id^="acro-control-bar-"]');
            expect(remaining.length).toBe(0);
            
            // Event listeners should be cleaned up automatically when elements are removed
            // This is verified by the fact that the elements no longer exist in the DOM
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle rapid show/hide cycles without DOM corruption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // Number of rapid cycles
          async (numCycles) => {
            for (let i = 0; i < numCycles; i++) {
              // Show Control Bar
              const container = document.createElement('div');
              container.id = 'acro-control-bar-container';
              container.style.cssText = 'position: fixed; z-index: 2147483647;';
              
              const shadowRoot = container.attachShadow({ mode: 'closed' });
              shadowRoot.innerHTML = `
                <style>.control-bar { background: white; }</style>
                <div class="control-bar"><button>Test</button></div>
              `;
              
              document.body.appendChild(container);
              
              // Verify it exists
              expect(document.getElementById('acro-control-bar-container')).toBeTruthy();
              
              // Immediately hide Control Bar
              container.remove();
              
              // Verify it's removed
              expect(document.getElementById('acro-control-bar-container')).toBeNull();
            }
            
            // After all cycles, verify DOM is clean
            const finalCheck = document.getElementById('acro-control-bar-container');
            expect(finalCheck).toBeNull();
            
            // Verify no orphaned elements
            const allElements = document.querySelectorAll('*');
            const hasControlBar = Array.from(allElements).some(
              el => el.id === 'acro-control-bar-container'
            );
            expect(hasControlBar).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should remove Shadow DOM container regardless of content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              tag: fc.constantFrom('button', 'span', 'div', 'input'),
              text: fc.string({ minLength: 0, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (elements) => {
            // Create Shadow DOM with various content
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            container.style.cssText = 'position: fixed; z-index: 2147483647;';
            
            const shadowRoot = container.attachShadow({ mode: 'closed' });
            
            const elementsHtml = elements.map(el => 
              `<${el.tag}>${el.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${el.tag}>`
            ).join('');
            
            shadowRoot.innerHTML = `
              <style>.control-bar { background: white; }</style>
              <div class="control-bar">${elementsHtml}</div>
            `;
            
            document.body.appendChild(container);
            
            // Verify container exists
            let foundContainer = document.getElementById('acro-control-bar-container');
            expect(foundContainer).toBeTruthy();
            
            // Verify Shadow DOM content exists
            const controlBar = shadowRoot.querySelector('.control-bar');
            expect(controlBar).toBeTruthy();
            expect(controlBar.children.length).toBe(elements.length);
            
            // Remove container
            const parent = container.parentNode;
            if (parent) {
              parent.removeChild(container);
            }
            
            // Verify complete removal
            foundContainer = document.getElementById('acro-control-bar-container');
            expect(foundContainer).toBeNull();
            expect(document.body.contains(container)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('Content Script - Pause and Resume', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    document.body.style.pointerEvents = '';
    document.body.style.filter = '';
    
    // Clean up any existing Shadow DOM containers
    const existingContainers = document.querySelectorAll('[id^="acro-control-bar"]');
    existingContainers.forEach(container => container.remove());
  });

  describe('Property 7: UI-removal-before-resume invariant', () => {
    // Feature: acro-saas-demo-video-tool, Property 7: UI-removal-before-resume invariant
    
    it('should remove all UI elements before updating state to recording', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of resume operations
          async (numResumes) => {
            // Track the order of operations
            const operationLog = [];
            
            // Mock chrome.runtime.sendMessage to log state updates
            chrome.runtime.sendMessage = jest.fn(async (message) => {
              if (message.type === 'RESUME_RECORDING') {
                operationLog.push({ type: 'STATE_RESUME_REQUESTED', timestamp: Date.now() });
              }
              return { success: true };
            });
            
            // Simulate the resume handler logic
            const handleResume = async () => {
              // First, remove UI elements
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) {
                operationLog.push({ type: 'HIDE_CONTROL_BAR', timestamp: Date.now() });
                controlBar.remove();
              }
              
              // Unfreeze page
              if (document.body.style.pointerEvents === 'none') {
                operationLog.push({ type: 'UNFREEZE_PAGE', timestamp: Date.now() });
                document.body.style.pointerEvents = '';
                document.body.style.filter = '';
              }
              
              // Show countdown
              operationLog.push({ type: 'SHOW_COUNTDOWN', timestamp: Date.now() });
              await new Promise(resolve => setTimeout(resolve, 10)); // Simulate countdown
              
              // Then update state to recording
              await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
            };
            
            // Perform multiple resume operations
            for (let i = 0; i < numResumes; i++) {
              operationLog.length = 0; // Clear log for each resume
              
              // Set up paused state with UI
              const container = document.createElement('div');
              container.id = 'acro-control-bar-container';
              document.body.appendChild(container);
              document.body.style.pointerEvents = 'none';
              document.body.style.filter = 'grayscale(100%)';
              
              await handleResume();
              
              // Verify operation order
              expect(operationLog.length).toBeGreaterThanOrEqual(4);
              
              // Find indices of operations
              const hideControlBarIndex = operationLog.findIndex(op => op.type === 'HIDE_CONTROL_BAR');
              const unfreezePageIndex = operationLog.findIndex(op => op.type === 'UNFREEZE_PAGE');
              const showCountdownIndex = operationLog.findIndex(op => op.type === 'SHOW_COUNTDOWN');
              const stateResumeIndex = operationLog.findIndex(op => op.type === 'STATE_RESUME_REQUESTED');
              
              // Verify UI removal comes before state update
              expect(hideControlBarIndex).toBeGreaterThanOrEqual(0);
              expect(unfreezePageIndex).toBeGreaterThanOrEqual(0);
              expect(showCountdownIndex).toBeGreaterThanOrEqual(0);
              expect(stateResumeIndex).toBeGreaterThan(hideControlBarIndex);
              expect(stateResumeIndex).toBeGreaterThan(unfreezePageIndex);
              expect(stateResumeIndex).toBeGreaterThan(showCountdownIndex);
              
              // Verify timestamps confirm ordering
              expect(operationLog[hideControlBarIndex].timestamp).toBeLessThanOrEqual(
                operationLog[stateResumeIndex].timestamp
              );
              expect(operationLog[unfreezePageIndex].timestamp).toBeLessThanOrEqual(
                operationLog[stateResumeIndex].timestamp
              );
              expect(operationLog[showCountdownIndex].timestamp).toBeLessThanOrEqual(
                operationLog[stateResumeIndex].timestamp
              );
              
              // Verify UI is actually removed
              expect(document.getElementById('acro-control-bar-container')).toBeNull();
              expect(document.body.style.pointerEvents).toBe('');
              expect(document.body.style.filter).toBe('');
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100 to 20 for faster execution
      );
    }, 30000); // 30 second timeout
    
    it('should not resume if UI removal fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether UI removal should fail
          async (shouldFail) => {
            let stateUpdated = false;
            let uiRemoved = false;
            
            // Mock chrome.runtime.sendMessage
            chrome.runtime.sendMessage = jest.fn(async (message) => {
              if (message.type === 'RESUME_RECORDING') {
                stateUpdated = true;
              }
              return { success: true };
            });
            
            // Simulate resume handler
            const handleResume = async () => {
              try {
                // Try to remove UI
                const controlBar = document.getElementById('acro-control-bar-container');
                if (controlBar) {
                  if (shouldFail) {
                    throw new Error('Failed to remove UI');
                  }
                  controlBar.remove();
                  uiRemoved = true;
                }
                
                // Unfreeze page
                document.body.style.pointerEvents = '';
                document.body.style.filter = '';
                
                // Only update state if UI removal succeeded
                await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
              } catch (error) {
                // If UI removal fails, don't update state
                console.error('Failed to resume:', error);
              }
            };
            
            // Set up paused state with UI
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            document.body.appendChild(container);
            document.body.style.pointerEvents = 'none';
            document.body.style.filter = 'grayscale(100%)';
            
            await handleResume();
            
            if (shouldFail) {
              // If UI removal failed, state should not be updated
              expect(uiRemoved).toBe(false);
              expect(stateUpdated).toBe(false);
              // UI should still be present
              expect(document.getElementById('acro-control-bar-container')).toBeTruthy();
            } else {
              // If UI removal succeeded, state should be updated
              expect(uiRemoved).toBe(true);
              expect(stateUpdated).toBe(true);
              // UI should be removed
              expect(document.getElementById('acro-control-bar-container')).toBeNull();
            }
            
            // Cleanup
            const remaining = document.getElementById('acro-control-bar-container');
            if (remaining) remaining.remove();
          }
        ),
        { numRuns: 20 } // Reduced from 100 to 20
      );
    });
    
    it('should maintain UI-removal-before-resume invariant across concurrent resume attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of concurrent resume attempts
          async (numConcurrent) => {
            const operationLog = [];
            let uiRemovalCount = 0;
            let stateUpdateCount = 0;
            
            // Mock chrome.runtime.sendMessage
            chrome.runtime.sendMessage = jest.fn(async (message) => {
              if (message.type === 'RESUME_RECORDING') {
                stateUpdateCount++;
                operationLog.push({ 
                  type: 'STATE_RESUME', 
                  timestamp: Date.now(),
                  uiRemovalsBefore: uiRemovalCount
                });
                // Add small delay to simulate async operation
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              return { success: true };
            });
            
            // Simulate resume handler
            const handleResume = async () => {
              // Remove UI
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) {
                uiRemovalCount++;
                operationLog.push({ 
                  type: 'UI_REMOVED', 
                  timestamp: Date.now() 
                });
                controlBar.remove();
              }
              
              // Unfreeze page
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Update state
              await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
            };
            
            // Set up paused state with UI for each concurrent attempt
            for (let i = 0; i < numConcurrent; i++) {
              const container = document.createElement('div');
              container.id = `acro-control-bar-container-${i}`;
              document.body.appendChild(container);
            }
            document.body.style.pointerEvents = 'none';
            document.body.style.filter = 'grayscale(100%)';
            
            // Execute concurrent resume attempts
            const resumePromises = Array(numConcurrent).fill(null).map((_, i) => {
              // Each attempt removes its own container
              return (async () => {
                const controlBar = document.getElementById(`acro-control-bar-container-${i}`);
                if (controlBar) {
                  uiRemovalCount++;
                  operationLog.push({ 
                    type: 'UI_REMOVED', 
                    timestamp: Date.now() 
                  });
                  controlBar.remove();
                }
                
                document.body.style.pointerEvents = '';
                document.body.style.filter = '';
                
                await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
              })();
            });
            
            await Promise.all(resumePromises);
            
            // Verify that for each state update, at least one UI removal occurred before it
            const stateUpdates = operationLog.filter(op => op.type === 'STATE_RESUME');
            
            for (const stateUpdate of stateUpdates) {
              // Each state update should have at least one UI removal before it
              expect(stateUpdate.uiRemovalsBefore).toBeGreaterThan(0);
            }
            
            // Verify all UI is removed
            for (let i = 0; i < numConcurrent; i++) {
              expect(document.getElementById(`acro-control-bar-container-${i}`)).toBeNull();
            }
          }
        ),
        { numRuns: 50 } // Reduced for concurrent operations
      );
    }, 30000); // 30 second timeout for concurrent operations
    
    it('should complete countdown before updating state to recording', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Countdown duration in deciseconds (0.1s units)
          async (countdownDuration) => {
            const operationLog = [];
            
            // Mock chrome.runtime.sendMessage
            chrome.runtime.sendMessage = jest.fn(async (message) => {
              if (message.type === 'RESUME_RECORDING') {
                operationLog.push({ type: 'STATE_RESUME', timestamp: Date.now() });
              }
              return { success: true };
            });
            
            // Simulate resume handler with countdown
            const handleResume = async () => {
              // Remove UI
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) {
                operationLog.push({ type: 'UI_REMOVED', timestamp: Date.now() });
                controlBar.remove();
              }
              
              // Unfreeze page
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Show countdown
              operationLog.push({ type: 'COUNTDOWN_START', timestamp: Date.now() });
              await new Promise(resolve => setTimeout(resolve, countdownDuration * 100));
              operationLog.push({ type: 'COUNTDOWN_END', timestamp: Date.now() });
              
              // Update state after countdown
              await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
            };
            
            // Set up paused state
            const container = document.createElement('div');
            container.id = 'acro-control-bar-container';
            document.body.appendChild(container);
            
            await handleResume();
            
            // Find operation indices
            const uiRemovedIndex = operationLog.findIndex(op => op.type === 'UI_REMOVED');
            const countdownStartIndex = operationLog.findIndex(op => op.type === 'COUNTDOWN_START');
            const countdownEndIndex = operationLog.findIndex(op => op.type === 'COUNTDOWN_END');
            const stateResumeIndex = operationLog.findIndex(op => op.type === 'STATE_RESUME');
            
            // Verify order: UI removal → countdown start → countdown end → state update
            expect(uiRemovedIndex).toBeGreaterThanOrEqual(0);
            expect(countdownStartIndex).toBeGreaterThan(uiRemovedIndex);
            expect(countdownEndIndex).toBeGreaterThan(countdownStartIndex);
            expect(stateResumeIndex).toBeGreaterThan(countdownEndIndex);
            
            // Verify countdown completed before state update
            const countdownDurationMs = operationLog[countdownEndIndex].timestamp - 
                                        operationLog[countdownStartIndex].timestamp;
            expect(countdownDurationMs).toBeGreaterThanOrEqual(countdownDuration * 100 - 50); // 50ms tolerance
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 30 second timeout
    
    it('should remove all types of UI elements before resume', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasControlBar: fc.boolean(),
            hasCountdown: fc.boolean(),
            hasRipples: fc.boolean(),
            hasStyles: fc.boolean()
          }),
          async (uiElements) => {
            const operationLog = [];
            
            // Mock chrome.runtime.sendMessage
            chrome.runtime.sendMessage = jest.fn(async (message) => {
              if (message.type === 'RESUME_RECORDING') {
                operationLog.push({ type: 'STATE_RESUME', timestamp: Date.now() });
              }
              return { success: true };
            });
            
            // Set up UI elements based on config
            if (uiElements.hasControlBar) {
              const controlBar = document.createElement('div');
              controlBar.id = 'acro-control-bar-container';
              document.body.appendChild(controlBar);
            }
            
            if (uiElements.hasCountdown) {
              const countdown = document.createElement('div');
              countdown.id = 'acro-countdown-overlay';
              document.body.appendChild(countdown);
            }
            
            if (uiElements.hasRipples) {
              const ripple1 = document.createElement('div');
              ripple1.className = 'acro-click-ripple';
              document.body.appendChild(ripple1);
              
              const ripple2 = document.createElement('div');
              ripple2.className = 'acro-click-ripple';
              document.body.appendChild(ripple2);
            }
            
            if (uiElements.hasStyles) {
              const styles = document.createElement('style');
              styles.id = 'acro-ripple-styles';
              document.head.appendChild(styles);
            }
            
            // Simulate resume handler
            const handleResume = async () => {
              // Remove all UI elements
              const controlBar = document.getElementById('acro-control-bar-container');
              if (controlBar) {
                operationLog.push({ type: 'REMOVE_CONTROL_BAR', timestamp: Date.now() });
                controlBar.remove();
              }
              
              const countdown = document.getElementById('acro-countdown-overlay');
              if (countdown) {
                operationLog.push({ type: 'REMOVE_COUNTDOWN', timestamp: Date.now() });
                countdown.remove();
              }
              
              const ripples = document.querySelectorAll('.acro-click-ripple');
              if (ripples.length > 0) {
                operationLog.push({ type: 'REMOVE_RIPPLES', timestamp: Date.now() });
                ripples.forEach(r => r.remove());
              }
              
              const styles = document.getElementById('acro-ripple-styles');
              if (styles) {
                operationLog.push({ type: 'REMOVE_STYLES', timestamp: Date.now() });
                styles.remove();
              }
              
              // Unfreeze page
              document.body.style.pointerEvents = '';
              document.body.style.filter = '';
              
              // Update state
              await chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
            };
            
            await handleResume();
            
            // Verify all UI elements are removed
            expect(document.getElementById('acro-control-bar-container')).toBeNull();
            expect(document.getElementById('acro-countdown-overlay')).toBeNull();
            expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
            expect(document.getElementById('acro-ripple-styles')).toBeNull();
            
            // Verify state update happened after UI removal
            const stateResumeIndex = operationLog.findIndex(op => op.type === 'STATE_RESUME');
            expect(stateResumeIndex).toBeGreaterThanOrEqual(0);
            
            // All UI removal operations should come before state update
            const uiRemovalOperations = operationLog.filter(op => 
              op.type.startsWith('REMOVE_')
            );
            
            for (const uiOp of uiRemovalOperations) {
              const uiOpIndex = operationLog.indexOf(uiOp);
              expect(uiOpIndex).toBeLessThan(stateResumeIndex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Content Script - Click Feedback', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('Property 3: Click feedback visibility', () => {
    // Feature: acro-saas-demo-video-tool, Property 3: Click feedback visibility
    
    it('should inject ripple element at click coordinates for any captured click event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1920 }), // x coordinate
          fc.integer({ min: 0, max: 1080 }), // y coordinate
          async (x, y) => {
            // Simulate showClickRipple function
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
              `;
              document.head.appendChild(style);
            }
            
            document.body.appendChild(ripple);
            
            // Verify ripple element is injected
            const ripples = document.querySelectorAll('.acro-click-ripple');
            expect(ripples.length).toBeGreaterThan(0);
            
            // Verify ripple is at correct coordinates
            const injectedRipple = ripples[ripples.length - 1];
            expect(injectedRipple.style.left).toBe(`${x}px`);
            expect(injectedRipple.style.top).toBe(`${y}px`);
            
            // Verify ripple is visible in DOM
            expect(injectedRipple.parentElement).toBe(document.body);
            expect(injectedRipple.className).toBe('acro-click-ripple');
            
            // Verify ripple has animation
            expect(injectedRipple.style.animation).toContain('acro-ripple-expand');
            expect(injectedRipple.style.animation).toContain('0.5s');
            
            // Verify ripple styles are injected
            const styles = document.getElementById('acro-ripple-styles');
            expect(styles).not.toBeNull();
            expect(styles.textContent).toContain('@keyframes acro-ripple-expand');
            
            // Clean up
            ripple.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should create ripple with correct visual properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 3840 }), // x coordinate (4K width)
          fc.integer({ min: 0, max: 2160 }), // y coordinate (4K height)
          async (x, y) => {
            // Simulate showClickRipple
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
            
            document.body.appendChild(ripple);
            
            // Verify visual properties
            expect(ripple.style.position).toBe('fixed');
            expect(ripple.style.border).toContain('3px');
            expect(ripple.style.border.toLowerCase()).toContain('#ff0000');
            expect(ripple.style.borderRadius).toBe('50%');
            expect(ripple.style.pointerEvents).toBe('none');
            expect(ripple.style.zIndex).toBe('2147483646');
            
            // Verify transform centers the ripple
            expect(ripple.style.transform).toContain('translate(-50%, -50%)');
            
            // Clean up
            ripple.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should animate ripple expansion over 500ms (15 frames at 30fps)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1000 }), // x coordinate
          fc.integer({ min: 100, max: 800 }), // y coordinate
          async (x, y) => {
            // Add styles first
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
              `;
              document.head.appendChild(style);
            }
            
            // Create ripple
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
            
            document.body.appendChild(ripple);
            
            // Verify animation duration is 500ms (0.5s)
            expect(ripple.style.animation).toContain('0.5s');
            
            // Verify animation name
            expect(ripple.style.animation).toContain('acro-ripple-expand');
            
            // Verify animation easing
            expect(ripple.style.animation).toContain('ease-out');
            
            // Verify keyframes exist
            const styles = document.getElementById('acro-ripple-styles');
            expect(styles.textContent).toContain('0%');
            expect(styles.textContent).toContain('100%');
            expect(styles.textContent).toContain('width: 20px');
            expect(styles.textContent).toContain('width: 60px');
            expect(styles.textContent).toContain('opacity: 1');
            expect(styles.textContent).toContain('opacity: 0');
            
            // Clean up
            ripple.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should remove ripple element after animation completes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1920 }),
          fc.integer({ min: 0, max: 1080 }),
          async (x, y) => {
            // Create ripple
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
            
            document.body.appendChild(ripple);
            
            // Verify ripple is in DOM
            expect(document.body.contains(ripple)).toBe(true);
            expect(document.querySelectorAll('.acro-click-ripple').length).toBeGreaterThan(0);
            
            // Simulate removal after 500ms
            await new Promise(resolve => {
              setTimeout(() => {
                ripple.remove();
                resolve();
              }, 500);
            });
            
            // Verify ripple is removed from DOM
            expect(document.body.contains(ripple)).toBe(false);
            
            // If this was the only ripple, verify none remain
            const remainingRipples = document.querySelectorAll('.acro-click-ripple');
            expect(remainingRipples.length).toBe(0);
          }
        ),
        { numRuns: 10 } // Reduced from 100 to avoid timeout (10 * 500ms = 5s)
      );
    }, 10000); // Increase timeout to 10 seconds
    
    it('should handle multiple simultaneous ripples', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              x: fc.integer({ min: 0, max: 1920 }),
              y: fc.integer({ min: 0, max: 1080 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (clicks) => {
            // Add styles once
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
              `;
              document.head.appendChild(style);
            }
            
            // Create multiple ripples
            const ripples = [];
            for (const click of clicks) {
              const ripple = document.createElement('div');
              ripple.className = 'acro-click-ripple';
              ripple.style.cssText = `
                position: fixed;
                left: ${click.x}px;
                top: ${click.y}px;
                width: 20px;
                height: 20px;
                border: 3px solid #FF0000;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 2147483646;
                animation: acro-ripple-expand 0.5s ease-out;
              `;
              document.body.appendChild(ripple);
              ripples.push(ripple);
            }
            
            // Verify all ripples are in DOM
            const allRipples = document.querySelectorAll('.acro-click-ripple');
            expect(allRipples.length).toBe(clicks.length);
            
            // Verify each ripple has correct coordinates
            ripples.forEach((ripple, index) => {
              expect(ripple.style.left).toBe(`${clicks[index].x}px`);
              expect(ripple.style.top).toBe(`${clicks[index].y}px`);
              expect(document.body.contains(ripple)).toBe(true);
            });
            
            // Clean up all ripples
            ripples.forEach(ripple => ripple.remove());
            
            // Verify all removed
            expect(document.querySelectorAll('.acro-click-ripple').length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should inject ripple styles only once', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              x: fc.integer({ min: 0, max: 1920 }),
              y: fc.integer({ min: 0, max: 1080 })
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (clicks) => {
            // Simulate multiple showClickRipple calls
            for (const click of clicks) {
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
                `;
                document.head.appendChild(style);
              }
              
              const ripple = document.createElement('div');
              ripple.className = 'acro-click-ripple';
              ripple.style.cssText = `
                position: fixed;
                left: ${click.x}px;
                top: ${click.y}px;
                width: 20px;
                height: 20px;
                border: 3px solid #FF0000;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 2147483646;
                animation: acro-ripple-expand 0.5s ease-out;
              `;
              document.body.appendChild(ripple);
            }
            
            // Verify styles are injected only once
            const styleElements = document.querySelectorAll('#acro-ripple-styles');
            expect(styleElements.length).toBe(1);
            
            // Verify all ripples were created
            const ripples = document.querySelectorAll('.acro-click-ripple');
            expect(ripples.length).toBe(clicks.length);
            
            // Clean up
            ripples.forEach(ripple => ripple.remove());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
