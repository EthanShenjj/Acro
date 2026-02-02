import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { StepFrame } from './StepFrame';

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

export interface AcroVideoProps {
  steps: Step[];
}

export const AcroVideo: React.FC<AcroVideoProps> = ({ steps }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {steps.map((step, index) => {
        // Calculate start frame by summing durations of all previous steps
        const startFrame = steps
          .slice(0, index)
          .reduce((sum, s) => sum + s.durationFrames, 0);

        // Get previous step for mouse animation
        const previousStep = index > 0 ? steps[index - 1] : undefined;

        return (
          <Sequence
            key={step.id}
            from={startFrame}
            durationInFrames={step.durationFrames}
          >
            <StepFrame step={step} previousStep={previousStep} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
