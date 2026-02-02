import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';

export interface ClickRippleProps {
  x: number;
  y: number;
  frame: number;
}

export const ClickRipple: React.FC<ClickRippleProps> = ({ x, y, frame }) => {
  // Ripple expands over 15 frames (500ms at 30fps)
  const maxFrames = 15;
  const progress = Math.min(frame / maxFrames, 1);

  // Interpolate size and opacity
  const size = interpolate(progress, [0, 1], [0, 60]);
  const opacity = interpolate(progress, [0, 0.5, 1], [0.8, 0.6, 0]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '3px solid #FF0000',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          opacity,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
