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
  const [searchQuery, setSearchQuery] = useState('');

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

      const allFolderIds = new Set(fetchedFolders.map(f => f.id));
      setExpandedFolders(allFolderIds);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const renderSectionHeader = (title: string, onAdd?: () => void) => (
    <div className="px-4 py-2 mt-4 flex items-center justify-between group">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-all text-gray-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );

  const renderFolderItem = (folder: Folder) => {
    const isSelected = selectedFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <button
        key={folder.id}
        onClick={() => onFolderSelect(folder.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => { /* handle drop */ }}
        className={`w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-sm transition-all ${isSelected ? 'bg-white shadow-sm font-semibold text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          } ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={isSelected ? 'text-gray-700' : 'text-gray-400'}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12z" />
        </svg>
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="text-[10px] font-medium opacity-60">1</span>
      </button>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center gap-2 mt-1">
        <h2 className="text-base font-bold text-gray-900">Guideflows</h2>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search for a guideflow"
            className="w-full bg-[#F5F5F7] border-none rounded-lg py-1.5 pl-9 pr-3 text-xs placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Sections */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* All Folders */}
        <button
          onClick={() => onFolderSelect(null)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all mb-1 ${selectedFolderId === null ? 'bg-[#F2F2F5] shadow-sm font-semibold text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="flex-1 text-left font-bold">All folders</span>
          <span className="text-[10px] font-bold opacity-60">1</span>
        </button>

        {renderSectionHeader('WORKSPACE')}
        {folders.filter(f => f.type !== 'system').map(renderFolderItem)}

        {renderSectionHeader('SHARED')}
        {renderSectionHeader('PRIVATE')}
      </div>

      {/* Bottom Archived */}
      <div className="p-2 border-t border-gray-100">
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          <span className="flex-1 text-left">Archived</span>
          <span className="text-[10px] opacity-60">0</span>
        </button>
      </div>
    </div>
  );
}
