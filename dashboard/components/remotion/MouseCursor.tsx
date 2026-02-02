import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';

export interface MouseCursorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  frame: number;
  totalFrames: number;
}

// Easing function for smooth acceleration/deceleration
const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const MouseCursor: React.FC<MouseCursorProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  frame,
  totalFrames,
}) => {
  // Calculate progress with easing
  const progress = Math.min(frame / totalFrames, 1);
  const easedProgress = easeInOutCubic(progress);

  // Interpolate position
  const x = interpolate(easedProgress, [0, 1], [fromX, toX]);
  const y = interpolate(easedProgress, [0, 1], [fromY, toY]);

  return (
    <AbsoluteFill>
      <svg
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 24,
          height: 24,
          transform: 'translate(-4px, -4px)',
          pointerEvents: 'none',
        }}
        viewBox="0 0 24 24"
        fill="none"
      >
        {/* Cursor pointer */}
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill="white"
          stroke="black"
          strokeWidth="1"
        />
      </svg>
    </AbsoluteFill>
  );
};
