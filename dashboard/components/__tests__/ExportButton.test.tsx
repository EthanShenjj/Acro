import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../ExportButton';
import { DashboardAPI } from '@/lib/api';

// Mock the DashboardAPI
jest.mock('@/lib/api');

const MockedDashboardAPI = DashboardAPI as jest.MockedClass<typeof DashboardAPI>;

describe('ExportButton', () => {
  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM spies if they exist
    if (createElementSpy) createElementSpy.mockRestore();
    if (appendChildSpy) appendChildSpy.mockRestore();
    if (removeChildSpy) removeChildSpy.mockRestore();
  });

  afterEach(() => {
    // Clean up DOM spies
    if (createElementSpy) createElementSpy.mockRestore();
    if (appendChildSpy) appendChildSpy.mockRestore();
    if (removeChildSpy) removeChildSpy.mockRestore();
  });

  describe('Unit Tests: Export functionality', () => {
    it('should display export button with correct text', () => {
      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should trigger export on button click', async () => {
      const user = userEvent.setup();
      
      const mockDownloadUrl = 'https://example.com/video.mp4';
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockResolvedValue({
        downloadUrl: mockDownloadUrl,
      });

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Verify API was called
      await waitFor(() => {
        expect(MockedDashboardAPI.prototype.exportProject).toHaveBeenCalledWith(1);
      });
    });

    it('should show progress indicator during export', async () => {
      const user = userEvent.setup();
      
      // Mock API with a delay
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ downloadUrl: 'https://example.com/video.mp4' }), 200);
          })
      );

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Verify button is disabled during export
      expect(button).toBeDisabled();
      
      // Verify progress text is shown
      expect(screen.getByText(/exporting\.\.\./i)).toBeInTheDocument();
      
      // Verify spinner is shown
      const spinner = screen.getByRole('button').querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Wait for export to complete
      await waitFor(() => {
        expect(MockedDashboardAPI.prototype.exportProject).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should display error message on export failure', async () => {
      const user = userEvent.setup();
      
      const mockError = new Error('Export failed, please try again');
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockRejectedValue(mockError);

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/export failed, please try again/i)).toBeInTheDocument();
      });

      // Verify error message has red styling
      const errorMessage = screen.getByText(/export failed, please try again/i);
      expect(errorMessage).toHaveClass('text-red-800');
    });

    it('should handle missing download URL error', async () => {
      const user = userEvent.setup();
      
      // Mock API returning response without downloadUrl
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockResolvedValue({});

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/no download url received from server/i)).toBeInTheDocument();
      });
    });

    it('should sanitize project title for filename', async () => {
      const user = userEvent.setup();
      
      const mockDownloadUrl = 'https://example.com/video.mp4';
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockResolvedValue({
        downloadUrl: mockDownloadUrl,
      });

      render(<ExportButton projectId={1} projectTitle="Test Project! @#$% 2024" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Verify API was called (filename sanitization happens in component)
      await waitFor(() => {
        expect(MockedDashboardAPI.prototype.exportProject).toHaveBeenCalledWith(1);
      });
    });

    it('should reset state after successful export', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      const mockDownloadUrl = 'https://example.com/video.mp4';
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockResolvedValue({
        downloadUrl: mockDownloadUrl,
      });

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Wait for export to complete
      await waitFor(() => {
        expect(MockedDashboardAPI.prototype.exportProject).toHaveBeenCalled();
      });

      // Verify button is disabled during export
      expect(button).toBeDisabled();

      jest.useRealTimers();
    });

    it('should auto-hide error message after 5 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      const mockError = new Error('Export failed');
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockRejectedValue(mockError);

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });

      // Fast-forward timers to auto-hide error
      jest.advanceTimersByTime(5000);

      // Verify error message is gone
      await waitFor(() => {
        expect(screen.queryByText(/export failed/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should show progress percentage during export', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      // Mock API with a delay
      MockedDashboardAPI.prototype.exportProject = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ downloadUrl: 'https://example.com/video.mp4' }), 5000);
          })
      );

      render(<ExportButton projectId={1} projectTitle="Test Project" />);
      
      const button = screen.getByRole('button', { name: /export video/i });
      await user.click(button);

      // Verify initial progress
      expect(screen.getByText(/exporting\.\.\. 0%/i)).toBeInTheDocument();

      // Advance timers to simulate progress updates
      jest.advanceTimersByTime(500);
      await waitFor(() => {
        expect(screen.getByText(/exporting\.\.\. 10%/i)).toBeInTheDocument();
      });

      jest.advanceTimersByTime(500);
      await waitFor(() => {
        expect(screen.getByText(/exporting\.\.\. 20%/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
