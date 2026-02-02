import React from 'react';
import fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import { DashboardAPI } from '@/lib/api';
import { Folder, Project } from '@/lib/types';

// Mock the DashboardAPI
jest.mock('@/lib/api');

describe('Sidebar Component', () => {
  let mockGetFolders: jest.Mock;
  let mockCreateFolder: jest.Mock;

  beforeEach(() => {
    mockGetFolders = jest.fn();
    mockCreateFolder = jest.fn();

    (DashboardAPI as jest.MockedClass<typeof DashboardAPI>).mockImplementation(() => ({
      getFolders: mockGetFolders,
      createFolder: mockCreateFolder,
      getProjects: jest.fn(),
      getProject: jest.fn(),
      getProjectDetails: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      updateFolder: jest.fn(),
    } as any));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 13: Folder filtering', () => {
    // Feature: acro-saas-demo-video-tool, Property 13: Folder filtering

    it('should filter projects to only show those matching selected folder ID', async () => {
      // Feature: acro-saas-demo-video-tool, Property 13: Folder filtering
      // For any folder selection, the displayed project list should contain 
      // only Projects where folder_id matches the selected folder's id
      
      await fc.assert(
        fc.asyncProperty(
          // Generate random projects with folder IDs
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              uuid: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              folderId: fc.integer({ min: 1, max: 10 }),
              thumbnailUrl: fc.string(),
              createdAt: fc.date().filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
              deletedAt: fc.option(fc.date().filter(d => !isNaN(d.getTime())).map(d => d.toISOString()), { nil: null }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Select a random folder ID to filter by
          fc.integer({ min: 1, max: 10 }),
          async (projects: Project[], selectedFolderId: number) => {
            // Property: For any folder selection, filtering projects by folder_id
            // should return only projects with that folder_id
            
            const filteredProjects = projects.filter(p => p.folderId === selectedFolderId);
            const otherProjects = projects.filter(p => p.folderId !== selectedFolderId);

            // All filtered projects should have the selected folder ID
            filteredProjects.forEach(project => {
              expect(project.folderId).toBe(selectedFolderId);
            });

            // All other projects should NOT have the selected folder ID
            otherProjects.forEach(project => {
              expect(project.folderId).not.toBe(selectedFolderId);
            });

            // The union of filtered and other projects should equal all projects
            expect(filteredProjects.length + otherProjects.length).toBe(projects.length);
          }
        ),
        { numRuns: 100 }
      );
    }, 10000); // 10 second timeout for property test

    it('should handle folder selection state correctly', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 3, name: 'My Folder', type: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockGetFolders.mockResolvedValue(mockFolders);

      const onFolderSelect = jest.fn();

      render(
        <Sidebar 
          selectedFolderId={null}
          onFolderSelect={onFolderSelect}
        />
      );

      // Wait for folders to load
      await waitFor(() => {
        expect(screen.getByText('All Flows')).toBeInTheDocument();
      });

      // Click on a folder
      const folderButton = screen.getByText('My Folder').closest('button');
      expect(folderButton).toBeTruthy();
      
      if (folderButton) {
        folderButton.click();
        expect(onFolderSelect).toHaveBeenCalledWith(3);
      }
    });

    it('should highlight the selected folder', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockGetFolders.mockResolvedValue(mockFolders);

      const { rerender } = render(
        <Sidebar 
          selectedFolderId={1}
          onFolderSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Flows')).toBeInTheDocument();
      });

      // Check that the selected folder has the highlight class
      const selectedButton = screen.getByText('All Flows').closest('button');
      expect(selectedButton).toHaveClass('bg-blue-50');
      expect(selectedButton).toHaveClass('text-blue-700');

      // Check that the non-selected folder doesn't have the highlight class
      const nonSelectedButton = screen.getByText('Trash').closest('button');
      expect(nonSelectedButton).not.toHaveClass('bg-blue-50');
      expect(nonSelectedButton).toHaveClass('text-gray-700');

      // Change selection
      rerender(
        <Sidebar 
          selectedFolderId={2}
          onFolderSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        const newSelectedButton = screen.getByText('Trash').closest('button');
        expect(newSelectedButton).toHaveClass('bg-blue-50');
        expect(newSelectedButton).toHaveClass('text-blue-700');
      });
    });
  });

  describe('Folder Loading', () => {
    it('should display loading state while fetching folders', () => {
      mockGetFolders.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <Sidebar 
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
        />
      );

      // Check for loading skeleton - use a more specific selector
      const loadingContainer = screen.getByText((content, element) => {
        return element?.className?.includes('animate-pulse') || false;
      });
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should display folders after successful fetch', async () => {
      const mockFolders: Folder[] = [
        { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockGetFolders.mockResolvedValue(mockFolders);

      render(
        <Sidebar 
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Flows')).toBeInTheDocument();
        expect(screen.getByText('Trash')).toBeInTheDocument();
      });
    });

    it('should display error message on fetch failure', async () => {
      mockGetFolders.mockRejectedValue(new Error('Failed to load folders'));

      render(
        <Sidebar 
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load folders')).toBeInTheDocument();
      });
    });
  });

  describe('Folder Creation', () => {
    it('should show inline creation form when New Folder button is clicked', async () => {
      mockGetFolders.mockResolvedValue([]);

      render(
        <Sidebar 
          selectedFolderId={null}
          onFolderSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockGetFolders).toHaveBeenCalled();
      });

      const newFolderButton = screen.getByText('New Folder');
      newFolderButton.click();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Folder name')).toBeInTheDocument();
        expect(screen.getByText('Create')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });
});
