import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectGrid from '../ProjectGrid';
import * as apiModule from '@/lib/api';

// Mock the entire API module
jest.mock('@/lib/api');

describe('ProjectGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Unit test for empty state display
  it('should display empty state when no projects exist', async () => {
    // Mock getProjects to return empty array
    const mockGetProjects = jest.fn().mockResolvedValue([]);
    const mockGetFolders = jest.fn().mockResolvedValue([
      { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
      getProjects: mockGetProjects,
      getFolders: mockGetFolders,
    } as any));

    render(<ProjectGrid folderId={null} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify empty state is displayed
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first Guideflow to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new guideflow/i })).toBeInTheDocument();
  });

  it('should display projects when they exist', async () => {
    const mockProjects = [
      {
        id: 1,
        uuid: 'test-uuid-1',
        title: 'Test Project 1',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb1.png',
        createdAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      },
      {
        id: 2,
        uuid: 'test-uuid-2',
        title: 'Test Project 2',
        folderId: 1,
        thumbnailUrl: 'https://example.com/thumb2.png',
        createdAt: '2024-01-16T14:45:00Z',
        deletedAt: null,
      },
    ];

    const mockGetProjects = jest.fn().mockResolvedValue(mockProjects);
    const mockGetFolders = jest.fn().mockResolvedValue([
      { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
      getProjects: mockGetProjects,
      getFolders: mockGetFolders,
    } as any));

    render(<ProjectGrid folderId={null} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify projects are displayed
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  it('should display error state when API fails', async () => {
    const mockGetProjects = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockGetFolders = jest.fn().mockResolvedValue([
      { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
      getProjects: mockGetProjects,
      getFolders: mockGetFolders,
    } as any));

    render(<ProjectGrid folderId={null} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify error state is displayed
    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should filter projects by folder ID', async () => {
    const mockGetProjects = jest.fn().mockResolvedValue([]);
    const mockGetFolders = jest.fn().mockResolvedValue([
      { id: 1, name: 'All Flows', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Trash', type: 'system', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    jest.spyOn(apiModule, 'DashboardAPI').mockImplementation(() => ({
      getProjects: mockGetProjects,
      getFolders: mockGetFolders,
    } as any));

    render(<ProjectGrid folderId={5} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith(5);
    });
  });
});
