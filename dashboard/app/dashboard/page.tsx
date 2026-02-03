'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectGrid from '@/components/ProjectGrid';
import { DashboardAPI } from '@/lib/api';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { CompactErrorBoundary } from '@/components/ErrorBoundary';

import { GlobalSidebar } from '@/components/GlobalSidebar';

export default function DashboardPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Creation date');
  const [filterTag, setFilterTag] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isGlobalSidebarCollapsed, setIsGlobalSidebarCollapsed] = useState(false);
  const [isFolderSidebarCollapsed, setIsFolderSidebarCollapsed] = useState(false);

  const projectGridRef = useRef<{ handleFolderChange: (projectId: number, folderId: number) => Promise<void> } | null>(null);
  const api = new DashboardAPI();

  const handleProjectDrop = async (projectId: number, folderId: number) => {
    try {
      await api.updateProject(projectId, { folderId });
      if (selectedFolderId !== null) {
        setSelectedFolderId(null);
        setTimeout(() => setSelectedFolderId(folderId), 0);
      }
    } catch (error) {
      console.error('Failed to move project:', error);
      throw error;
    }
  };

  const handleNewGuideflow = async () => {
    setIsStartingRecording(true);
    setExtensionError(null);

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        throw new Error('Chrome extension API not available. Please use Chrome or Edge browser.');
      }

      const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID || 'YOUR_EXTENSION_ID_HERE';

      chrome.runtime.sendMessage(
        extensionId,
        { type: 'START_RECORDING_FROM_DASHBOARD' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Extension error:', chrome.runtime.lastError);
            setExtensionError(
              'Acro Chrome Extension is not installed or not responding. Please install the extension first.'
            );
            setIsStartingRecording(false);
            return;
          }

          if (response && response.success) {
            console.log('Recording started successfully');
            setIsStartingRecording(false);
          } else {
            console.error('Failed to start recording:', response?.error);
            setExtensionError(response?.error || 'Failed to start recording. Please try again.');
            setIsStartingRecording(false);
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setExtensionError(error.message || 'Failed to start recording. Please try again.');
      setIsStartingRecording(false);
    }
  };

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-white flex overflow-hidden">
        {/* Panel 1: Global Sidebar */}
        <GlobalSidebar
          isCollapsed={isGlobalSidebarCollapsed}
          onToggle={() => setIsGlobalSidebarCollapsed(!isGlobalSidebarCollapsed)}
        />

        {/* Panel 2: Folder Sidebar */}
        {!isFolderSidebarCollapsed && (
          <CompactErrorBoundary context="Sidebar">
            <Sidebar
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              onProjectDrop={handleProjectDrop}
            />
          </CompactErrorBoundary>
        )}

        {/* Panel 3: Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#FAFAFA] overflow-hidden transition-all duration-300">
          {/* Top Navigation Bar */}
          <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
            {/* Breadcrumb & Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFolderSidebarCollapsed(!isFolderSidebarCollapsed)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 active:scale-95"
                title={isFolderSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
              <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <span className="hover:text-gray-900 cursor-pointer">All folders</span>
              </nav>
            </div>

            {/* New Guideflow Button */}
            <button
              onClick={handleNewGuideflow}
              disabled={isStartingRecording}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isStartingRecording ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>New guideflow</>
              )}
            </button>
          </header>

          {/* Filters Bar */}
          <div className="px-6 py-8 flex flex-col gap-6 overflow-y-auto">
            <h1 className="text-xl font-bold text-gray-900">Filters</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Filters Dropdowns */}
                {[
                  { label: 'All Flows', icon: null },
                  { label: 'Tags: All', icon: null },
                  { label: 'Creation date', icon: null },
                ].map((filter) => (
                  <button key={filter.label} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all focus:ring-1 focus:ring-blue-500">
                    <span>{filter.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 px-2 rounded shadow-sm transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 px-2 rounded shadow-sm transition-all ${viewMode === 'list' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Extension Error Message */}
            {extensionError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Extension Error</h3>
                    <p className="text-xs text-red-700 mt-1">{extensionError}</p>
                  </div>
                  <button
                    onClick={() => setExtensionError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Project Grid */}
            <div className="mt-4">
              <CompactErrorBoundary context="Project Grid">
                <ProjectGrid
                  folderId={selectedFolderId}
                  viewMode={viewMode}
                  key={`${selectedFolderId}-${viewMode}`}
                />
              </CompactErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
