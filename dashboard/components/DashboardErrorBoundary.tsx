'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Dashboard-specific Error Boundary
 * Requirements: 24.1, 24.2, 24.3 - Display user-friendly error messages for dashboard
 */
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      context="Dashboard"
      fallback={(error, errorInfo, retry) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Dashboard Error
              </h2>
              
              <p className="text-gray-600 mb-6">
                We encountered an error while loading the dashboard. This might be due to a network issue or a problem with your data.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
                <p className="text-sm text-red-800 font-mono break-words">
                  {error.message || 'Unknown error'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={retry}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Reload Dashboard
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Go to Home
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('Dashboard Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
