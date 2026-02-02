import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProjectCard from '../ProjectCard';
import Sidebar from '../Sidebar';
import { Project, Folder } from '@/lib/types';
import * as apiModule from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api');

describe('Drag and Drop Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Card Draggability', () => {
    it('should make project cards draggable', () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Draggable Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const { container } = render(<ProjectCard project={mockProject} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      expect(draggableElement).toBeInTheDocument();
    });

    it('should not be draggable when in trash', () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Trash Project',
        folderId: 2,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const { container } = render(<ProjectCard project={mockProject} isInTrash={true} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      expect(draggableElement).not.toBeInTheDocument();
    });

    it('should not be draggable while renaming', async () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const { container } = render(<ProjectCard project={mockProject} />);

      // Trigger context menu
      const projectCard = screen.getByText('Project').closest('div');
      if (projectCard) {
        fireEvent.contextMenu(projectCard);
      }

      // Wait for context menu
      await waitFor(() => {
        expect(screen.getByText('Rename')).toBeInTheDocument();
      });

      // Click rename
      fireEvent.click(screen.getByText('Rename'));

      // Wait for input field
      await waitFor(() => {
        expect(screen.getByDisplayValue('Project')).toBeInTheDocument();
      });

      // Check that draggable is false during rename
      const draggableElement = container.querySelector('[draggable="true"]');
      expect(draggableElement).not.toBeInTheDocument();
    });

    it('should set correct data on drag start', () => {
      const mockProject: Project = {
        id: 42,
        uuid: 'test-uuid',
        title: 'Drag Test Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const { container } = render(<ProjectCard project={mockProject} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      expect(draggableElement).toBeInTheDocument();

      if (draggableElement) {
        const dataTransfer = {
          effectAllowed: '',
          setData: jest.fn(),
        };

        const dragEvent = new Event('dragstart', { bubbles: true }) as any;
        dragEvent.dataTransfer = dataTransfer;

        fireEvent(draggableElement, dragEvent);

        // Verify data was set correctly
        expect(dataTransfer.setData).toHaveBeenCalledWith(
          'application/json',
          JSON.stringify({
            projectId: 42,
            projectTitle: 'Drag Test Project',
          })
        );
        expect(dataTransfer.effectAllowed).toBe('move');
      }
    });

    it('should apply opacity during drag', () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const { container } = render(<ProjectCard project={mockProject} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      expect(draggableElement).toBeInTheDocument();

      if (draggableElement) {
        // Initially should not have opacity-50
        expect(draggableElement).not.toHaveClass('opacity-50');

        // Trigger drag start
        const dataTransfer = {
          effectAllowed: '',
          setData: jest.fn(),
        };

        const dragStartEvent = new Event('dragstart', { bubbles: true }) as any;
        dragStartEvent.dataTransfer = dataTransfer;

        fireEvent(draggableElement, dragStartEvent);

        // Should have opacity-50 during drag
        expect(draggableElement).toHaveClass('opacity-50');

        // Trigger drag end
        fireEvent.dragEnd(draggableElement);

        // Should remove opacity-50 after drag
        expect(draggableElement).not.toHaveClass('opacity-50');
      }
    });
  });

  describe('Folder Drop Targets', () => {
    it('should accept drops on folder items', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'My Folder', type: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getFolders: mockGetFolders,
      } as any));

      const onProjectDrop = jest.fn().mockResolvedValue(undefined);

      render(
        <Sidebar
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
          onProjectDrop={onProjectDrop}
        />
      );

      // Wait for folders to load
      await waitFor(() => {
        expect(screen.getByText('My Folder')).toBeInTheDocument();
      });

      // Find the folder button
      const folderButton = screen.getByText('My Folder').closest('button');
      expect(folderButton).toBeInTheDocument();

      if (folderButton) {
        // Simulate drag over
        const dragOverEvent = new Event('dragover', { bubbles: true }) as any;
        dragOverEvent.dataTransfer = {
          dropEffect: '',
        };
        dragOverEvent.preventDefault = jest.fn();
        dragOverEvent.stopPropagation = jest.fn();

        fireEvent(folderButton, dragOverEvent);

        expect(dragOverEvent.preventDefault).toHaveBeenCalled();
        expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');

        // Simulate drop
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            projectId: 42,
            projectTitle: 'Test Project',
          })),
        };
        dropEvent.preventDefault = jest.fn();
        dropEvent.stopPropagation = jest.fn();

        fireEvent(folderButton, dropEvent);

        // Wait for drop handler to complete
        await waitFor(() => {
          expect(onProjectDrop).toHaveBeenCalledWith(42, 3);
        });
      }
    });

    it('should highlight folder during drag over', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'Target Folder', type: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getFolders: mockGetFolders,
      } as any));

      render(
        <Sidebar
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
          onProjectDrop={jest.fn()}
        />
      );

      // Wait for folders to load
      await waitFor(() => {
        expect(screen.getByText('Target Folder')).toBeInTheDocument();
      });

      const folderButton = screen.getByText('Target Folder').closest('button');
      expect(folderButton).toBeInTheDocument();

      if (folderButton) {
        // Initially should not have drag-over styling
        expect(folderButton).not.toHaveClass('bg-blue-100');
        expect(folderButton).not.toHaveClass('ring-2');

        // Simulate drag over
        const dragOverEvent = new Event('dragover', { bubbles: true }) as any;
        dragOverEvent.dataTransfer = { dropEffect: '' };
        dragOverEvent.preventDefault = jest.fn();
        dragOverEvent.stopPropagation = jest.fn();

        fireEvent(folderButton, dragOverEvent);

        // Should have drag-over styling
        await waitFor(() => {
          expect(folderButton).toHaveClass('bg-blue-100');
          expect(folderButton).toHaveClass('ring-2');
        });

        // Simulate drag leave
        const dragLeaveEvent = new Event('dragleave', { bubbles: true }) as any;
        dragLeaveEvent.preventDefault = jest.fn();
        dragLeaveEvent.stopPropagation = jest.fn();

        fireEvent(folderButton, dragLeaveEvent);

        // Should remove drag-over styling
        await waitFor(() => {
          expect(folderButton).not.toHaveClass('bg-blue-100');
          expect(folderButton).not.toHaveClass('ring-2');
        });
      }
    });

    it('should handle drop errors gracefully', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'Error Folder', type: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getFolders: mockGetFolders,
      } as any));

      const onProjectDrop = jest.fn().mockRejectedValue(new Error('Network error'));

      const { container } = render(
        <Sidebar
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
          onProjectDrop={onProjectDrop}
        />
      );

      // Wait for folders to load
      await waitFor(() => {
        expect(screen.getByText('Error Folder')).toBeInTheDocument();
      });

      const folderButton = screen.getByText('Error Folder').closest('button');

      if (folderButton) {
        // Simulate drop
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            projectId: 42,
            projectTitle: 'Test Project',
          })),
        };
        dropEvent.preventDefault = jest.fn();
        dropEvent.stopPropagation = jest.fn();

        fireEvent(folderButton, dropEvent);

        // Wait for error to be displayed
        await waitFor(() => {
          expect(screen.getByText('Failed to move project to folder')).toBeInTheDocument();
        });
      }
    });
  });

  describe('End-to-End Drag and Drop', () => {
    it('should complete full drag and drop workflow', async () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Movable Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'Destination', type: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getFolders: mockGetFolders,
      } as any));

      const onProjectDrop = jest.fn().mockResolvedValue(undefined);

      const { container: sidebarContainer } = render(
        <Sidebar
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
          onProjectDrop={onProjectDrop}
        />
      );

      const { container: cardContainer } = render(
        <ProjectCard project={mockProject} />
      );

      // Wait for folders to load
      await waitFor(() => {
        expect(screen.getByText('Destination')).toBeInTheDocument();
      });

      // Get draggable project card
      const draggableCard = cardContainer.querySelector('[draggable="true"]');
      expect(draggableCard).toBeInTheDocument();

      // Get drop target folder
      const targetFolder = screen.getByText('Destination').closest('button');
      expect(targetFolder).toBeInTheDocument();

      if (draggableCard && targetFolder) {
        // Step 1: Start drag
        const dataTransfer = {
          effectAllowed: '',
          dropEffect: '',
          setData: jest.fn(),
          getData: jest.fn(),
        };

        const dragStartEvent = new Event('dragstart', { bubbles: true }) as any;
        dragStartEvent.dataTransfer = dataTransfer;
        fireEvent(draggableCard, dragStartEvent);

        // Verify drag data was set
        expect(dataTransfer.setData).toHaveBeenCalledWith(
          'application/json',
          JSON.stringify({
            projectId: 1,
            projectTitle: 'Movable Project',
          })
        );

        // Step 2: Drag over target
        const dragOverEvent = new Event('dragover', { bubbles: true }) as any;
        dragOverEvent.dataTransfer = dataTransfer;
        dragOverEvent.preventDefault = jest.fn();
        dragOverEvent.stopPropagation = jest.fn();
        fireEvent(targetFolder, dragOverEvent);

        expect(dragOverEvent.preventDefault).toHaveBeenCalled();
        expect(dataTransfer.dropEffect).toBe('move');

        // Step 3: Drop on target
        dataTransfer.getData = jest.fn().mockReturnValue(
          JSON.stringify({
            projectId: 1,
            projectTitle: 'Movable Project',
          })
        );

        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = dataTransfer;
        dropEvent.preventDefault = jest.fn();
        dropEvent.stopPropagation = jest.fn();
        fireEvent(targetFolder, dropEvent);

        // Verify drop handler was called
        await waitFor(() => {
          expect(onProjectDrop).toHaveBeenCalledWith(1, 3);
        });

        // Step 4: End drag
        fireEvent.dragEnd(draggableCard);

        // Verify drag styling is removed
        expect(draggableCard).not.toHaveClass('opacity-50');
      }
    });
  });
});
