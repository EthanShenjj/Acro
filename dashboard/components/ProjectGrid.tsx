'use client';

import React, { useEffect, useState } from 'react';
import ProjectCard from './ProjectCard';
import { Project, Folder } from '@/lib/types';
import { DashboardAPI } from '@/lib/api';
import ConfirmPopover from './ConfirmPopover';

interface ProjectGridProps {
  folderId?: number | null;
  viewMode?: 'grid' | 'list';
}

const ITEMS_PER_PAGE = 12;

export default function ProjectGrid({ folderId, viewMode = 'grid' }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState<{ x: number; y: number } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const api = new DashboardAPI();

  // Reset page when folder changes
  useEffect(() => {
    setCurrentPage(1);
  }, [folderId]);

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

  // Calculate pagination
  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const paginatedProjects = projects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
          >
            <div className="w-full aspect-video bg-gray-100" />
            <div className="p-4">
              <div className="h-5 bg-gray-100 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
        <div className="text-red-500 mb-4 bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to load projects</h3>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
        <div className="text-gray-200 mb-6 flex justify-center">
          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{isInTrash ? 'Trash is empty' : 'No projects yet'}</h3>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          {isInTrash
            ? 'Projects you delete will appear here until you empty the trash'
            : 'Get started by creating your first interactive demo flow'
          }
        </p>
        {!isInTrash && (
          <button className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg flex items-center gap-2 mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Guideflow
          </button>
        )}
      </div>
    );
  }

  // Project grid
  return (
    <div className="flex flex-col min-h-[400px]">
      {/* Empty Trash button for trash folder */}
      {isInTrash && projects.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleEmptyTrashClick}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 active:scale-95 transition-all font-medium flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清空回收站
          </button>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {paginatedProjects.map((project) => (
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
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedProjects.map((project) => (
                <tr key={project.id} className="group hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {project.thumbnailUrl && <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-sm font-bold text-gray-900 truncate max-w-[300px]">{project.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-medium">ethan</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-medium">Feb 3, 2026</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-90">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-12 mb-8 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              const isSelected = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`min-w-[40px] h-10 px-3 rounded-lg border text-sm font-bold transition-all active:scale-95 shadow-sm ${isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

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
