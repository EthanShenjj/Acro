import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import ProjectGrid from '../ProjectGrid';
import * as apiModule from '@/lib/api';
import { Project, Folder } from '@/lib/types';

// Mock the entire API module
jest.mock('@/lib/api');

describe('Project Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 14: Soft delete preservation', () => {
    // Feature: acro-saas-demo-video-tool, Property 14: Soft delete preservation
    it('should preserve project data when deleting (moving to trash)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 100000 }),
            uuid: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 255 }),
            folderId: fc.integer({ min: 1, max: 100 }),
            thumbnailUrl: fc.oneof(
              fc.constant(''),
              fc.webUrl({ validSchemes: ['http', 'https'] })
            ),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
              .filter(d => !isNaN(d.getTime()))
              .map(d => d.toISOString()),
            deletedAt: fc.constant(null),
            stepCount: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
          }),
          async (project: Project) => {
            const mockFolders: Folder[] = [
              { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
              { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
            ];

            const mockGetProjects = jest.fn().mockResolvedValue([project]);
            const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
            
            // Track the update call to verify soft delete behavior
            let updateCalled = false;
            let updateData: any = null;
            const mockUpdateProject = jest.fn().mockImplementation(async (id: number, data: Partial<Project>) => {
              updateCalled = true;
              updateData = data;
              
              // Verify that delete operation moves to trash (updates folderId)
              // and does NOT permanently delete the project
              expect(data.folderId).toBe(2); // Trash folder ID
              
              return { ...project, folderId: 2 };
            });

            jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
              getProjects: mockGetProjects,
              getFolders: mockGetFolders,
              updateProject: mockUpdateProject,
            } as any));

            const { container, unmount } = render(<ProjectGrid folderId={1} />);

            // Wait for projects to load
            await waitFor(() => {
              expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
            });

            // Find the project card - use container to avoid multiple matches
            const displayTitle = project.title.trim() || 'Untitled Project';
            const projectCards = container.querySelectorAll('h3');
            const projectCard = Array.from(projectCards).find(
              card => card.textContent === displayTitle
            )?.closest('div[draggable]');
            expect(projectCard).toBeInTheDocument();

            // Trigger context menu (right-click)
            if (projectCard) {
              fireEvent.contextMenu(projectCard);
            }

            // Wait for context menu to appear
            await waitFor(() => {
              expect(screen.getByText('Delete')).toBeInTheDocument();
            });

            // Click delete option
            fireEvent.click(screen.getByText('Delete'));

            // Wait for API call
            await waitFor(() => {
              expect(updateCalled).toBe(true);
            });

            // Property: Soft delete should update folderId to Trash, not permanently delete
            expect(mockUpdateProject).toHaveBeenCalledWith(project.id, { folderId: 2 });
            expect(updateData).toEqual({ folderId: 2 });
            
            // Property: The project should still exist (not deleted from database)
            // This is verified by the fact that we're calling updateProject, not deleteProject
            expect(mockUpdateProject).toHaveBeenCalled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle delete operation with optimistic UI update and rollback on error', async () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Test Project',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetProjects = jest.fn().mockResolvedValue([mockProject]);
      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      const mockUpdateProject = jest.fn().mockRejectedValue(new Error('Network error'));

      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getProjects: mockGetProjects,
        getFolders: mockGetFolders,
        updateProject: mockUpdateProject,
      } as any));

      render(<ProjectGrid folderId={1} />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify project is displayed
      expect(screen.getByText('Test Project')).toBeInTheDocument();

      // Trigger context menu
      const projectCard = screen.getByText('Test Project').closest('div');
      if (projectCard) {
        fireEvent.contextMenu(projectCard);
      }

      // Wait for context menu
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      // Click delete
      fireEvent.click(screen.getByText('Delete'));

      // Wait for API call to fail
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalled();
      });

      // Property: On error, project should still be visible (rollback)
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });

  describe('Restore Operation', () => {
    it('should restore project from trash to All Flows folder', async () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Deleted Project',
        folderId: 2, // In trash
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetProjects = jest.fn().mockResolvedValue([mockProject]);
      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      const mockRestoreProject = jest.fn().mockResolvedValue({ ...mockProject, folderId: 1 });

      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getProjects: mockGetProjects,
        getFolders: mockGetFolders,
        restoreProject: mockRestoreProject,
      } as any));

      render(<ProjectGrid folderId={2} />); // Viewing trash folder

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify project is displayed
      expect(screen.getByText('Deleted Project')).toBeInTheDocument();

      // Trigger context menu
      const projectCard = screen.getByText('Deleted Project').closest('div');
      if (projectCard) {
        fireEvent.contextMenu(projectCard);
      }

      // Wait for context menu
      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });

      // Click restore
      fireEvent.click(screen.getByText('Restore'));

      // Wait for API call
      await waitFor(() => {
        expect(mockRestoreProject).toHaveBeenCalledWith(1, 1); // Restore to All Flows
      });
    });
  });

  describe('Rename Operation', () => {
    it('should rename project with optimistic update', async () => {
      const mockProject: Project = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Original Title',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const mockGetProjects = jest.fn().mockResolvedValue([mockProject]);
      const mockGetFolders = jest.fn().mockResolvedValue(mockFolders);
      const mockUpdateProject = jest.fn().mockResolvedValue({ ...mockProject, title: 'New Title' });

      jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
        getProjects: mockGetProjects,
        getFolders: mockGetFolders,
        updateProject: mockUpdateProject,
      } as any));

      render(<ProjectGrid folderId={1} />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify project is displayed
      expect(screen.getByText('Original Title')).toBeInTheDocument();

      // Trigger context menu
      const projectCard = screen.getByText('Original Title').closest('div');
      if (projectCard) {
        fireEvent.contextMenu(projectCard);
      }

      // Wait for context menu
      await waitFor(() => {
        expect(screen.getByText('Rename')).toBeInTheDocument();
      });

      // Click rename
      fireEvent.click(screen.getByText('Rename'));

      // Wait for input field to appear
      await waitFor(() => {
        const input = screen.getByDisplayValue('Original Title');
        expect(input).toBeInTheDocument();
      });

      // Change the title
      const input = screen.getByDisplayValue('Original Title') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.blur(input); // Trigger save

      // Wait for API call
      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith(1, { title: 'New Title' });
      });
    });
  });
});
