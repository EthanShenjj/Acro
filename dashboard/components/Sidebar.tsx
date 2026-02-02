'use client';

import React, { useState, useEffect } from 'react';
import { DashboardAPI } from '@/lib/api';
import { Folder } from '@/lib/types';

interface SidebarProps {
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onProjectDrop?: (projectId: number, folderId: number) => Promise<void>;
}

export default function Sidebar({ selectedFolderId, onFolderSelect, onProjectDrop }: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);

  const api = new DashboardAPI();

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedFolders = await api.getFolders();
      setFolders(fetchedFolders);
      
      // Auto-expand all folders by default
      const allFolderIds = new Set(fetchedFolders.map(f => f.id));
      setExpandedFolders(allFolderIds);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      return;
    }

    try {
      const newFolder = await api.createFolder(newFolderName.trim());
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      
      // Auto-expand the new folder
      setExpandedFolders(prev => new Set(Array.from(prev).concat(newFolder.id)));
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const toggleFolderExpand = (folderId: number) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFolderClick = (folderId: number) => {
    onFolderSelect(folderId);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    if (!onProjectDrop) return;

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      const { projectId } = JSON.parse(data);
      if (!projectId) return;

      await onProjectDrop(projectId, folderId);
    } catch (error) {
      console.error('Failed to move project:', error);
      setError('Failed to move project to folder');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="w-60 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="mx-2 mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1">
          {folders.map((folder) => {
            const isExpanded = expandedFolders.has(folder.id);
            const isSelected = selectedFolderId === folder.id;
            const isDragOver = dragOverFolderId === folder.id;

            return (
              <div key={folder.id}>
                <button
                  onClick={() => handleFolderClick(folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
                    transition-colors duration-150
                    ${isSelected 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                    ${isDragOver ? 'bg-blue-100 ring-2 ring-blue-400' : ''}
                  `}
                >
                  {/* Expand/Collapse Icon (optional for future nested folders) */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolderExpand(folder.id);
                    }}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer"
                  >
                    {isExpanded ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>

                  {/* Folder Icon */}
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>

                  {/* Folder Name */}
                  <span className="flex-1 text-left truncate">
                    {folder.name}
                  </span>

                  {/* System Folder Badge */}
                  {folder.type === 'system' && (
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      •
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* New Folder Creation */}
        {isCreatingFolder ? (
          <div className="mt-2 px-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  } else if (e.key === 'Escape') {
                    handleCancelCreate();
                  }
                }}
                placeholder="Folder name"
                autoFocus
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={handleCancelCreate}
                className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer with New Folder Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => setIsCreatingFolder(true)}
          disabled={isCreatingFolder}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Folder
        </button>
      </div>
    </div>
  );
}
