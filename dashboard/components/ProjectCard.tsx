'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import ConfirmPopover from './ConfirmPopover';

interface ProjectCardProps {
  project: Project;
  isInTrash?: boolean;
  onRename?: (id: number, newTitle: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onRestore?: (id: number) => Promise<void>;
  onFolderChange?: (projectId: number, newFolderId: number) => Promise<void>;
}

export default function ProjectCard({
  project,
  isInTrash = false,
  onRename,
  onDelete,
  onRestore,
  onFolderChange,
}: ProjectCardProps) {
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ x: number; y: number } | null>(null);

  const handleCardClick = () => {
    // Don't navigate if renaming, loading, or in trash
    if (isRenaming || isLoading || isInTrash) {
      return;
    }

    // Navigate to editor page
    router.push(`/editor/${project.uuid}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle whitespace-only or empty titles gracefully
  const displayTitle = project.title.trim() || 'Untitled Project';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRenameStart = () => {
    setIsRenaming(true);
    setRenameValue(project.title);
  };

  const handleRenameSubmit = async () => {
    if (!onRename || renameValue.trim() === project.title.trim()) {
      setIsRenaming(false);
      return;
    }

    setIsLoading(true);
    try {
      await onRename(project.id, renameValue.trim());
      setIsRenaming(false);
    } catch (error) {
      // Rollback on error
      setRenameValue(project.title);
      console.error('Failed to rename project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue(project.title);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsLoading(true);
    setDeleteConfirm(null); // Close popover

    try {
      await onDelete(project.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('删除失败，请重试');
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Get button position for popover
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDeleteConfirm({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleRestore = async () => {
    if (!onRestore) return;

    setIsLoading(true);
    try {
      await onRestore(project.id);
    } catch (error) {
      console.error('Failed to restore project:', error);
      setIsLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    // Don't allow dragging while renaming
    if (isRenaming) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    // Store project data in drag event
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      projectId: project.id,
      projectTitle: project.title,
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const contextMenuItems: ContextMenuItem[] = isInTrash
    ? [
      {
        label: 'Restore',
        onClick: handleRestore,
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      },
    ]
    : [
      {
        label: 'Rename',
        onClick: handleRenameStart,
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
      },
      {
        label: 'Delete',
        onClick: () => setDeleteConfirm({ x: contextMenu?.x || 0, y: contextMenu?.y || 0 }),
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
        danger: true,
      },
    ];

  return (
    <>
      <div
        draggable={!isRenaming && !isInTrash}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className={`bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group relative ${isLoading ? 'opacity-50 pointer-events-none' : ''
          } ${isDragging ? 'opacity-50' : ''}`}
        onContextMenu={handleContextMenu}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-[#F5F5F7] overflow-hidden">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={displayTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <svg
                width="40"
                height="40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Restore button for trash items */}
          {isInTrash && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestore();
                }}
                className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white shadow-sm transition-colors"
                title="Restore"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-1 relative">
          <div className="flex items-center justify-between gap-2">
            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                className="flex-1 text-sm font-bold text-gray-900 border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                disabled={isLoading}
              />
            ) : (
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {displayTitle}
              </h3>
            )}

            {!isInTrash && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0 active:scale-90"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
            <span className="text-blue-500">By ethan</span>
            <span>•</span>
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {deleteConfirm && (
        <ConfirmPopover
          message={`确定要删除"${displayTitle}"吗？项目将被移至回收站。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          position={deleteConfirm}
          confirmText="删除"
          cancelText="取消"
        />
      )}
    </>
  );
}
