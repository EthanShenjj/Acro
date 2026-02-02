'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AcroVideo } from '@/components/remotion/AcroVideo';
import { VideoPlayer } from '@/components/VideoPlayer';
import { StepList } from '@/components/StepList';
import { ExportButton } from '@/components/ExportButton';
import { DashboardAPI } from '@/lib/api';
import { ProjectDetails, Step } from '@/lib/types';
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary';
import { CompactErrorBoundary } from '@/components/ErrorBoundary';

function EditorPageContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const apiClient = useRef(new DashboardAPI());

  useEffect(() => {
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

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

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
    setLoading(true);
    // Re-trigger the useEffect by forcing a re-render
    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const numericId = parseInt(projectId, 10);
        const data = await apiClient.current.getProjectDetails(numericId);
        
        // Transform relative URLs to absolute URLs for Remotion
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const stepsWithAbsoluteUrls = data.steps.map(step => ({
          ...step,
          imageUrl: step.imageUrl.startsWith('http') ? step.imageUrl : `${apiBaseUrl}${step.imageUrl}`,
          audioUrl: step.audioUrl.startsWith('http') ? step.audioUrl : `${apiBaseUrl}${step.audioUrl}`,
        }));
        
        const totalDurationFrames = stepsWithAbsoluteUrls.reduce(
          (sum, step) => sum + step.durationFrames,
          0
        );
        
        setProject({
          ...data,
          steps: stepsWithAbsoluteUrls,
          totalDurationFrames,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  };

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No steps found in this project</p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="返回管理首页"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>返回</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
                <p className="text-gray-600">
                  {project.steps.length} steps • {Math.round(project.totalDurationFrames / 30)} seconds
                </p>
              </div>
            </div>
            <CompactErrorBoundary context="Export">
              <ExportButton projectId={project.id} projectTitle={project.title} />
            </CompactErrorBoundary>
          </div>

          <CompactErrorBoundary context="Video Player">
            <div className="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200">
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
            </div>
          </CompactErrorBoundary>
        </div>
      </div>

      {/* Step list sidebar */}
      <CompactErrorBoundary context="Step List">
        <StepList
          steps={project.steps}
          currentFrame={currentFrame}
          onStepClick={handleStepClick}
          onStepUpdate={handleStepUpdate}
        />
      </CompactErrorBoundary>
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
