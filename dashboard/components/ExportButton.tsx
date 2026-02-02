'use client';

import React, { useState } from 'react';
import { DashboardAPI } from '@/lib/api';

interface ExportButtonProps {
  projectId: number;
  projectTitle: string;
}

/**
 * ExportButton Component
 * 
 * Handles video export functionality with progress indication and error handling.
 * Triggers backend rendering and initiates browser download when complete.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ projectId, projectTitle }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const apiClient = new DashboardAPI();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      setError(null);

      // Simulate progress updates while waiting for backend
      // In a real implementation, this would poll the backend for actual progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Send export request to backend
      const response = await apiClient.exportProject(projectId);

      // Clear progress simulation
      clearInterval(progressInterval);
      setProgress(100);

      // Trigger browser download
      if (response.downloadUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Reset state after successful download
        setTimeout(() => {
          setIsExporting(false);
          setProgress(0);
        }, 1000);
      } else {
        throw new Error('No download URL received from server');
      }
    } catch (err: any) {
      // Handle export failures
      setError(err.message || 'Export failed, please try again');
      setProgress(0);
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setError(null);
        setIsExporting(false);
      }, 5000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`
          px-6 py-3 rounded-lg font-semibold text-white
          transition-all duration-200 flex items-center gap-2
          ${
            isExporting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }
        `}
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Exporting... {progress}%</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export Video</span>
          </>
        )}
      </button>

      {/* Progress bar */}
      {isExporting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
