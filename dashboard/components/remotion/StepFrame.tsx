import React from 'react';
import { AbsoluteFill, Audio, Img, useCurrentFrame } from 'remotion';
import { MouseCursor } from './MouseCursor';
import { ClickRipple } from './ClickRipple';

interface Step {
  id: number;
  projectId: number;
  orderIndex: number;
  actionType: 'click' | 'scroll';
  targetText: string;
  scriptText: string;
  audioUrl: string;
  imageUrl: string;
  posX: number;
  posY: number;
  durationFrames: number;
}

export interface StepFrameProps {
  step: Step;
  previousStep?: Step;
}

export const StepFrame: React.FC<StepFrameProps> = ({ step, previousStep }) => {
  const frame = useCurrentFrame();
  
  // Calculate animation progress (first 60% of step duration)
  const animationDuration = Math.floor(step.durationFrames * 0.6);
  const isAnimating = frame < animationDuration;
  const showRipple = frame >= animationDuration && frame < animationDuration + 15;

  return (
    <AbsoluteFill>
      {/* Background screenshot */}
      <Img
        src={step.imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Mouse cursor animation */}
      <MouseCursor
        fromX={previousStep?.posX ?? step.posX}
        fromY={previousStep?.posY ?? step.posY}
        toX={step.posX}
        toY={step.posY}
        frame={frame}
        totalFrames={animationDuration}
      />

      {/* Click ripple effect */}
      {showRipple && (
        <ClickRipple
          x={step.posX}
          y={step.posY}
          frame={frame - animationDuration}
        />
      )}

      {/* Audio narration */}
      {step.audioUrl && (
        <Audio src={step.audioUrl} />
      )}
    </AbsoluteFill>
  );
};
