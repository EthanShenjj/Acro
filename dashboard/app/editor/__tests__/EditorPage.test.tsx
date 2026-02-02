import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorPage from '../[projectId]/page';
import { DashboardAPI } from '@/lib/api';

// Mock the DashboardAPI
jest.mock('@/lib/api');

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock Remotion Player
jest.mock('@remotion/player', () => ({
  Player: ({ inputProps }: any) => (
    <div data-testid="remotion-player">
      Mock Player with {inputProps.steps.length} steps
    </div>
  ),
  PlayerRef: jest.fn(),
}));

// Mock AcroVideo component
jest.mock('@/components/remotion/AcroVideo', () => ({
  AcroVideo: () => <div>Mock AcroVideo</div>,
}));

const mockUseParams = require('next/navigation').useParams;
const MockedDashboardAPI = DashboardAPI as jest.MockedClass<typeof DashboardAPI>;

describe('EditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ projectId: '123' });
  });

  describe('Unit Test: Project loading error handling', () => {
    it('should display error state when API fails', async () => {
      // Mock API to throw an error
      const mockError = new Error('Network error, please check your connection');
      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockRejectedValue(mockError);

      render(<EditorPage />);

      // Initially should show loading state
      expect(screen.getByText('Loading project...')).toBeInTheDocument();

      // Wait for error state to appear
      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument();
      });

      // Verify error message is displayed
      expect(screen.getByText('Network error, please check your connection')).toBeInTheDocument();

      // Verify retry button is present
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

      // Verify back to dashboard link is present
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('should display error state for server errors', async () => {
      // Mock API to throw a server error
      const mockError = new Error('Server error, please try again later');
      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockRejectedValue(mockError);

      render(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument();
      });

      expect(screen.getByText('Server error, please try again later')).toBeInTheDocument();
    });

    it('should display error state for client errors', async () => {
      // Mock API to throw a client error
      const mockError = new Error('Project not found');
      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockRejectedValue(mockError);

      render(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument();
      });

      expect(screen.getByText('Project not found')).toBeInTheDocument();
    });

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails, second call succeeds
      const mockProjectDetails = {
        id: 123,
        uuid: 'test-uuid',
        title: 'Test Project',
        folderId: 1,
        thumbnailUrl: '/test.png',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: null,
        steps: [
          {
            id: 1,
            projectId: 123,
            orderIndex: 1,
            actionType: 'click' as const,
            targetText: 'Button',
            scriptText: 'Click the button',
            audioUrl: '/audio.mp3',
            imageUrl: '/image.png',
            posX: 100,
            posY: 200,
            durationFrames: 90,
          },
        ],
      };

      MockedDashboardAPI.prototype.getProjectDetails = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProjectDetails);

      render(<EditorPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Wait for successful load
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      // Verify player is rendered
      expect(screen.getByTestId('remotion-player')).toBeInTheDocument();
    });

    it('should handle empty project (no steps)', async () => {
      const mockProjectDetails = {
        id: 123,
        uuid: 'test-uuid',
        title: 'Empty Project',
        folderId: 1,
        thumbnailUrl: '/test.png',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: null,
        steps: [],
      };

      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockResolvedValue(mockProjectDetails);

      render(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByText('No steps found in this project')).toBeInTheDocument();
      });

      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Successful project loading', () => {
    it('should load and display project successfully', async () => {
      const mockProjectDetails = {
        id: 123,
        uuid: 'test-uuid',
        title: 'Test Project',
        folderId: 1,
        thumbnailUrl: '/test.png',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: null,
        steps: [
          {
            id: 1,
            projectId: 123,
            orderIndex: 1,
            actionType: 'click' as const,
            targetText: 'Button',
            scriptText: 'Click the button',
            audioUrl: '/audio.mp3',
            imageUrl: '/image.png',
            posX: 100,
            posY: 200,
            durationFrames: 90,
          },
          {
            id: 2,
            projectId: 123,
            orderIndex: 2,
            actionType: 'click' as const,
            targetText: 'Submit',
            scriptText: 'Click submit',
            audioUrl: '/audio2.mp3',
            imageUrl: '/image2.png',
            posX: 150,
            posY: 250,
            durationFrames: 60,
          },
        ],
      };

      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockResolvedValue(mockProjectDetails);

      render(<EditorPage />);

      // Wait for project to load
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      // Verify project details are displayed
      expect(screen.getByText('2 steps • 5 seconds')).toBeInTheDocument();

      // Verify player is rendered
      expect(screen.getByTestId('remotion-player')).toBeInTheDocument();
      expect(screen.getByText('Mock Player with 2 steps')).toBeInTheDocument();
    });

    it('should calculate total duration correctly', async () => {
      const mockProjectDetails = {
        id: 123,
        uuid: 'test-uuid',
        title: 'Duration Test',
        folderId: 1,
        thumbnailUrl: '/test.png',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: null,
        steps: [
          {
            id: 1,
            projectId: 123,
            orderIndex: 1,
            actionType: 'click' as const,
            targetText: 'Button',
            scriptText: 'Click the button',
            audioUrl: '/audio.mp3',
            imageUrl: '/image.png',
            posX: 100,
            posY: 200,
            durationFrames: 120, // 4 seconds
          },
          {
            id: 2,
            projectId: 123,
            orderIndex: 2,
            actionType: 'click' as const,
            targetText: 'Submit',
            scriptText: 'Click submit',
            audioUrl: '/audio2.mp3',
            imageUrl: '/image2.png',
            posX: 150,
            posY: 250,
            durationFrames: 180, // 6 seconds
          },
        ],
      };

      MockedDashboardAPI.prototype.getProjectDetails = jest.fn().mockResolvedValue(mockProjectDetails);

      render(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByText('Duration Test')).toBeInTheDocument();
      });

      // Total: 120 + 180 = 300 frames = 10 seconds at 30 FPS
      expect(screen.getByText('2 steps • 10 seconds')).toBeInTheDocument();
    });
  });
});
