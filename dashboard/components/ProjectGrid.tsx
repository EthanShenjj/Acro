'use client';

import React, { useEffect, useState } from 'react';
import ProjectCard from './ProjectCard';
import { Project, Folder } from '@/lib/types';
import { DashboardAPI } from '@/lib/api';
import ConfirmPopover from './ConfirmPopover';

interface ProjectGridProps {
  folderId?: number | null;
}

export default function ProjectGrid({ folderId }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState<{ x: number; y: number } | null>(null);
  const api = new DashboardAPI();

  // Fetch folders to identify trash folder
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const fetchedFolders = await api.getFolders();
        setFolders(fetchedFolders);
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    };

    fetchFolders();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedProjects = await api.getProjects(folderId ?? undefined);
        
        // Transform relative URLs to absolute URLs
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const projectsWithAbsoluteUrls = fetchedProjects.map(project => ({
          ...project,
          thumbnailUrl: project.thumbnailUrl && !project.thumbnailUrl.startsWith('http')
            ? `${apiBaseUrl}${project.thumbnailUrl}`
            : project.thumbnailUrl,
        }));
        
        setProjects(projectsWithAbsoluteUrls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [folderId]);

  const trashFolder = folders.find(f => f.name === 'Trash' && f.type === 'system');
  const allFlowsFolder = folders.find(f => f.name === 'All Flows' && f.type === 'system');
  const isInTrash = folderId === trashFolder?.id;

  const handleRename = async (id: number, newTitle: string) => {
    // Optimistic update
    const previousProjects = [...projects];
    setProjects(projects.map(p => p.id === id ? { ...p, title: newTitle } : p));

    try {
      await api.updateProject(id, { title: newTitle });
    } catch (error) {
      // Rollback on error
      setProjects(previousProjects);
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    if (!trashFolder) {
      console.error('Trash folder not found');
      return;
    }

    // Optimistic update - remove from current view
    const previousProjects = [...projects];
    setProjects(projects.filter(p => p.id !== id));

    try {
      // Move to trash by updating folder_id
      await api.updateProject(id, { folderId: trashFolder.id });
    } catch (error) {
      // Rollback on error
      setProjects(previousProjects);
      throw error;
    }
  };

  const handleRestore = async (id: number) => {
    if (!allFlowsFolder) {
      console.error('All Flows folder not found');
      return;
    }

    // Optimistic update - remove from trash view
    const previousProjects = [...projects];
    setProjects(projects.filter(p => p.id !== id));

    try {
      // Restore to All Flows folder
      await api.restoreProject(id, allFlowsFolder.id);
    } catch (error) {
      // Rollback on error
      setProjects(previousProjects);
      throw error;
    }
  };

  const handleFolderChange = async (projectId: number, newFolderId: number) => {
    // Optimistic update - remove from current view if folder changed
    const previousProjects = [...projects];
    setProjects(projects.filter(p => p.id !== projectId));

    try {
      await api.updateProject(projectId, { folderId: newFolderId });
    } catch (error) {
      // Rollback on error
      setProjects(previousProjects);
      throw error;
    }
  };

  const handleEmptyTrash = async () => {
    const previousProjects = [...projects];
    setProjects([]);
    setEmptyTrashConfirm(null); // Close popover

    try {
      await api.emptyTrash();
    } catch (error) {
      // Rollback on error
      setProjects(previousProjects);
      alert('清空回收站失败，请重试');
    }
  };

  const handleEmptyTrashClick = (e: React.MouseEvent) => {
    // Get button position for popover
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEmptyTrashConfirm({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow overflow-hidden animate-pulse"
          >
            <div className="w-full h-[180px] bg-gray-300" />
            <div className="p-4">
              <div className="h-6 bg-gray-300 rounded mb-2" />
              <div className="h-4 bg-gray-300 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load projects
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-gray-400 mb-6">
          <svg
            className="w-24 h-24 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {isInTrash ? 'Trash is empty' : 'No projects yet'}
        </h3>
        <p className="text-gray-600 mb-6">
          {isInTrash 
            ? 'Deleted projects will appear here'
            : 'Create your first Guideflow to get started'
          }
        </p>
        {!isInTrash && (
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            + New Guideflow
          </button>
        )}
      </div>
    );
  }

  // Project grid
  return (
    <div>
      {/* Empty Trash button for trash folder */}
      {isInTrash && projects.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleEmptyTrashClick}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清空回收站
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project}
            isInTrash={isInTrash}
            onRename={handleRename}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onFolderChange={handleFolderChange}
          />
        ))}
      </div>

      {emptyTrashConfirm && (
        <ConfirmPopover
          message="确定要永久删除回收站中的所有项目吗？此操作无法撤销。"
          onConfirm={handleEmptyTrash}
          onCancel={() => setEmptyTrashConfirm(null)}
          position={emptyTrashConfirm}
          confirmText="永久删除"
          cancelText="取消"
        />
      )}
    </div>
  );
}
