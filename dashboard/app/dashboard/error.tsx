'use client';

import { useEffect } from 'react';

/**
 * Dashboard Route Error Page
 * Requirements: 24.1, 24.2, 24.3 - Display user-friendly error messages
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Dashboard Error
          </h2>
          
          <p className="text-gray-600 mb-6">
            We encountered an error while loading your dashboard. This might be due to a network issue or a problem with your projects.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
            <p className="text-sm text-red-800 font-mono break-words">
              {error.message || 'Unknown error'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Reload Dashboard
            </button>
            <a
              href="/"
              className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
            >
              Go Home
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
