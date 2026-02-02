'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useRouter } from 'next/navigation';

/**
 * Editor-specific Error Boundary
 * Requirements: 24.1, 24.2, 24.3 - Display user-friendly error messages for editor
 */
export function EditorErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ErrorBoundary
      context="Video Editor"
      fallback={(error, errorInfo, retry) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
          <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/50 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
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
              
              <h2 className="text-2xl font-bold text-white mb-2">
                Editor Error
              </h2>
              
              <p className="text-gray-300 mb-6">
                We encountered an error while loading the video editor. This might be due to corrupted project data or a rendering issue.
              </p>

              <div className="bg-red-900/30 border border-red-700 rounded-md p-4 mb-6 text-left">
                <p className="text-sm text-red-300 font-mono break-words">
                  {error.message || 'Unknown error'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={retry}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Reload Editor
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-gray-700 text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Back to Dashboard
                </button>
              </div>

              <p className="text-sm text-gray-400 mt-6">
                Try reloading the editor or return to the dashboard to select a different project.
              </p>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('Editor Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
