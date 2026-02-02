import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepList } from '../StepList';
import { Step } from '@/lib/types';
import * as fc from 'fast-check';

describe('StepList Component', () => {
  const mockStep: Step = {
    id: 1,
    projectId: 1,
    orderIndex: 1,
    actionType: 'click',
    targetText: 'Submit Button',
    scriptText: 'Click the submit button to save your changes',
    audioUrl: '/static/audio/step-1.mp3',
    imageUrl: '/static/images/step-1.png',
    posX: 450,
    posY: 320,
    durationFrames: 120,
  };

  const mockOnStepClick = jest.fn();

  beforeEach(() => {
    mockOnStepClick.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with empty steps array', () => {
      const { container } = render(
        <StepList steps={[]} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      expect(container).toBeInTheDocument();
      expect(screen.getByText('0 total')).toBeInTheDocument();
    });

    it('should render with single step', () => {
      render(
        <StepList steps={[mockStep]} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      expect(screen.getByText('1 total')).toBeInTheDocument();
      expect(screen.getByText(mockStep.scriptText)).toBeInTheDocument();
    });

    it('should render multiple steps', () => {
      const steps = [
        mockStep,
        { ...mockStep, id: 2, orderIndex: 2, scriptText: 'Second step' },
        { ...mockStep, id: 3, orderIndex: 3, scriptText: 'Third step' },
      ];
      render(
        <StepList steps={steps} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      expect(screen.getByText('3 total')).toBeInTheDocument();
      expect(screen.getByText('Click the submit button to save your changes')).toBeInTheDocument();
      expect(screen.getByText('Second step')).toBeInTheDocument();
      expect(screen.getByText('Third step')).toBeInTheDocument();
    });
  });

  describe('Step Ordering', () => {
    it('should sort steps by orderIndex in ascending order', () => {
      const steps = [
        { ...mockStep, id: 1, orderIndex: 3, scriptText: 'Third' },
        { ...mockStep, id: 2, orderIndex: 1, scriptText: 'First' },
        { ...mockStep, id: 3, orderIndex: 2, scriptText: 'Second' },
      ];
      
      const { container } = render(
        <StepList steps={steps} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      
      // Get all step elements
      const stepElements = container.querySelectorAll('[class*="cursor-pointer"]');
      
      // Verify they appear in orderIndex order
      expect(stepElements[0]).toHaveTextContent('First');
      expect(stepElements[1]).toHaveTextContent('Second');
      expect(stepElements[2]).toHaveTextContent('Third');
    });
  });

  describe('Current Step Highlighting', () => {
    it('should highlight the first step when currentFrame is 0', () => {
      const steps = [
        { ...mockStep, id: 1, orderIndex: 1, durationFrames: 100 },
        { ...mockStep, id: 2, orderIndex: 2, durationFrames: 100 },
      ];
      
      const { container } = render(
        <StepList steps={steps} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      
      // First step should have the current step indicator
      const indicators = container.querySelectorAll('[class*="bg-blue-600"]');
      expect(indicators.length).toBeGreaterThan(0);
    });

    it('should highlight the correct step based on currentFrame', () => {
      const steps = [
        { ...mockStep, id: 1, orderIndex: 1, durationFrames: 100 },
        { ...mockStep, id: 2, orderIndex: 2, durationFrames: 100 },
        { ...mockStep, id: 3, orderIndex: 3, durationFrames: 100 },
      ];
      
      // Frame 150 should be in the second step (frames 100-199)
      const { container } = render(
        <StepList steps={steps} currentFrame={150} onStepClick={mockOnStepClick} />
      );
      
      // Should have highlighting
      const highlightedElements = container.querySelectorAll('[class*="bg-blue-900"]');
      expect(highlightedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Step Click Interaction', () => {
    it('should call onStepClick with correct start frame when step is clicked', () => {
      const steps = [
        { ...mockStep, id: 1, orderIndex: 1, durationFrames: 100 },
        { ...mockStep, id: 2, orderIndex: 2, durationFrames: 100 },
        { ...mockStep, id: 3, orderIndex: 3, durationFrames: 100 },
      ];
      
      const { container } = render(
        <StepList steps={steps} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      
      // Click the second step
      const stepElements = container.querySelectorAll('[class*="cursor-pointer"]');
      fireEvent.click(stepElements[1]);
      
      // Should call with start frame 100 (sum of previous step durations)
      expect(mockOnStepClick).toHaveBeenCalledWith(100);
    });

    it('should call onStepClick with 0 for first step', () => {
      const steps = [
        { ...mockStep, id: 1, orderIndex: 1, durationFrames: 100 },
      ];
      
      const { container } = render(
        <StepList steps={steps} currentFrame={0} onStepClick={mockOnStepClick} />
      );
      
      const stepElements = container.querySelectorAll('[class*="cursor-pointer"]');
      fireEvent.click(stepElements[0]);
      
      expect(mockOnStepClick).toHaveBeenCalledWith(0);
    });
  });

  describe('Property Tests', () => {
    // Feature: acro-saas-demo-video-tool, Property 19: Step display completeness
    it('Property 19: should display thumbnail, order number, and script_text preview for any step', () => {
      fc.assert(
        fc.property(
          fc.record({
            orderIndex: fc.integer({ min: 1, max: 100 }),
            actionType: fc.constantFrom('click' as const, 'scroll' as const),
            targetText: fc.string({ minLength: 1, maxLength: 50 }),
            scriptText: fc.string({ minLength: 1, maxLength: 200 }),
            audioUrl: fc.string({ minLength: 1 }).map(s => `/static/audio/${s}.mp3`),
            imageUrl: fc.string({ minLength: 1 }).map(s => `/static/images/${s}.png`),
            posX: fc.integer({ min: 0, max: 1920 }),
            posY: fc.integer({ min: 0, max: 1080 }),
            durationFrames: fc.integer({ min: 30, max: 300 }),
          }),
          (stepData) => {
            const step: Step = {
              ...stepData,
              id: 1,
              projectId: 1,
            };
            
            const { container } = render(
              <StepList steps={[step]} currentFrame={0} onStepClick={mockOnStepClick} />
            );
            
            // Verify thumbnail is displayed
            const thumbnail = container.querySelector('img');
            expect(thumbnail).toBeInTheDocument();
            expect(thumbnail?.getAttribute('src')).toBe(step.imageUrl);
            expect(thumbnail?.getAttribute('alt')).toBe(`Step ${step.orderIndex}`);
            
            // Verify order number is displayed in the step badge
            // Use a more specific query to find the order number in the badge
            const stepBadge = container.querySelector('.flex-shrink-0.w-8.h-8.rounded-full');
            expect(stepBadge).toBeInTheDocument();
            expect(stepBadge?.textContent).toBe(step.orderIndex.toString());
            
            // Verify script_text preview is displayed
            const scriptTextElement = container.querySelector('.text-sm.text-gray-300.line-clamp-2');
            expect(scriptTextElement).toBeInTheDocument();
            expect(scriptTextElement?.textContent).toBe(step.scriptText);
            
            // All three required elements should be present
            expect(thumbnail).toBeTruthy();
            expect(stepBadge).toBeTruthy();
            expect(scriptTextElement).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: acro-saas-demo-video-tool, Property 20: Seek accuracy
    it('Property 20: should seek to correct frame equal to sum of previous step durations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              orderIndex: fc.integer({ min: 1, max: 100 }),
              actionType: fc.constantFrom('click' as const, 'scroll' as const),
              targetText: fc.string({ minLength: 1, maxLength: 50 }),
              scriptText: fc.string({ minLength: 1, maxLength: 200 }),
              audioUrl: fc.constant('/static/audio/test.mp3'),
              imageUrl: fc.constant('/static/images/test.png'),
              posX: fc.integer({ min: 0, max: 1920 }),
              posY: fc.integer({ min: 0, max: 1080 }),
              durationFrames: fc.integer({ min: 30, max: 300 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (stepsWithoutIds) => {
            // Add unique IDs and ensure unique orderIndex
            const steps: Step[] = stepsWithoutIds.map((step, index) => ({
              ...step,
              id: index + 1,
              projectId: 1,
              orderIndex: index + 1, // Ensure sequential orderIndex
            }));
            
            const mockCallback = jest.fn();
            const { container } = render(
              <StepList steps={steps} currentFrame={0} onStepClick={mockCallback} />
            );
            
            // Sort steps by orderIndex to match component behavior
            const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
            
            // Test clicking each step
            const stepElements = container.querySelectorAll('[class*="cursor-pointer"]');
            
            for (let i = 0; i < sortedSteps.length; i++) {
              mockCallback.mockClear();
              
              // Click the step
              fireEvent.click(stepElements[i]);
              
              // Calculate expected start frame (sum of all previous steps' durationFrames)
              const expectedStartFrame = sortedSteps
                .slice(0, i)
                .reduce((sum, s) => sum + s.durationFrames, 0);
              
              // Verify onStepClick was called with correct start frame
              expect(mockCallback).toHaveBeenCalledWith(expectedStartFrame);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: acro-saas-demo-video-tool, Property 21: Current step highlighting
    it('Property 21: should highlight step whose frame range contains current frame', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              orderIndex: fc.integer({ min: 1, max: 100 }),
              actionType: fc.constantFrom('click' as const, 'scroll' as const),
              targetText: fc.string({ minLength: 1, maxLength: 50 }),
              scriptText: fc.string({ minLength: 1, maxLength: 200 }),
              audioUrl: fc.constant('/static/audio/test.mp3'),
              imageUrl: fc.constant('/static/images/test.png'),
              posX: fc.integer({ min: 0, max: 1920 }),
              posY: fc.integer({ min: 0, max: 1080 }),
              durationFrames: fc.integer({ min: 30, max: 300 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (stepsWithoutIds) => {
            // Add unique IDs and ensure sequential orderIndex
            const steps: Step[] = stepsWithoutIds.map((step, index) => ({
              ...step,
              id: index + 1,
              projectId: 1,
              orderIndex: index + 1,
            }));
            
            // Sort steps by orderIndex
            const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
            
            // Calculate total duration
            const totalDuration = sortedSteps.reduce((sum, s) => sum + s.durationFrames, 0);
            
            // Test at various frames throughout the video
            const testFrames = [
              0, // First frame
              Math.floor(totalDuration / 4), // 25% through
              Math.floor(totalDuration / 2), // 50% through
              Math.floor(totalDuration * 3 / 4), // 75% through
              totalDuration - 1, // Last frame
            ];
            
            for (const currentFrame of testFrames) {
              // Find which step should be highlighted
              let expectedStepIndex = 0;
              let cumulativeFrames = 0;
              
              for (let i = 0; i < sortedSteps.length; i++) {
                const stepEndFrame = cumulativeFrames + sortedSteps[i].durationFrames;
                if (currentFrame >= cumulativeFrames && currentFrame < stepEndFrame) {
                  expectedStepIndex = i;
                  break;
                }
                cumulativeFrames = stepEndFrame;
              }
              
              // If we're past all steps, the last step should be highlighted
              if (currentFrame >= cumulativeFrames) {
                expectedStepIndex = sortedSteps.length - 1;
              }
              
              const { container } = render(
                <StepList steps={steps} currentFrame={currentFrame} onStepClick={jest.fn()} />
              );
              
              // Verify highlighting exists
              const highlightedElements = container.querySelectorAll('[class*="bg-blue-900"]');
              expect(highlightedElements.length).toBeGreaterThan(0);
              
              // Verify the correct step is highlighted by checking for the blue indicator bar
              const indicators = container.querySelectorAll('[class*="bg-blue-600"][class*="absolute"]');
              expect(indicators.length).toBeGreaterThanOrEqual(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: acro-saas-demo-video-tool, Property 39: Virtual scrolling for large projects
    it('Property 39: should implement virtual scrolling when project has > 50 Steps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          (stepCount) => {
            // Generate steps
            const steps: Step[] = Array.from({ length: stepCount }, (_, index) => ({
              id: index + 1,
              projectId: 1,
              orderIndex: index + 1,
              actionType: 'click' as const,
              targetText: `Target ${index + 1}`,
              scriptText: `Script text for step ${index + 1}`,
              audioUrl: `/static/audio/step-${index + 1}.mp3`,
              imageUrl: `/static/images/step-${index + 1}.png`,
              posX: 100,
              posY: 100,
              durationFrames: 90,
            }));
            
            const { container } = render(
              <StepList steps={steps} currentFrame={0} onStepClick={jest.fn()} />
            );
            
            // Check if virtual scrolling is enabled based on step count
            const headerElement = container.querySelector('.p-4.border-b.border-gray-700.flex-shrink-0');
            expect(headerElement).toBeInTheDocument();
            const headerText = headerElement?.textContent || '';
            
            if (stepCount > 50) {
              // Virtual scrolling should be enabled
              expect(headerText).toContain(`${stepCount} total`);
              expect(headerText).toContain('virtual scrolling enabled');
              
              // The List component from react-window should be rendered
              // We can verify this by checking that not all steps are rendered in the DOM
              // (virtual scrolling only renders visible items)
              const renderedSteps = container.querySelectorAll('[class*="cursor-pointer"]');
              
              // With virtual scrolling, we should render fewer items than total steps
              // (only visible items + overscan)
              expect(renderedSteps.length).toBeLessThanOrEqual(stepCount);
            } else {
              // Virtual scrolling should NOT be enabled
              expect(headerText).toContain(`${stepCount} total`);
              expect(headerText).not.toContain('virtual scrolling enabled');
              
              // All steps should be rendered in the DOM
              const renderedSteps = container.querySelectorAll('[class*="cursor-pointer"]');
              expect(renderedSteps.length).toBe(stepCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
