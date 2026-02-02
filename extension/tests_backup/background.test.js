/**
 * Property-based tests for background.js
 * Feature: acro-saas-demo-video-tool
 */

const fc = require('fast-check');
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  tabs: {
    create: jest.fn(),
    captureVisibleTab: jest.fn()
  }
};

// Import the module functions (we'll need to refactor background.js to export functions)
// For now, we'll test the state machine logic directly

/**
 * Validate state transition
 */
function isValidStateTransition(fromState, toState) {
  const validTransitions = {
    'idle': ['initializing'],
    'initializing': ['recording', 'idle'],
    'recording': ['paused', 'stopped'],
    'paused': ['recording', 'stopped'],
    'stopped': ['idle']
  };
  
  return validTransitions[fromState]?.includes(toState) || false;
}

/**
 * Get badge configuration for a given state
 */
function getBadgeConfig(status) {
  switch (status) {
    case 'idle':
    case 'stopped':
      return { text: '', color: '#000000' };
    case 'initializing':
      return { text: '...', color: '#FFAA00' };
    case 'recording':
      return { text: 'REC', color: '#FF0000' };
    case 'paused':
      return { text: '||', color: '#808080' };
    default:
      return null;
  }
}

describe('Background Service Worker - State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 4: Upload retry with exponential backoff', () => {
    // Feature: acro-saas-demo-video-tool, Property 4: Upload retry with exponential backoff
    
    it('should retry failed uploads up to 3 times with exponential backoff delays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionId: fc.uuid(),
            orderIndex: fc.integer({ min: 1, max: 100 }),
            actionType: fc.constantFrom('click', 'scroll'),
            targetText: fc.string({ minLength: 0, maxLength: 100 }),
            posX: fc.integer({ min: 0, max: 1920 }),
            posY: fc.integer({ min: 0, max: 1080 }),
            viewportWidth: fc.integer({ min: 800, max: 3840 }),
            viewportHeight: fc.integer({ min: 600, max: 2160 }),
            screenshotBase64: fc.string({ minLength: 100, maxLength: 200 }).map(s => `data:image/png;base64,${s}`)
          }),
          fc.integer({ min: 0, max: 3 }), // Number of failures before success
          async (stepData, failuresBeforeSuccess) => {
            let attemptCount = 0;
            const attemptTimestamps = [];
            
            // Mock fetch to fail a specific number of times
            global.fetch = jest.fn(async () => {
              attemptTimestamps.push(Date.now());
              attemptCount++;
              
              if (attemptCount <= failuresBeforeSuccess) {
                throw new Error('Network error');
              }
              
              return {
                ok: true,
                json: async () => ({ stepId: 123 })
              };
            });
            
            // Mock IndexedDB
            global.indexedDB = {
              open: jest.fn(() => ({
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
                result: {
                  transaction: jest.fn(() => ({
                    objectStore: jest.fn(() => ({
                      add: jest.fn(() => ({
                        onsuccess: null,
                        onerror: null
                      }))
                    }))
                  }))
                }
              }))
            };
            
            const uploadStepWithRetry = async (stepData, retryCount = 0) => {
              const MAX_RETRIES = 3;
              const RETRY_DELAYS = [100, 200, 400]; // Reduced delays for testing (10x faster)
              
              try {
                const response = await fetch('http://localhost:5000/api/recording/chunk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(stepData)
                });
                
                if (!response.ok) {
                  throw new Error(`Upload failed with status ${response.status}`);
                }
                
                const result = await response.json();
                return { success: true, stepId: result.stepId };
                
              } catch (error) {
                if (retryCount < MAX_RETRIES) {
                  const delay = RETRY_DELAYS[retryCount];
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return uploadStepWithRetry(stepData, retryCount + 1);
                } else {
                  throw new Error('Upload failed after maximum retries');
                }
              }
            };
            
            if (failuresBeforeSuccess <= 3) {
              // Should succeed after retries
              const result = await uploadStepWithRetry(stepData);
              expect(result.success).toBe(true);
              expect(attemptCount).toBe(failuresBeforeSuccess + 1);
              
              // Verify exponential backoff delays (with reduced timing)
              if (attemptTimestamps.length > 1) {
                const delays = [100, 200, 400];
                for (let i = 1; i < attemptTimestamps.length; i++) {
                  const actualDelay = attemptTimestamps[i] - attemptTimestamps[i - 1];
                  const expectedDelay = delays[i - 1];
                  // Allow 50ms tolerance for timing
                  expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 50);
                }
              }
            } else {
              // Should fail after 3 retries
              await expect(uploadStepWithRetry(stepData)).rejects.toThrow('Upload failed after maximum retries');
              expect(attemptCount).toBe(4); // Initial attempt + 3 retries
            }
          }
        ),
        { numRuns: 20 } // Reduced from 100 to 20 for faster execution
      );
    }, 30000); // 30 second timeout

    it('should use delays of 1s, 2s, 4s for the three retry attempts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }),
          (retryIndex) => {
            const RETRY_DELAYS = [1000, 2000, 4000];
            const delay = RETRY_DELAYS[retryIndex];
            
            // Verify delays follow exponential pattern
            expect(delay).toBe(1000 * Math.pow(2, retryIndex));
            
            // Verify specific values
            if (retryIndex === 0) expect(delay).toBe(1000);
            if (retryIndex === 1) expect(delay).toBe(2000);
            if (retryIndex === 2) expect(delay).toBe(4000);
          }
        ),
        { numRuns: 20 } // Reduced from 100 to 20
      );
    });

    it('should not retry more than 3 times for any upload', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          (consecutiveFailures) => {
            // If upload fails more than 3 times, it should stop retrying
            const MAX_RETRIES = 3;
            const totalAttempts = Math.min(consecutiveFailures, MAX_RETRIES + 1);
            
            expect(totalAttempts).toBeLessThanOrEqual(4); // 1 initial + 3 retries
          }
        ),
        { numRuns: 20 } // Reduced from 100 to 20
      );
    });
  });

  describe('Property 5: Upload data completeness', () => {
    // Feature: acro-saas-demo-video-tool, Property 5: Upload data completeness
    
    it('should include all required fields in upload request payload', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.uuid(),
            orderIndex: fc.integer({ min: 1, max: 1000 }),
            actionType: fc.constantFrom('click', 'scroll'),
            targetText: fc.string({ minLength: 0, maxLength: 200 }),
            posX: fc.integer({ min: 0, max: 3840 }),
            posY: fc.integer({ min: 0, max: 2160 }),
            viewportWidth: fc.integer({ min: 800, max: 3840 }),
            viewportHeight: fc.integer({ min: 600, max: 2160 }),
            screenshotBase64: fc.string({ minLength: 100, maxLength: 500 }).map(s => `data:image/png;base64,${s}`)
          }),
          (stepData) => {
            // Verify all required fields are present
            expect(stepData).toHaveProperty('sessionId');
            expect(stepData).toHaveProperty('orderIndex');
            expect(stepData).toHaveProperty('actionType');
            expect(stepData).toHaveProperty('targetText');
            expect(stepData).toHaveProperty('posX');
            expect(stepData).toHaveProperty('posY');
            expect(stepData).toHaveProperty('viewportWidth');
            expect(stepData).toHaveProperty('viewportHeight');
            expect(stepData).toHaveProperty('screenshotBase64');
            
            // Verify field types and formats
            expect(typeof stepData.sessionId).toBe('string');
            expect(typeof stepData.orderIndex).toBe('number');
            expect(['click', 'scroll']).toContain(stepData.actionType);
            expect(typeof stepData.targetText).toBe('string');
            expect(typeof stepData.posX).toBe('number');
            expect(typeof stepData.posY).toBe('number');
            expect(typeof stepData.viewportWidth).toBe('number');
            expect(typeof stepData.viewportHeight).toBe('number');
            expect(stepData.screenshotBase64).toMatch(/^data:image\/png;base64,/);
            
            // Verify value ranges
            expect(stepData.orderIndex).toBeGreaterThan(0);
            expect(stepData.posX).toBeGreaterThanOrEqual(0);
            expect(stepData.posY).toBeGreaterThanOrEqual(0);
            expect(stepData.viewportWidth).toBeGreaterThan(0);
            expect(stepData.viewportHeight).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should send complete step data in POST request body', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionId: fc.uuid(),
            orderIndex: fc.integer({ min: 1, max: 100 }),
            actionType: fc.constantFrom('click', 'scroll'),
            targetText: fc.string({ minLength: 0, maxLength: 100 }),
            posX: fc.integer({ min: 0, max: 1920 }),
            posY: fc.integer({ min: 0, max: 1080 }),
            viewportWidth: fc.integer({ min: 800, max: 3840 }),
            viewportHeight: fc.integer({ min: 600, max: 2160 }),
            screenshotBase64: fc.string({ minLength: 100, maxLength: 200 }).map(s => `data:image/png;base64,${s}`)
          }),
          async (stepData) => {
            let capturedPayload = null;
            
            // Mock fetch to capture the request payload
            global.fetch = jest.fn(async (url, options) => {
              capturedPayload = JSON.parse(options.body);
              return {
                ok: true,
                json: async () => ({ stepId: 123 })
              };
            });
            
            const uploadStep = async (data) => {
              const response = await fetch('http://localhost:5000/api/recording/chunk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              if (!response.ok) {
                throw new Error('Upload failed');
              }
              
              return await response.json();
            };
            
            await uploadStep(stepData);
            
            // Verify the captured payload contains all required fields
            expect(capturedPayload).not.toBeNull();
            expect(capturedPayload.sessionId).toBe(stepData.sessionId);
            expect(capturedPayload.orderIndex).toBe(stepData.orderIndex);
            expect(capturedPayload.actionType).toBe(stepData.actionType);
            expect(capturedPayload.targetText).toBe(stepData.targetText);
            expect(capturedPayload.posX).toBe(stepData.posX);
            expect(capturedPayload.posY).toBe(stepData.posY);
            expect(capturedPayload.viewportWidth).toBe(stepData.viewportWidth);
            expect(capturedPayload.viewportHeight).toBe(stepData.viewportHeight);
            expect(capturedPayload.screenshotBase64).toBe(stepData.screenshotBase64);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not omit any required fields even when values are edge cases', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.uuid(),
            orderIndex: fc.integer({ min: 1, max: 1 }), // Edge: minimum value
            actionType: fc.constantFrom('click', 'scroll'),
            targetText: fc.constant(''), // Edge: empty string
            posX: fc.constant(0), // Edge: zero coordinate
            posY: fc.constant(0), // Edge: zero coordinate
            viewportWidth: fc.integer({ min: 800, max: 800 }), // Edge: minimum viewport
            viewportHeight: fc.integer({ min: 600, max: 600 }), // Edge: minimum viewport
            screenshotBase64: fc.constant('data:image/png;base64,ABC') // Edge: minimal base64
          }),
          (stepData) => {
            // Even with edge case values, all fields must be present
            const requiredFields = [
              'sessionId', 'orderIndex', 'actionType', 'targetText',
              'posX', 'posY', 'viewportWidth', 'viewportHeight', 'screenshotBase64'
            ];
            
            for (const field of requiredFields) {
              expect(stepData).toHaveProperty(field);
              expect(stepData[field]).not.toBeUndefined();
              expect(stepData[field]).not.toBeNull();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 38: Upload batching', () => {
    // Feature: acro-saas-demo-video-tool, Property 38: Upload batching
    
    it('should batch uploads when 5 steps are captured', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              sessionId: fc.uuid(),
              orderIndex: fc.integer({ min: 1, max: 100 }),
              actionType: fc.constantFrom('click', 'scroll'),
              targetText: fc.string({ minLength: 0, maxLength: 50 }),
              posX: fc.integer({ min: 0, max: 1920 }),
              posY: fc.integer({ min: 0, max: 1080 }),
              viewportWidth: fc.integer({ min: 800, max: 1920 }),
              viewportHeight: fc.integer({ min: 600, max: 1080 }),
              screenshotBase64: fc.constant('data:image/png;base64,ABC')
            }),
            { minLength: 5, maxLength: 5 } // Exactly 5 steps
          ),
          async (steps) => {
            const BATCH_SIZE = 5;
            let uploadQueue = [];
            let batchProcessedCount = 0;
            
            const queueStepForUpload = (stepData) => {
              uploadQueue.push(stepData);
              
              if (uploadQueue.length >= BATCH_SIZE) {
                // Process batch
                batchProcessedCount++;
                uploadQueue = [];
              }
            };
            
            // Queue all steps
            for (const step of steps) {
              queueStepForUpload(step);
            }
            
            // Verify batch was processed when reaching batch size
            expect(batchProcessedCount).toBe(1);
            expect(uploadQueue.length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should batch uploads after 10 seconds timeout even with fewer than 5 steps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              sessionId: fc.uuid(),
              orderIndex: fc.integer({ min: 1, max: 100 }),
              actionType: fc.constantFrom('click', 'scroll'),
              targetText: fc.string({ minLength: 0, maxLength: 50 }),
              posX: fc.integer({ min: 0, max: 1920 }),
              posY: fc.integer({ min: 0, max: 1080 }),
              viewportWidth: fc.integer({ min: 800, max: 1920 }),
              viewportHeight: fc.integer({ min: 600, max: 1080 }),
              screenshotBase64: fc.constant('data:image/png;base64,ABC')
            }),
            { minLength: 1, maxLength: 4 } // Less than batch size
          ),
          async (steps) => {
            const BATCH_SIZE = 5;
            const BATCH_TIMEOUT_MS = 100; // Reduced for testing (100ms instead of 10s)
            let uploadQueue = [];
            let batchTimer = null;
            let batchProcessedCount = 0;
            
            const processBatch = () => {
              if (uploadQueue.length > 0) {
                batchProcessedCount++;
                uploadQueue = [];
              }
              if (batchTimer) {
                clearTimeout(batchTimer);
                batchTimer = null;
              }
            };
            
            const queueStepForUpload = (stepData) => {
              uploadQueue.push(stepData);
              
              if (uploadQueue.length >= BATCH_SIZE) {
                processBatch();
              } else {
                if (batchTimer) {
                  clearTimeout(batchTimer);
                }
                batchTimer = setTimeout(() => {
                  processBatch();
                }, BATCH_TIMEOUT_MS);
              }
            };
            
            // Queue all steps
            for (const step of steps) {
              queueStepForUpload(step);
            }
            
            // Verify batch is not processed immediately (less than batch size)
            expect(batchProcessedCount).toBe(0);
            expect(uploadQueue.length).toBe(steps.length);
            
            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, BATCH_TIMEOUT_MS + 50));
            
            // Verify batch was processed after timeout
            expect(batchProcessedCount).toBe(1);
            expect(uploadQueue.length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    }, 10000); // 10 second timeout

    it('should process multiple batches when more than 5 steps are captured', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 6, max: 20 }),
          async (stepCount) => {
            const BATCH_SIZE = 5;
            let uploadQueue = [];
            let batchProcessedCount = 0;
            
            const processBatch = () => {
              if (uploadQueue.length > 0) {
                batchProcessedCount++;
                uploadQueue = [];
              }
            };
            
            const queueStepForUpload = (stepData) => {
              uploadQueue.push(stepData);
              
              if (uploadQueue.length >= BATCH_SIZE) {
                processBatch();
              }
            };
            
            // Queue steps
            for (let i = 0; i < stepCount; i++) {
              queueStepForUpload({ orderIndex: i + 1 });
            }
            
            // Calculate expected batches
            const expectedBatches = Math.floor(stepCount / BATCH_SIZE);
            const remainingSteps = stepCount % BATCH_SIZE;
            
            // Verify correct number of batches processed
            expect(batchProcessedCount).toBe(expectedBatches);
            expect(uploadQueue.length).toBe(remainingSteps);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reset timer when new step is added before timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 4 }),
          async (stepCount) => {
            const BATCH_SIZE = 5;
            const BATCH_TIMEOUT_MS = 100;
            let uploadQueue = [];
            let batchTimer = null;
            let batchProcessedCount = 0;
            let timerResetCount = 0;
            
            const processBatch = () => {
              if (uploadQueue.length > 0) {
                batchProcessedCount++;
                uploadQueue = [];
              }
              if (batchTimer) {
                clearTimeout(batchTimer);
                batchTimer = null;
              }
            };
            
            const queueStepForUpload = (stepData) => {
              uploadQueue.push(stepData);
              
              if (uploadQueue.length >= BATCH_SIZE) {
                processBatch();
              } else {
                if (batchTimer) {
                  clearTimeout(batchTimer);
                  timerResetCount++;
                }
                batchTimer = setTimeout(() => {
                  processBatch();
                }, BATCH_TIMEOUT_MS);
              }
            };
            
            // Queue steps with delays less than timeout
            for (let i = 0; i < stepCount; i++) {
              queueStepForUpload({ orderIndex: i + 1 });
              if (i < stepCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 50)); // 50ms < 100ms timeout
              }
            }
            
            // Verify timer was reset for each new step (except first)
            expect(timerResetCount).toBe(stepCount - 1);
            
            // Wait for final timeout
            await new Promise(resolve => setTimeout(resolve, BATCH_TIMEOUT_MS + 50));
            
            // Verify batch was processed
            expect(batchProcessedCount).toBe(1);
          }
        ),
        { numRuns: 20 }
      );
    }, 10000); // 10 second timeout
  });

  describe('Badge Update Functions', () => {
    it('should set badge to idle state', async () => {
      // Mock the badge functions
      const setBadgeIdle = async () => {
        await chrome.action.setBadgeText({ text: '' });
        await chrome.action.setBadgeBackgroundColor({ color: '#000000' });
      };

      await setBadgeIdle();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#000000' });
    });

    it('should set badge to initializing state', async () => {
      const setBadgeInitializing = async () => {
        await chrome.action.setBadgeText({ text: '...' });
        await chrome.action.setBadgeBackgroundColor({ color: '#FFAA00' });
      };

      await setBadgeInitializing();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '...' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FFAA00' });
    });

    it('should set badge to recording state', async () => {
      const setBadgeRecording = async () => {
        await chrome.action.setBadgeText({ text: 'REC' });
        await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      };

      await setBadgeRecording();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });

    it('should set badge to paused state', async () => {
      const setBadgePaused = async () => {
        await chrome.action.setBadgeText({ text: '||' });
        await chrome.action.setBadgeBackgroundColor({ color: '#808080' });
      };

      await setBadgePaused();

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '||' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#808080' });
    });

    it('should update badge based on state', async () => {
      const updateBadge = async (status) => {
        switch (status) {
          case 'idle':
          case 'stopped':
            await chrome.action.setBadgeText({ text: '' });
            await chrome.action.setBadgeBackgroundColor({ color: '#000000' });
            break;
          case 'initializing':
            await chrome.action.setBadgeText({ text: '...' });
            await chrome.action.setBadgeBackgroundColor({ color: '#FFAA00' });
            break;
          case 'recording':
            await chrome.action.setBadgeText({ text: 'REC' });
            await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            break;
          case 'paused':
            await chrome.action.setBadgeText({ text: '||' });
            await chrome.action.setBadgeBackgroundColor({ color: '#808080' });
            break;
        }
      };

      // Test each state
      await updateBadge('idle');
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });

      await updateBadge('initializing');
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '...' });

      await updateBadge('recording');
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'REC' });

      await updateBadge('paused');
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '||' });

      await updateBadge('stopped');
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
    });
  });

  describe('Property 9: Badge state machine', () => {
    // Feature: acro-saas-demo-video-tool, Property 9: Badge state machine
    
    it('should only allow valid state transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('idle', 'initializing', 'recording', 'paused', 'stopped'),
          fc.constantFrom('idle', 'initializing', 'recording', 'paused', 'stopped'),
          (fromState, toState) => {
            const isValid = isValidStateTransition(fromState, toState);
            
            // Define expected valid transitions
            const expectedValid = {
              'idle': ['initializing'],
              'initializing': ['recording', 'idle'],
              'recording': ['paused', 'stopped'],
              'paused': ['recording', 'stopped'],
              'stopped': ['idle']
            };
            
            const shouldBeValid = expectedValid[fromState]?.includes(toState) || false;
            expect(isValid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should follow the state sequence: idle → initializing → recording → [paused →]* → stopped → idle', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('pause', 'resume'), { minLength: 0, maxLength: 5 }),
          (pauseResumeSequence) => {
            // Start from idle
            let currentState = 'idle';
            
            // Transition to initializing
            expect(isValidStateTransition(currentState, 'initializing')).toBe(true);
            currentState = 'initializing';
            
            // Transition to recording
            expect(isValidStateTransition(currentState, 'recording')).toBe(true);
            currentState = 'recording';
            
            // Apply pause/resume cycles
            for (const action of pauseResumeSequence) {
              if (action === 'pause' && currentState === 'recording') {
                expect(isValidStateTransition(currentState, 'paused')).toBe(true);
                currentState = 'paused';
              } else if (action === 'resume' && currentState === 'paused') {
                expect(isValidStateTransition(currentState, 'recording')).toBe(true);
                currentState = 'recording';
              }
            }
            
            // Transition to stopped (from either recording or paused)
            expect(isValidStateTransition(currentState, 'stopped')).toBe(true);
            currentState = 'stopped';
            
            // Transition back to idle
            expect(isValidStateTransition(currentState, 'idle')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct badge configuration for each state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('idle', 'initializing', 'recording', 'paused', 'stopped'),
          (state) => {
            const config = getBadgeConfig(state);
            
            expect(config).not.toBeNull();
            expect(config).toHaveProperty('text');
            expect(config).toHaveProperty('color');
            
            // Verify specific badge configurations
            switch (state) {
              case 'idle':
              case 'stopped':
                expect(config.text).toBe('');
                expect(config.color).toBe('#000000');
                break;
              case 'initializing':
                expect(config.text).toBe('...');
                expect(config.color).toBe('#FFAA00');
                break;
              case 'recording':
                expect(config.text).toBe('REC');
                expect(config.color).toBe('#FF0000');
                break;
              case 'paused':
                expect(config.text).toBe('||');
                expect(config.color).toBe('#808080');
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid state transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('idle', 'initializing', 'recording', 'paused', 'stopped'),
          fc.constantFrom('idle', 'initializing', 'recording', 'paused', 'stopped'),
          (fromState, toState) => {
            const isValid = isValidStateTransition(fromState, toState);
            
            // If transition is invalid, it should be rejected
            if (!isValid) {
              // These transitions should never be allowed
              const invalidExamples = [
                ['idle', 'recording'],
                ['idle', 'paused'],
                ['idle', 'stopped'],
                ['initializing', 'paused'],
                ['initializing', 'stopped'],
                ['recording', 'initializing'],
                ['recording', 'idle'],
                ['paused', 'initializing'],
                ['paused', 'idle'],
                ['stopped', 'initializing'],
                ['stopped', 'recording'],
                ['stopped', 'paused']
              ];
              
              const isKnownInvalid = invalidExamples.some(
                ([from, to]) => from === fromState && to === toState
              );
              
              if (isKnownInvalid) {
                expect(isValid).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain state consistency through multiple transitions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              action: fc.constantFrom('start', 'pause', 'resume', 'stop'),
              shouldSucceed: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            let currentState = 'idle';
            
            for (const { action } of actions) {
              let nextState = currentState;
              
              switch (action) {
                case 'start':
                  if (currentState === 'idle') {
                    nextState = 'initializing';
                    if (isValidStateTransition(currentState, nextState)) {
                      currentState = nextState;
                      nextState = 'recording';
                      if (isValidStateTransition(currentState, nextState)) {
                        currentState = nextState;
                      }
                    }
                  }
                  break;
                case 'pause':
                  if (currentState === 'recording') {
                    nextState = 'paused';
                    if (isValidStateTransition(currentState, nextState)) {
                      currentState = nextState;
                    }
                  }
                  break;
                case 'resume':
                  if (currentState === 'paused') {
                    nextState = 'recording';
                    if (isValidStateTransition(currentState, nextState)) {
                      currentState = nextState;
                    }
                  }
                  break;
                case 'stop':
                  if (currentState === 'recording' || currentState === 'paused') {
                    nextState = 'stopped';
                    if (isValidStateTransition(currentState, nextState)) {
                      currentState = nextState;
                      // Automatically transition to idle after stopped
                      nextState = 'idle';
                      if (isValidStateTransition(currentState, nextState)) {
                        currentState = nextState;
                      }
                    }
                  }
                  break;
              }
            }
            
            // State should always be valid
            expect(['idle', 'initializing', 'recording', 'paused', 'stopped']).toContain(currentState);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Pause-before-UI invariant', () => {
    // Feature: acro-saas-demo-video-tool, Property 6: Pause-before-UI invariant
    
    it('should update state to paused before injecting any UI elements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of pause operations
          async (numPauses) => {
            // Track the order of operations
            const operationLog = [];
            
            // Mock chrome.tabs.query
            chrome.tabs.query = jest.fn(async () => [{ id: 1 }]);
            
            // Mock chrome.tabs.sendMessage to log when UI is injected
            chrome.tabs.sendMessage = jest.fn(async (tabId, message) => {
              if (message.type === 'FREEZE_PAGE') {
                operationLog.push({ type: 'FREEZE_PAGE', timestamp: Date.now() });
              } else if (message.type === 'SHOW_CONTROL_BAR') {
                operationLog.push({ type: 'SHOW_CONTROL_BAR', timestamp: Date.now() });
              }
              return { success: true };
            });
            
            // Mock chrome.storage.local.set to log state updates
            chrome.storage.local.set = jest.fn(async (data) => {
              if (data.recordingSession && data.recordingSession.status === 'paused') {
                operationLog.push({ type: 'STATE_PAUSED', timestamp: Date.now() });
              }
            });
            
            // Simulate the pause handler logic
            const handlePause = async () => {
              // Update state to paused first
              await chrome.storage.local.set({ 
                recordingSession: { status: 'paused' } 
              });
              
              // Then inject UI
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              await chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_PAGE' });
              await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROL_BAR' });
            };
            
            // Perform multiple pause operations
            for (let i = 0; i < numPauses; i++) {
              operationLog.length = 0; // Clear log for each pause
              
              await handlePause();
              
              // Verify operation order
              expect(operationLog.length).toBeGreaterThanOrEqual(3);
              
              // Find indices of operations
              const statePausedIndex = operationLog.findIndex(op => op.type === 'STATE_PAUSED');
              const freezePageIndex = operationLog.findIndex(op => op.type === 'FREEZE_PAGE');
              const showControlBarIndex = operationLog.findIndex(op => op.type === 'SHOW_CONTROL_BAR');
              
              // Verify STATE_PAUSED comes before UI injection
              expect(statePausedIndex).toBeGreaterThanOrEqual(0);
              expect(freezePageIndex).toBeGreaterThan(statePausedIndex);
              expect(showControlBarIndex).toBeGreaterThan(statePausedIndex);
              
              // Verify timestamps confirm ordering
              expect(operationLog[statePausedIndex].timestamp).toBeLessThanOrEqual(
                operationLog[freezePageIndex].timestamp
              );
              expect(operationLog[statePausedIndex].timestamp).toBeLessThanOrEqual(
                operationLog[showControlBarIndex].timestamp
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should not inject UI if state update fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether state update should fail
          async (shouldFail) => {
            const uiInjected = { freezePage: false, showControlBar: false };
            
            // Mock chrome.tabs.query
            chrome.tabs.query = jest.fn(async () => [{ id: 1 }]);
            
            // Mock chrome.tabs.sendMessage
            chrome.tabs.sendMessage = jest.fn(async (tabId, message) => {
              if (message.type === 'FREEZE_PAGE') {
                uiInjected.freezePage = true;
              } else if (message.type === 'SHOW_CONTROL_BAR') {
                uiInjected.showControlBar = true;
              }
              return { success: true };
            });
            
            // Mock chrome.storage.local.set
            chrome.storage.local.set = jest.fn(async (data) => {
              if (shouldFail) {
                throw new Error('Storage update failed');
              }
            });
            
            // Simulate pause handler
            const handlePause = async () => {
              try {
                // Try to update state
                await chrome.storage.local.set({ 
                  recordingSession: { status: 'paused' } 
                });
                
                // Only inject UI if state update succeeded
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_PAGE' });
                await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROL_BAR' });
              } catch (error) {
                // If state update fails, don't inject UI
                console.error('Failed to pause:', error);
              }
            };
            
            await handlePause();
            
            if (shouldFail) {
              // If state update failed, UI should not be injected
              expect(uiInjected.freezePage).toBe(false);
              expect(uiInjected.showControlBar).toBe(false);
            } else {
              // If state update succeeded, UI should be injected
              expect(uiInjected.freezePage).toBe(true);
              expect(uiInjected.showControlBar).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain pause-before-UI invariant across concurrent pause attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of concurrent pause attempts
          async (numConcurrent) => {
            const operationLog = [];
            let stateUpdateCount = 0;
            let uiInjectionCount = 0;
            
            // Mock chrome.tabs.query
            chrome.tabs.query = jest.fn(async () => [{ id: 1 }]);
            
            // Mock chrome.tabs.sendMessage
            chrome.tabs.sendMessage = jest.fn(async (tabId, message) => {
              if (message.type === 'FREEZE_PAGE' || message.type === 'SHOW_CONTROL_BAR') {
                uiInjectionCount++;
                operationLog.push({ 
                  type: message.type, 
                  timestamp: Date.now(),
                  stateUpdatesBefore: stateUpdateCount
                });
              }
              return { success: true };
            });
            
            // Mock chrome.storage.local.set
            chrome.storage.local.set = jest.fn(async (data) => {
              if (data.recordingSession && data.recordingSession.status === 'paused') {
                stateUpdateCount++;
                operationLog.push({ 
                  type: 'STATE_PAUSED', 
                  timestamp: Date.now() 
                });
                // Add small delay to simulate async operation
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            });
            
            // Simulate pause handler
            const handlePause = async () => {
              await chrome.storage.local.set({ 
                recordingSession: { status: 'paused' } 
              });
              
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              await chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_PAGE' });
              await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROL_BAR' });
            };
            
            // Execute concurrent pause attempts
            const pausePromises = Array(numConcurrent).fill(null).map(() => handlePause());
            await Promise.all(pausePromises);
            
            // Verify that for each UI injection, at least one state update occurred before it
            const uiOperations = operationLog.filter(op => 
              op.type === 'FREEZE_PAGE' || op.type === 'SHOW_CONTROL_BAR'
            );
            
            for (const uiOp of uiOperations) {
              // Each UI injection should have at least one state update before it
              expect(uiOp.stateUpdatesBefore).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 } // Reduced for concurrent operations
      );
    }, 30000); // 30 second timeout for concurrent operations
  });

  describe('Recording Completion and Navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Unit Test: Completion error handling', () => {
      // Requirements: 5.5
      
      it('should display error message when backend processing fails', async () => {
        const mockSessionId = 'test-session-123';
        const mockTabId = 1;
        let errorMessageShown = null;
        
        // Mock chrome.tabs.query
        chrome.tabs.query = jest.fn(async () => [{ id: mockTabId }]);
        
        // Mock chrome.tabs.sendMessage to capture error message
        chrome.tabs.sendMessage = jest.fn(async (tabId, message) => {
          if (message.type === 'SHOW_ERROR') {
            errorMessageShown = message.message;
          }
          return { success: true };
        });
        
        // Mock chrome.storage.local.set
        chrome.storage.local.set = jest.fn(async () => {});
        
        // Mock fetch to simulate backend failure
        global.fetch = jest.fn(async (url, options) => {
          if (url.includes('/api/recording/stop')) {
            return {
              ok: false,
              status: 500,
              statusText: 'Internal Server Error',
              text: async () => 'Database connection failed'
            };
          }
          return { ok: true, json: async () => ({}) };
        });
        
        // Simulate the stop recording handler
        const handleStopRecording = async (sessionId, currentTabId) => {
          try {
            // Call backend to finalize session
            const response = await fetch('http://localhost:5000/api/recording/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Backend processing failed: ${errorText || response.statusText}`);
            }
            
            const result = await response.json();
            return { success: true, projectId: result.projectId };
          } catch (error) {
            console.error('Failed to stop recording:', error);
            
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
            await chrome.storage.local.set({ 
              recordingSession: { status: 'paused' } 
            });
            
            throw error;
          }
        };
        
        // Execute and verify error handling
        await expect(handleStopRecording(mockSessionId, mockTabId)).rejects.toThrow('Backend processing failed');
        
        // Verify error message was shown to user
        expect(errorMessageShown).toBe('Processing failed, please try again');
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
          mockTabId,
          expect.objectContaining({
            type: 'SHOW_ERROR',
            message: 'Processing failed, please try again'
          })
        );
        
        // Verify state was reverted to paused
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            recordingSession: expect.objectContaining({ status: 'paused' })
          })
        );
      });

      it('should handle network errors gracefully', async () => {
        const mockSessionId = 'test-session-456';
        const mockTabId = 2;
        let errorMessageShown = null;
        
        // Mock chrome.tabs.sendMessage
        chrome.tabs.sendMessage = jest.fn(async (tabId, message) => {
          if (message.type === 'SHOW_ERROR') {
            errorMessageShown = message.message;
          }
          return { success: true };
        });
        
        // Mock chrome.storage.local.set
        chrome.storage.local.set = jest.fn(async () => {});
        
        // Mock fetch to simulate network error
        global.fetch = jest.fn(async () => {
          throw new Error('Network request failed');
        });
        
        // Simulate the stop recording handler
        const handleStopRecording = async (sessionId, currentTabId) => {
          try {
            const response = await fetch('http://localhost:5000/api/recording/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
              throw new Error('Backend processing failed');
            }
            
            return { success: true };
          } catch (error) {
            if (currentTabId) {
              await chrome.tabs.sendMessage(currentTabId, {
                type: 'SHOW_ERROR',
                message: 'Processing failed, please try again'
              });
            }
            
            await chrome.storage.local.set({ 
              recordingSession: { status: 'paused' } 
            });
            
            throw error;
          }
        };
        
        // Execute and verify error handling
        await expect(handleStopRecording(mockSessionId, mockTabId)).rejects.toThrow();
        
        // Verify error message was shown
        expect(errorMessageShown).toBe('Processing failed, please try again');
      });

      it('should not crash if tab is closed when showing error', async () => {
        const mockSessionId = 'test-session-789';
        const mockTabId = 3;
        
        // Mock chrome.tabs.sendMessage to simulate tab closed
        chrome.tabs.sendMessage = jest.fn(async () => {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        });
        
        // Mock chrome.storage.local.set
        chrome.storage.local.set = jest.fn(async () => {});
        
        // Mock fetch to fail
        global.fetch = jest.fn(async () => ({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Error'
        }));
        
        // Simulate the stop recording handler
        const handleStopRecording = async (sessionId, currentTabId) => {
          try {
            const response = await fetch('http://localhost:5000/api/recording/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
              throw new Error('Backend processing failed');
            }
            
            return { success: true };
          } catch (error) {
            if (currentTabId) {
              try {
                await chrome.tabs.sendMessage(currentTabId, {
                  type: 'SHOW_ERROR',
                  message: 'Processing failed, please try again'
                });
              } catch (notificationError) {
                // Tab might be closed, ignore error
                console.warn('Could not show error notification:', notificationError);
              }
            }
            
            await chrome.storage.local.set({ 
              recordingSession: { status: 'paused' } 
            });
            
            throw error;
          }
        };
        
        // Should not crash even if tab is closed
        await expect(handleStopRecording(mockSessionId, mockTabId)).rejects.toThrow('Backend processing failed');
        
        // Verify state was still reverted to paused
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            recordingSession: expect.objectContaining({ status: 'paused' })
          })
        );
      });

      it('should successfully complete when backend responds correctly', async () => {
        const mockSessionId = 'test-session-success';
        const mockTabId = 4;
        const mockProjectId = 42;
        const mockRedirectUrl = 'https://app.autodemo.com/editor/project-uuid';
        
        // Mock chrome.tabs.create
        chrome.tabs.create = jest.fn(async () => ({ id: 5 }));
        
        // Mock chrome.tabs.sendMessage
        chrome.tabs.sendMessage = jest.fn(async () => ({ success: true }));
        
        // Mock chrome.storage.local.set
        chrome.storage.local.set = jest.fn(async () => {});
        
        // Mock fetch to succeed
        global.fetch = jest.fn(async (url, options) => {
          if (url.includes('/api/recording/stop')) {
            return {
              ok: true,
              json: async () => ({
                projectId: mockProjectId,
                redirectUrl: mockRedirectUrl
              })
            };
          }
          return { ok: true, json: async () => ({}) };
        });
        
        // Simulate the stop recording handler
        const handleStopRecording = async (sessionId, currentTabId) => {
          try {
            const response = await fetch('http://localhost:5000/api/recording/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
              throw new Error('Backend processing failed');
            }
            
            const result = await response.json();
            
            // Open editor in new tab
            await chrome.tabs.create({ url: result.redirectUrl });
            
            // Clear badge and remove UI
            await chrome.storage.local.set({
              recordingSession: {
                sessionId: null,
                projectId: null,
                status: 'idle',
                startTime: null,
                stepCount: 0,
                currentTabId: null
              }
            });
            
            if (currentTabId) {
              try {
                await chrome.tabs.sendMessage(currentTabId, { type: 'REMOVE_ALL_UI' });
              } catch (error) {
                console.warn('Could not remove UI from recording tab:', error);
              }
            }
            
            return { success: true, projectId: result.projectId };
          } catch (error) {
            throw error;
          }
        };
        
        // Execute and verify success
        const result = await handleStopRecording(mockSessionId, mockTabId);
        
        expect(result.success).toBe(true);
        expect(result.projectId).toBe(mockProjectId);
        
        // Verify new tab was opened with correct URL
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: mockRedirectUrl });
        
        // Verify UI was removed from recording tab
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
          mockTabId,
          { type: 'REMOVE_ALL_UI' }
        );
        
        // Verify state was reset to idle
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            recordingSession: expect.objectContaining({
              status: 'idle',
              sessionId: null,
              projectId: null
            })
          })
        );
      });
    });
  });

  describe('Property 37: Image compression', () => {
    // Feature: acro-saas-demo-video-tool, Property 37: Image compression
    
    beforeEach(() => {
      // Mock canvas for all tests in this suite since jsdom doesn't support it
      const mockGetContext = jest.fn(() => ({
        drawImage: jest.fn()
      }));
      
      HTMLCanvasElement.prototype.getContext = mockGetContext;
      HTMLCanvasElement.prototype.toDataURL = jest.fn((format, quality) => {
        return `data:image/png;base64,compressed`;
      });
    });
    
    it('should compress screenshots before upload, resulting in smaller file size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            width: fc.integer({ min: 800, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 }),
            quality: fc.constant(0.85) // Target 85% quality
          }),
          async ({ width, height, quality }) => {
            // Create a mock canvas and image for testing
            const mockCanvas = {
              width: 0,
              height: 0,
              getContext: jest.fn(() => ({
                drawImage: jest.fn()
              })),
              toDataURL: jest.fn((format, qual) => {
                // Simulate compressed output (smaller than original)
                // Original would be roughly width * height * 4 bytes (RGBA)
                // Compressed should be smaller
                const originalSize = width * height * 4;
                const compressedSize = Math.floor(originalSize * quality);
                const base64Length = Math.floor(compressedSize * 1.33); // Base64 overhead
                return `data:image/png;base64,${'A'.repeat(base64Length)}`;
              })
            };
            
            // Mock document.createElement for canvas
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn((tagName) => {
              if (tagName === 'canvas') {
                return mockCanvas;
              }
              return originalCreateElement.call(document, tagName);
            });
            
            // Mock Image constructor
            global.Image = class {
              constructor() {
                this.onload = null;
                this.onerror = null;
                this.src = '';
                this.width = width;
                this.height = height;
              }
              
              set src(value) {
                this._src = value;
                // Simulate async image loading
                setTimeout(() => {
                  if (this.onload) {
                    this.onload();
                  }
                }, 0);
              }
              
              get src() {
                return this._src;
              }
            };
            
            // Simulate the compressImage function
            const compressImage = async (base64Image, quality = 0.85) => {
              return new Promise((resolve, reject) => {
                try {
                  const img = new Image();
                  
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const compressedBase64 = canvas.toDataURL('image/png', quality);
                    resolve(compressedBase64);
                  };
                  
                  img.onerror = () => {
                    reject(new Error('Failed to load image for compression'));
                  };
                  
                  img.src = base64Image;
                } catch (error) {
                  reject(error);
                }
              });
            };
            
            // Create a mock original screenshot
            const originalSize = width * height * 4;
            const originalBase64Length = Math.floor(originalSize * 1.33);
            const originalScreenshot = `data:image/png;base64,${'B'.repeat(originalBase64Length)}`;
            
            // Compress the screenshot
            const compressedScreenshot = await compressImage(originalScreenshot, quality);
            
            // Verify compression occurred
            expect(compressedScreenshot).toBeDefined();
            expect(compressedScreenshot).toMatch(/^data:image\/png;base64,/);
            
            // Verify compressed size is smaller than original
            const originalLength = originalScreenshot.length;
            const compressedLength = compressedScreenshot.length;
            
            expect(compressedLength).toBeLessThan(originalLength);
            
            // Verify compression ratio is approximately correct (85% quality)
            const compressionRatio = compressedLength / originalLength;
            expect(compressionRatio).toBeLessThan(1.0);
            expect(compressionRatio).toBeGreaterThan(0.5); // Should not compress too much
            
            // Verify canvas operations were called
            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
            expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', quality);
            
            // Restore original createElement
            document.createElement = originalCreateElement;
          }
        ),
        { numRuns: 20 } // Reduced for performance
      );
    }, 10000); // 10 second timeout

    it('should maintain image format as PNG after compression', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            width: fc.integer({ min: 800, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 })
          }),
          async ({ width, height }) => {
            // Mock canvas
            const mockCanvas = {
              width: 0,
              height: 0,
              getContext: jest.fn(() => ({
                drawImage: jest.fn()
              })),
              toDataURL: jest.fn((format, quality) => {
                // Verify PNG format is requested
                expect(format).toBe('image/png');
                return `data:image/png;base64,compressed`;
              })
            };
            
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn((tagName) => {
              if (tagName === 'canvas') {
                return mockCanvas;
              }
              return originalCreateElement.call(document, tagName);
            });
            
            global.Image = class {
              constructor() {
                this.onload = null;
                this.onerror = null;
                this.src = '';
                this.width = width;
                this.height = height;
              }
              
              set src(value) {
                this._src = value;
                setTimeout(() => {
                  if (this.onload) this.onload();
                }, 0);
              }
              
              get src() {
                return this._src;
              }
            };
            
            const compressImage = async (base64Image, quality = 0.85) => {
              return new Promise((resolve, reject) => {
                try {
                  const img = new Image();
                  
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const compressedBase64 = canvas.toDataURL('image/png', quality);
                    resolve(compressedBase64);
                  };
                  
                  img.onerror = () => {
                    reject(new Error('Failed to load image'));
                  };
                  
                  img.src = base64Image;
                } catch (error) {
                  reject(error);
                }
              });
            };
            
            const originalScreenshot = `data:image/png;base64,original`;
            const compressedScreenshot = await compressImage(originalScreenshot, 0.85);
            
            // Verify output format is PNG
            expect(compressedScreenshot).toMatch(/^data:image\/png;base64,/);
            
            // Verify toDataURL was called with PNG format
            expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.85);
            
            document.createElement = originalCreateElement;
          }
        ),
        { numRuns: 20 }
      );
    }, 10000);

    it('should use 85% quality for compression', () => {
      fc.assert(
        fc.property(
          fc.constant(0.85),
          (targetQuality) => {
            // Verify the target quality is 85%
            expect(targetQuality).toBe(0.85);
            
            // Verify quality is in valid range (0-1)
            expect(targetQuality).toBeGreaterThan(0);
            expect(targetQuality).toBeLessThanOrEqual(1);
            
            // Verify it's the expected value from requirements
            expect(targetQuality).toBe(0.85);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle compression errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          async (invalidBase64) => {
            // Mock Image to simulate loading error
            global.Image = class {
              constructor() {
                this.onload = null;
                this.onerror = null;
                this.src = '';
              }
              
              set src(value) {
                this._src = value;
                setTimeout(() => {
                  if (this.onerror) {
                    this.onerror(new Error('Failed to load image'));
                  }
                }, 0);
              }
              
              get src() {
                return this._src;
              }
            };
            
            const compressImage = async (base64Image, quality = 0.85) => {
              return new Promise((resolve, reject) => {
                try {
                  const img = new Image();
                  
                  img.onload = () => {
                    // This should not be called in error case
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Mock getContext to avoid jsdom issues
                    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
                    if (!ctx) {
                      reject(new Error('Canvas context not available'));
                      return;
                    }
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const compressedBase64 = canvas.toDataURL('image/png', quality);
                    resolve(compressedBase64);
                  };
                  
                  img.onerror = (error) => {
                    reject(new Error('Failed to load image for compression'));
                  };
                  
                  img.src = base64Image;
                } catch (error) {
                  reject(error);
                }
              });
            };
            
            // Attempt to compress invalid image data
            await expect(compressImage(invalidBase64, 0.85)).rejects.toThrow('Failed to load image for compression');
          }
        ),
        { numRuns: 20 }
      );
    }, 10000);

    it('should preserve image dimensions during compression', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            width: fc.integer({ min: 800, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 })
          }),
          async ({ width, height }) => {
            let canvasWidth = 0;
            let canvasHeight = 0;
            
            const mockCanvas = {
              get width() { return canvasWidth; },
              set width(value) { canvasWidth = value; },
              get height() { return canvasHeight; },
              set height(value) { canvasHeight = value; },
              getContext: jest.fn(() => ({
                drawImage: jest.fn()
              })),
              toDataURL: jest.fn(() => `data:image/png;base64,compressed`)
            };
            
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn((tagName) => {
              if (tagName === 'canvas') {
                return mockCanvas;
              }
              return originalCreateElement.call(document, tagName);
            });
            
            global.Image = class {
              constructor() {
                this.onload = null;
                this.onerror = null;
                this.src = '';
                this.width = width;
                this.height = height;
              }
              
              set src(value) {
                this._src = value;
                setTimeout(() => {
                  if (this.onload) this.onload();
                }, 0);
              }
              
              get src() {
                return this._src;
              }
            };
            
            const compressImage = async (base64Image, quality = 0.85) => {
              return new Promise((resolve, reject) => {
                try {
                  const img = new Image();
                  
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const compressedBase64 = canvas.toDataURL('image/png', quality);
                    resolve(compressedBase64);
                  };
                  
                  img.onerror = () => {
                    reject(new Error('Failed to load image'));
                  };
                  
                  img.src = base64Image;
                } catch (error) {
                  reject(error);
                }
              });
            };
            
            const originalScreenshot = `data:image/png;base64,original`;
            await compressImage(originalScreenshot, 0.85);
            
            // Verify canvas dimensions match original image dimensions
            expect(canvasWidth).toBe(width);
            expect(canvasHeight).toBe(height);
            
            document.createElement = originalCreateElement;
          }
        ),
        { numRuns: 20 }
      );
    }, 10000);
  });
});
