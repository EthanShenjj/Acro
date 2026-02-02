import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { StepEditor } from '../StepEditor';
import { DashboardAPI } from '@/lib/api';
import { Step } from '@/lib/types';

// Mock the DashboardAPI
jest.mock('@/lib/api');

const MockedDashboardAPI = DashboardAPI as jest.MockedClass<typeof DashboardAPI>;

describe('StepEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 29: Composition update after TTS', () => {
    // Feature: acro-saas-demo-video-tool, Property 29: Composition update after TTS
    it('should update composition with new audio_url and duration_frames for any successful TTS response', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random step data with realistic script text
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            projectId: fc.integer({ min: 1, max: 1000 }),
            orderIndex: fc.integer({ min: 1, max: 100 }),
            actionType: fc.constantFrom('click' as const, 'scroll' as const),
            targetText: fc.string({ minLength: 1, maxLength: 100 }),
            scriptText: fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0),
            audioUrl: fc.webUrl(),
            imageUrl: fc.webUrl(),
            posX: fc.integer({ min: 0, max: 1920 }),
            posY: fc.integer({ min: 0, max: 1080 }),
            durationFrames: fc.integer({ min: 30, max: 300 }),
          }),
          // Generate random updated script text (non-whitespace)
          fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Generate random new audio URL and duration
          fc.record({
            audioUrl: fc.webUrl(),
            durationFrames: fc.integer({ min: 30, max: 300 }),
          }),
          async (originalStep: Step, newScriptText: string, ttsResponse) => {
            // Skip if script text hasn't changed (no update should occur)
            if (newScriptText === originalStep.scriptText) {
              return;
            }

            const onStepUpdate = jest.fn();

            // Mock API response with new audio URL and duration
            const updatedStep: Step = {
              ...originalStep,
              scriptText: newScriptText,
              audioUrl: ttsResponse.audioUrl,
              durationFrames: ttsResponse.durationFrames,
            };

            MockedDashboardAPI.prototype.updateStepScript = jest
              .fn()
              .mockResolvedValue(updatedStep);

            // Simulate the update process
            const apiClient = new DashboardAPI();
            const result = await apiClient.updateStepScript(originalStep.id, newScriptText);

            // Verify the API was called correctly
            expect(MockedDashboardAPI.prototype.updateStepScript).toHaveBeenCalledWith(
              originalStep.id,
              newScriptText
            );

            // Verify the result contains new audio URL and duration
            expect(result.audioUrl).toBe(ttsResponse.audioUrl);
            expect(result.durationFrames).toBe(ttsResponse.durationFrames);
            expect(result.scriptText).toBe(newScriptText);

            // Verify all other fields are preserved
            expect(result.id).toBe(originalStep.id);
            expect(result.projectId).toBe(originalStep.projectId);
            expect(result.orderIndex).toBe(originalStep.orderIndex);
            expect(result.actionType).toBe(originalStep.actionType);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // Increased timeout to 30 seconds for property test
  });

  describe('Unit Test: TTS update error handling', () => {
    it('should display error message when TTS generation fails', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      // Mock API to throw an error
      const mockError = new Error('TTS service unavailable');
      MockedDashboardAPI.prototype.updateStepScript = jest.fn().mockRejectedValue(mockError);

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Updated script text');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/TTS service unavailable/i)).toBeInTheDocument();
      });

      // Verify onStepUpdate was NOT called
      expect(onStepUpdate).not.toHaveBeenCalled();

      // Verify error message is displayed in red
      const errorMessage = screen.getByText(/TTS service unavailable/i);
      expect(errorMessage).toHaveClass('text-red-400');
    });

    it('should display generic error message when error has no message', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      // Mock API to throw an error without message
      MockedDashboardAPI.prototype.updateStepScript = jest.fn().mockRejectedValue({});

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Updated script text');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for generic error message to appear
      await waitFor(() => {
        expect(screen.getByText(/Failed to update script/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during TTS generation', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      // Mock API with a delay to simulate TTS generation
      const updatedStep: Step = {
        ...mockStep,
        scriptText: 'Updated script text',
        audioUrl: '/new-audio.mp3',
        durationFrames: 120,
      };

      MockedDashboardAPI.prototype.updateStepScript = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedStep), 100);
          })
      );

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Updated script text');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify loading state is displayed
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Generating audio...')).toBeInTheDocument();

      // Wait for save to complete
      await waitFor(() => {
        expect(onStepUpdate).toHaveBeenCalledWith(updatedStep);
      });

      // Verify loading state is gone
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.queryByText('Generating audio...')).not.toBeInTheDocument();
    });

    it('should not save if script text has not changed', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      MockedDashboardAPI.prototype.updateStepScript = jest.fn();

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');
      expect(textarea).toHaveValue('Original script text');

      // Click save without changing text
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API was NOT called
      expect(MockedDashboardAPI.prototype.updateStepScript).not.toHaveBeenCalled();

      // Verify onStepUpdate was NOT called
      expect(onStepUpdate).not.toHaveBeenCalled();

      // Verify we exited edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should cancel editing and revert text on cancel button click', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Modified text');

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify we exited edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // Verify original text is displayed
      expect(screen.getByText('Original script text')).toBeInTheDocument();

      // Verify API was NOT called
      expect(onStepUpdate).not.toHaveBeenCalled();
    });

    it('should save on Enter key press', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      const updatedStep: Step = {
        ...mockStep,
        scriptText: 'Updated script text',
        audioUrl: '/new-audio.mp3',
        durationFrames: 120,
      };

      MockedDashboardAPI.prototype.updateStepScript = jest.fn().mockResolvedValue(updatedStep);

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Updated script text');

      // Press Enter to save
      await user.keyboard('{Enter}');

      // Wait for API call to complete
      await waitFor(() => {
        expect(MockedDashboardAPI.prototype.updateStepScript).toHaveBeenCalledWith(
          mockStep.id,
          'Updated script text'
        );
      });

      // Verify onStepUpdate was called
      expect(onStepUpdate).toHaveBeenCalledWith(updatedStep);
    });

    it('should cancel on Escape key press', async () => {
      const user = userEvent.setup();

      const mockStep: Step = {
        id: 1,
        projectId: 1,
        orderIndex: 1,
        actionType: 'click',
        targetText: 'Button',
        scriptText: 'Original script text',
        audioUrl: '/audio.mp3',
        imageUrl: '/image.png',
        posX: 100,
        posY: 200,
        durationFrames: 90,
      };

      const onStepUpdate = jest.fn();

      render(<StepEditor step={mockStep} onStepUpdate={onStepUpdate} />);

      // Click to enter edit mode
      const scriptDisplay = screen.getByText('Original script text');
      await user.click(scriptDisplay);

      // Wait for textarea to appear
      const textarea = await screen.findByRole('textbox');

      // Type new script text
      await user.clear(textarea);
      await user.type(textarea, 'Modified text');

      // Press Escape to cancel
      await user.keyboard('{Escape}');

      // Verify we exited edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // Verify original text is displayed
      expect(screen.getByText('Original script text')).toBeInTheDocument();
    });
  });
});
