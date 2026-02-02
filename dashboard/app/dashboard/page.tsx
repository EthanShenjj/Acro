'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ProjectGrid from '@/components/ProjectGrid';
import { DashboardAPI } from '@/lib/api';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { CompactErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const projectGridRef = useRef<{ handleFolderChange: (projectId: number, folderId: number) => Promise<void> } | null>(null);
  const api = new DashboardAPI();

  const handleProjectDrop = async (projectId: number, folderId: number) => {
    // Update the project's folder via API
    try {
      await api.updateProject(projectId, { folderId });
      // Force refresh by changing selected folder if needed
      if (selectedFolderId !== null) {
        setSelectedFolderId(null);
        setTimeout(() => setSelectedFolderId(folderId), 0);
      }
    } catch (error) {
      console.error('Failed to move project:', error);
      throw error;
    }
  };

  /**
   * Handle "New guideflow" button click
   * Requirements: 6.5 - Trigger Chrome Extension to start recording
   */
  const handleNewGuideflow = async () => {
    setIsStartingRecording(true);
    setExtensionError(null);

    try {
      // Check if chrome.runtime is available (only in Chrome/Edge)
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        throw new Error('Chrome extension API not available. Please use Chrome or Edge browser.');
      }

      // Get the extension ID from environment variable or use a default
      // In production, this should be configured via environment variable
      const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID || 'YOUR_EXTENSION_ID_HERE';

      // Send message to Chrome Extension to start recording
      // Requirements: 6.5 - Use chrome.runtime.sendMessage to communicate with extension
      chrome.runtime.sendMessage(
        extensionId,
        { type: 'START_RECORDING_FROM_DASHBOARD' },
        (response) => {
          if (chrome.runtime.lastError) {
            // Extension not installed or not responding
            console.error('Extension error:', chrome.runtime.lastError);
            setExtensionError(
              'Acro Chrome Extension is not installed or not responding. Please install the extension first.'
            );
            setIsStartingRecording(false);
            return;
          }

          if (response && response.success) {
            console.log('Recording started successfully');
            // Optionally show a success message or redirect
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
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <CompactErrorBoundary context="Sidebar">
          <Sidebar 
            selectedFolderId={selectedFolderId}
            onFolderSelect={setSelectedFolderId}
            onProjectDrop={handleProjectDrop}
          />
        </CompactErrorBoundary>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {/* Header with New Guideflow Button */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedFolderId ? 'Folder Projects' : 'All Projects'}
              </h1>
              <p className="text-gray-600 mt-2">
                {selectedFolderId 
                  ? `Showing projects in selected folder (ID: ${selectedFolderId})`
                  : 'Showing all projects'
                }
              </p>
            </div>

            {/* New Guideflow Button */}
            {/* Requirements: 6.5 - Create "New guideflow" button in dashboard header */}
            <button
              onClick={handleNewGuideflow}
              disabled={isStartingRecording}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isStartingRecording ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Guideflow
                </>
              )}
            </button>
          </div>

          {/* Extension Error Message */}
          {extensionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Extension Error</h3>
                  <p className="text-sm text-red-700 mt-1">{extensionError}</p>
                </div>
                <button
                  onClick={() => setExtensionError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Project Grid */}
          <CompactErrorBoundary context="Project Grid">
            <ProjectGrid folderId={selectedFolderId} key={selectedFolderId} />
          </CompactErrorBoundary>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
