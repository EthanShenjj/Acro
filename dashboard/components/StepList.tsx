'use client';

import React, { useState } from 'react';
import { List } from 'react-window';
import { Step } from '@/lib/types';
import { StepEditor } from './StepEditor';

interface StepListProps {
  steps: Step[];
  currentFrame: number;
  onStepClick: (startFrame: number) => void;
  onStepUpdate?: (updatedStep: Step) => void;
}

export const StepList: React.FC<StepListProps> = ({
  steps,
  currentFrame,
  onStepClick,
  onStepUpdate,
}) => {
  const [hoveredStepId, setHoveredStepId] = useState<number | null>(null);

  // Sort steps by order_index in ascending order
  const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

  // Calculate start frame for each step
  const getStepStartFrame = (stepIndex: number): number => {
    return sortedSteps
      .slice(0, stepIndex)
      .reduce((sum, step) => sum + step.durationFrames, 0);
  };

  // Determine which step is currently playing
  const getCurrentStepIndex = (): number => {
    let cumulativeFrames = 0;
    for (let i = 0; i < sortedSteps.length; i++) {
      const stepEndFrame = cumulativeFrames + sortedSteps[i].durationFrames;
      if (currentFrame >= cumulativeFrames && currentFrame < stepEndFrame) {
        return i;
      }
      cumulativeFrames = stepEndFrame;
    }
    // If we're past all steps, highlight the last one
    return sortedSteps.length - 1;
  };

  const currentStepIndex = getCurrentStepIndex();

  const handleStepClick = (stepIndex: number) => {
    const startFrame = getStepStartFrame(stepIndex);
    onStepClick(startFrame);
  };

  // Determine if we should use virtual scrolling (> 50 steps)
  const useVirtualScrolling = sortedSteps.length > 50;
  const ITEM_HEIGHT = 200; // Approximate height of each step item

  // Render individual step item
  const renderStepItem = (step: Step, index: number) => {
    const isCurrentStep = index === currentStepIndex;
    const isHovered = hoveredStepId === step.id;

    return (
      <div
        key={step.id}
        className={`
          relative p-4 cursor-pointer transition-colors border-b border-gray-700
          ${isCurrentStep ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-gray-750'}
        `}
        onClick={() => handleStepClick(index)}
        onMouseEnter={() => setHoveredStepId(step.id)}
        onMouseLeave={() => setHoveredStepId(null)}
      >
        {/* Step number indicator */}
        <div className="flex items-start gap-3">
          <div
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${isCurrentStep ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}
            `}
          >
            {step.orderIndex}
          </div>

          <div className="flex-1 min-w-0">
            {/* Thumbnail */}
            <div className="mb-2">
              <img
                src={step.imageUrl}
                alt={`Step ${step.orderIndex}`}
                className="w-full h-20 object-cover rounded border border-gray-600"
              />
            </div>

            {/* Script text preview */}
            <p className="text-sm text-gray-300 line-clamp-2">
              {step.scriptText}
            </p>

            {/* Editable script text */}
            {onStepUpdate && (
              <StepEditor step={step} onStepUpdate={onStepUpdate} />
            )}

            {/* Action type badge */}
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                {step.actionType}
              </span>
            </div>
          </div>
        </div>

        {/* Tooltip with full script text on hover */}
        {isHovered && step.scriptText.length > 60 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 p-3 bg-gray-900 border border-gray-600 rounded shadow-lg text-sm text-gray-200">
            {step.scriptText}
          </div>
        )}

        {/* Current step indicator */}
        {isCurrentStep && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
        )}
      </div>
    );
  };

  // Row renderer for react-window v2
  const RowComponent = ({ 
    index, 
    style,
    ariaAttributes 
  }: { 
    index: number; 
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const step = sortedSteps[index];
    return (
      <div style={style} {...ariaAttributes}>
        {renderStepItem(step, index)}
      </div>
    );
  };

  return (
    <div className="w-80 bg-gray-800 h-full border-l border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">Steps</h2>
        <p className="text-sm text-gray-400">
          {sortedSteps.length} total
          {useVirtualScrolling && ' (virtual scrolling enabled)'}
        </p>
      </div>

      {useVirtualScrolling ? (
        // Virtual scrolling for large projects (> 50 steps)
        <List
          defaultHeight={window.innerHeight - 100} // Subtract header height
          rowCount={sortedSteps.length}
          rowHeight={ITEM_HEIGHT}
          rowComponent={RowComponent}
          rowProps={{}}
          style={{ flex: 1 }}
        />
      ) : (
        // Regular scrolling for smaller projects
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-700">
            {sortedSteps.map((step, index) => renderStepItem(step, index))}
          </div>
        </div>
      )}
    </div>
  );
};
