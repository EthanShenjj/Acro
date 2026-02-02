'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { Step } from '@/lib/types';

interface VideoPlayerProps {
  component: React.ComponentType<any>;
  inputProps: {
    steps: Step[];
  };
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  onFrameUpdate?: (frame: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  component,
  inputProps,
  durationInFrames,
  fps,
  compositionWidth,
  compositionHeight,
  onFrameUpdate,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Update progress bar position during playback
  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const frame = playerRef.current?.getCurrentFrame();
      if (frame !== undefined && !isDragging) {
        setCurrentFrame(frame);
        onFrameUpdate?.(frame);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isDragging, onFrameUpdate]);

  // Handle play/pause button with state toggle
  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Implement progress bar with seek functionality
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetFrame = Math.floor(percentage * durationInFrames);

    playerRef.current.seekTo(targetFrame);
    setCurrentFrame(targetFrame);
  };

  const handleProgressBarDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressBarClick(e);
  };

  const handleProgressBarDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleProgressBarClick(e);
  };

  const handleProgressBarDragEnd = () => {
    setIsDragging(false);
  };

  // Implement playback speed selector (0.5x, 1x, 1.5x, 2x)
  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const progressPercentage = (currentFrame / durationInFrames) * 100;

  return (
    <div className="video-player-wrapper">
      {/* Remotion Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={component}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          style={{
            width: '100%',
            aspectRatio: '16/9',
          }}
          controls={false}
          showVolumeControls={false}
          clickToPlay={false}
          playbackRate={playbackSpeed}
        />
      </div>

      {/* Custom Controls */}
      <div className="mt-4 bg-gray-800 rounded-lg p-4">
        {/* Progress Bar */}
        <div
          className="relative h-2 bg-gray-700 rounded-full cursor-pointer mb-4"
          onClick={handleProgressBarClick}
          onMouseDown={handleProgressBarDragStart}
          onMouseMove={handleProgressBarDrag}
          onMouseUp={handleProgressBarDragEnd}
          onMouseLeave={handleProgressBarDragEnd}
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
            style={{ left: `${progressPercentage}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            )}
          </button>

          {/* Time Display */}
          <div className="text-sm text-gray-300">
            {formatTime(currentFrame, fps)} / {formatTime(durationInFrames, fps)}
          </div>

          {/* Playback Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Speed:</span>
            <div className="flex gap-1">
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handlePlaybackSpeedChange(speed)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format time from frames
function formatTime(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
