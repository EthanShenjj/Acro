'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AcroVideo } from '@/components/remotion/AcroVideo';
import { VideoPlayer } from '@/components/VideoPlayer';
import { StepList } from '@/components/StepList';
import { ExportButton } from '@/components/ExportButton';
import { DashboardAPI } from '@/lib/api';
import Link from 'next/link';
import { EditorSidebar } from '@/components/EditorSidebar';
import { BrowserFrame } from '@/components/BrowserFrame';
import { ProjectDetails, Step } from '@/lib/types';
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary';
import { CompactErrorBoundary } from '@/components/ErrorBoundary';

function EditorPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const sessionId = searchParams.get('sessionId');

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const apiClient = useRef(new DashboardAPI());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll recording status if sessionId is present
  useEffect(() => {
    if (!sessionId) return;

    const pollRecordingStatus = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiBaseUrl}/api/recording/status/${sessionId}`);

        if (!response.ok) {
          throw new Error('Failed to check recording status');
        }

        const data = await response.json();

        if (data.status === 'completed') {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Load the project
          setProcessing(false);
          setProcessingProgress(100);

          // Remove sessionId from URL
          window.history.replaceState({}, '', `/editor/${projectId}`);

          // Trigger project load
          loadProject();
        } else {
          // Update progress (simulate progress based on time)
          setProcessingProgress(prev => Math.min(prev + 10, 90));
        }
      } catch (err) {
        console.error('Failed to poll recording status:', err);
        // Continue polling, don't fail
      }
    };

    // Start polling
    setProcessing(true);
    setProcessingProgress(10);
    pollRecordingStatus(); // Initial check
    pollingIntervalRef.current = setInterval(pollRecordingStatus, 1000); // Poll every second

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [sessionId, projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use projectId directly (can be UUID or numeric ID)
      // The API now supports both formats
      const data = await apiClient.current.getProjectDetails(projectId);

      // Transform relative URLs to absolute URLs for Remotion
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const stepsWithAbsoluteUrls = data.steps.map(step => ({
        ...step,
        imageUrl: step.imageUrl.startsWith('http') ? step.imageUrl : `${apiBaseUrl}${step.imageUrl}`,
        audioUrl: step.audioUrl.startsWith('http') ? step.audioUrl : `${apiBaseUrl}${step.audioUrl}`,
      }));

      // Calculate total duration
      const totalDurationFrames = stepsWithAbsoluteUrls.reduce(
        (sum, step) => sum + step.durationFrames,
        0
      );

      // Initialize Remotion composition with Step data
      setProject({
        ...data,
        steps: stepsWithAbsoluteUrls,
        totalDurationFrames,
      });
    } catch (err: any) {
      // Handle API errors with user-friendly messages
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load project if not processing (no sessionId)
    if (projectId && !sessionId) {
      loadProject();
    }
  }, [projectId, sessionId]);

  const handleFrameUpdate = (frame: number) => {
    setCurrentFrame(frame);
  };

  const handleStepClick = (startFrame: number) => {
    // The VideoPlayer component will handle seeking internally
    // We just need to update the current frame state
    setCurrentFrame(startFrame);
  };

  const handleStepUpdate = (updatedStep: Step) => {
    if (!project) return;

    // Update the step in the project's steps array
    const updatedSteps = project.steps.map((step) =>
      step.id === updatedStep.id ? updatedStep : step
    );

    // Recalculate total duration with updated step
    const totalDurationFrames = updatedSteps.reduce(
      (sum, step) => sum + step.durationFrames,
      0
    );

    // Update Remotion composition with new audio and duration
    setProject({
      ...project,
      steps: updatedSteps,
      totalDurationFrames,
    });
  };

  const handleRetry = () => {
    setError(null);
    loadProject();
  };

  // Show processing state
  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - processingProgress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">{processingProgress}%</span>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Recording</h2>
            <p className="text-gray-600">
              Generating thumbnails and preparing your demo video...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="animate-pulse">●</div>
            <span>This usually takes a few seconds</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Failed to load project</h2>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="ml-4 text-blue-600 hover:text-blue-700 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!project || !project.steps || project.steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        {/* Top Header - Same as main view */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900">{project?.title || 'New guideflow'}</h1>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <p className="text-[10px] text-gray-500">ethan shen</p>
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            {['Create', 'Preview', 'Analytics', 'Leads', 'Visitors'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'Create' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
              {[
                <svg key="more" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>,
                <svg key="lang" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6" /><path d="M4 14l6-6" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>,
                <svg key="play" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              ].map((icon, i) => (
                <button key={i} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">{icon}</button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              Improve with AI
            </button>
            <button className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 shadow-sm transition-all">Share</button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <EditorSidebar steps={[]} />

          <main className="flex-1 p-8 overflow-auto flex flex-col items-center">
            <div className="w-full max-w-5xl h-full">
              <BrowserFrame url={project?.title || 'New guideflow'}>
                <div className="flex flex-col items-center justify-center p-20 text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm relative z-10">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </div>
                    {/* Stacked cards effect */}
                    <div className="absolute top-1 left-1 w-16 h-16 bg-white border border-gray-100 rounded-2xl -z-10 opacity-60"></div>
                    <div className="absolute top-2 left-2 w-16 h-16 bg-white border border-gray-100 rounded-2xl -z-20 opacity-30"></div>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-2">Add a step</h2>
                  <p className="text-gray-500 mb-8 max-w-xs">
                    Add actionable steps to help users understand what to do.
                  </p>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 shadow-sm transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                      Capture new flow
                    </button>

                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      Upload new media
                    </button>

                    <div className="flex flex-col gap-2 mt-2">
                      {[
                        { name: 'Windows App', icon: <path d="M3 3h18v18H3zM3 12h18M12 3v18" /> },
                        { name: 'MacOS App', icon: <path d="M12 20.94c1.88-1.59 3.14-4.22 3.14-7.22 0-3-1.26-5.63-3.14-7.22m-6.28 0c-1.88 1.59-3.14 4.22-3.14 7.22 0 3 1.26 5.63 3.14 7.22M2 12h20" /> },
                        { name: 'Figma Plugin', icon: <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5zM12 9h3.5A3.5 3.5 0 1 1 19 12.5 3.5 3.5 0 0 1 15.5 16H12V9zM5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5zM5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" /> }
                      ].map((item) => (
                        <button key={item.name} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors text-xs text-gray-600 font-medium">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </BrowserFrame>
            </div>
          </main>

          <aside className="w-14 bg-white border-l border-gray-200 flex flex-col items-center py-4 gap-6">
            {[
              <svg key="1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><line x1="2" y1="12" x2="22" y2="12" /></svg>,
              <svg key="2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
              <svg key="3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            ].map((icon, i) => (
              <button key={i} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">{icon}</button>
            ))}
            <div className="mt-auto mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] uppercase font-bold">ES</div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900">{project.title}</h1>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </div>
            <p className="text-[10px] text-gray-500">ethan shen</p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          {['Create', 'Preview', 'Analytics', 'Leads', 'Visitors'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'Create' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
            {[
              <svg key="more" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>,
              <svg key="lang" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6" /><path d="M4 14l6-6" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>,
              <svg key="play" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            ].map((icon, i) => (
              <button key={i} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                {icon}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            Improve with AI
          </button>

          <button className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 shadow-sm transition-all">
            Share
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <EditorSidebar steps={project.steps} onStepClick={handleStepClick} />

        {/* Main Workspace */}
        <main className="flex-1 p-8 overflow-auto flex flex-col items-center">
          <div className="w-full max-w-5xl">
            <BrowserFrame url={project.title}>
              <div className="aspect-video bg-white flex items-center justify-center relative">
                <CompactErrorBoundary context="Video Player">
                  <VideoPlayer
                    component={AcroVideo}
                    inputProps={{
                      steps: project.steps,
                    }}
                    durationInFrames={project.totalDurationFrames}
                    fps={30}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    onFrameUpdate={handleFrameUpdate}
                  />
                </CompactErrorBoundary>
              </div>
            </BrowserFrame>
          </div>
        </main>

        {/* Right Tool Sidebar (Icons only as per design) */}
        <aside className="w-14 bg-white border-l border-gray-200 flex flex-col items-center py-4 gap-6">
          {[
            <svg key="1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><line x1="2" y1="12" x2="22" y2="12" /></svg>,
            <svg key="2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
            <svg key="3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          ].map((icon, i) => (
            <button key={i} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              {icon}
            </button>
          ))}

          <div className="mt-auto mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] uppercase font-bold">
              ES
            </div>
          </div>
        </aside>
      </div>

      {/* Absolute floating Step List for selection (Optional, can be integrated better) */}
      {/* Since design shows a very clean workspace, maybe we keep StepList hidden or as a toggle */}
    </div>
  );
}

export default function EditorPage() {
  return (
    <EditorErrorBoundary>
      <EditorPageContent />
    </EditorErrorBoundary>
  );
}
