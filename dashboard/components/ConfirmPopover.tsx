import React, { useEffect, useRef } from 'react';

interface ConfirmPopoverProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  position: { x: number; y: number };
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export default function ConfirmPopover({
  message,
  onConfirm,
  onCancel,
  position,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700'
}: ConfirmPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    // Add small delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px] max-w-[320px]"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)'
      }}
    >
      {/* Arrow */}
      <div
        className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
        style={{ width: 0, height: 0 }}
      >
        <div
          className="absolute"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white',
            filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))',
            transform: 'translateX(-8px) translateY(-1px)'
          }}
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`px-3 py-1.5 text-sm text-white rounded transition-colors ${confirmButtonClass}`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}
