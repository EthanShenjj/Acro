'use client';

import React, { useState } from 'react';
import { Step } from '@/lib/types';
import { DashboardAPI } from '@/lib/api';

interface StepEditorProps {
  step: Step;
  onStepUpdate: (updatedStep: Step) => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({ step, onStepUpdate }) => {
  const [scriptText, setScriptText] = useState(step.scriptText);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiClient = new DashboardAPI();

  const handleSave = async () => {
    // Don't save if text hasn't changed
    if (scriptText === step.scriptText) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // POST to /api/steps/{id}/update_script
      const updatedStep = await apiClient.updateStepScript(step.id, scriptText);

      // Update parent component with new audio_url and duration_frames
      onStepUpdate(updatedStep);
      
      setIsEditing(false);
    } catch (err: any) {
      // Show error message on TTS failure
      setError(err.message || 'Failed to update script. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert to original text
    setScriptText(step.scriptText);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="mt-2">
      {!isEditing ? (
        <div
          className="text-sm text-gray-300 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
          onClick={() => setIsEditing(true)}
          title="Click to edit script"
        >
          {step.scriptText}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 text-sm bg-gray-700 text-gray-200 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            autoFocus
            disabled={isSaving}
          />
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Loading state during TTS generation */}
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
              <span>Generating audio...</span>
            </div>
          )}

          {/* Error message on TTS failure */}
          {error && (
            <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded border border-red-800">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
