# Editor Setup Documentation

## Overview

The Acro video editor is built using Next.js 14 and Remotion 4.x. It provides a web-based interface for previewing and editing demo videos created with the Chrome extension.

## Architecture

### Directory Structure

```
dashboard/
├── app/
│   └── editor/
│       └── [projectId]/
│           └── page.tsx          # Main editor page (dynamic route)
├── components/
│   └── remotion/
│       ├── AcroVideo.tsx         # Main composition component
│       ├── StepFrame.tsx         # Individual step renderer
│       ├── MouseCursor.tsx       # Animated cursor component
│       └── ClickRipple.tsx       # Click feedback animation
├── remotion/
│   ├── index.ts                  # Remotion entry point
│   └── Root.tsx                  # Composition registration
└── remotion.config.ts            # Remotion configuration
```

## Components

### 1. Editor Page (`app/editor/[projectId]/page.tsx`)

The main editor page that:
- Loads project data from the backend API
- Displays loading and error states
- Renders the Remotion Player with the video composition
- Provides auto-play functionality

**Key Features:**
- Dynamic routing with `[projectId]` parameter
- Error handling with retry functionality
- Responsive layout with proper aspect ratio (16:9)
- Back to dashboard navigation

### 2. AcroVideo Composition (`components/remotion/AcroVideo.tsx`)

The main Remotion composition that:
- Receives an array of steps as input props
- Calculates start frames for each step based on cumulative duration
- Renders each step as a Remotion Sequence
- Passes previous step data for smooth mouse transitions

**Properties:**
- `steps`: Array of Step objects containing all recording data

### 3. StepFrame Component (`components/remotion/StepFrame.tsx`)

Renders an individual step with:
- Background screenshot image
- Animated mouse cursor
- Click ripple effect (appears after cursor reaches target)
- Audio narration synchronized with visuals

**Animation Timing:**
- First 60% of step duration: Mouse cursor animation
- Remaining 40%: Audio continues, cursor stays at target
- 15 frames (500ms): Click ripple animation

### 4. MouseCursor Component (`components/remotion/MouseCursor.tsx`)

Animates the mouse cursor with:
- Smooth interpolation from previous position to current position
- `easeInOutCubic` easing function for natural movement
- SVG cursor pointer graphic
- Proper positioning and transform

### 5. ClickRipple Component (`components/remotion/ClickRipple.tsx`)

Displays click feedback with:
- Expanding red circle animation
- Fading opacity over 15 frames
- Centered at click coordinates

## Remotion Configuration

### Video Settings

- **FPS**: 30 frames per second
- **Resolution**: 1920x1080 (Full HD)
- **Format**: PNG for video images
- **Concurrency**: 2 (for rendering)

### Composition Registration

The `remotion/Root.tsx` file registers the AcroVideo composition with default props. This is required for Remotion CLI tools to work.

## API Integration

### Endpoint: `GET /api/projects/{id}/details`

**Response Format:**
```json
{
  "id": 42,
  "uuid": "project-uuid",
  "title": "Demo Title",
  "steps": [
    {
      "id": 1,
      "orderIndex": 1,
      "actionType": "click",
      "targetText": "Submit Button",
      "scriptText": "Click the submit button",
      "audioUrl": "/static/audio/step-1.mp3",
      "imageUrl": "/static/images/step-1.png",
      "posX": 450,
      "posY": 320,
      "durationFrames": 120
    }
  ]
}
```

## Usage

### Development

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/editor/[projectId]`

### Remotion Studio (Optional)

To preview compositions in Remotion Studio:
```bash
npm run remotion:studio
```

### Video Rendering (Optional)

To render a video file:
```bash
npm run remotion:render
```

## Error Handling

The editor implements comprehensive error handling:

1. **Loading State**: Displays spinner while fetching project data
2. **Error State**: Shows error message with retry button
3. **Empty State**: Handles projects with no steps
4. **Network Errors**: Provides user-friendly error messages
5. **Back Navigation**: Always provides a way back to dashboard

## Requirements Validation

This implementation satisfies **Requirement 9.1**:
- ✅ Editor page created at `app/editor/[projectId]/page.tsx`
- ✅ Remotion dependencies installed
- ✅ Remotion configuration set up
- ✅ Composition structure created with proper component hierarchy

## Next Steps

The following tasks will extend the editor functionality:
- Task 31: Implement project data loading (already partially complete)
- Task 32: Implement Remotion video composition (already complete)
- Task 33: Implement step frame rendering with mouse animation (already complete)
- Task 34: Implement mouse cursor animation (already complete)
- Task 35: Implement step list sidebar
- Task 36: Implement video playback controls
- Task 37: Implement script editing functionality
- Task 38: Implement video export functionality

## Technical Notes

### Mouse Animation

The mouse cursor uses an easing function for smooth, natural movement:
```typescript
const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
```

This creates acceleration at the start and deceleration at the end of the movement.

### Frame Calculation

Start frames are calculated by summing the durations of all previous steps:
```typescript
const startFrame = steps
  .slice(0, index)
  .reduce((sum, s) => sum + s.durationFrames, 0);
```

This ensures steps play sequentially without gaps or overlaps.

### Audio Synchronization

Audio is automatically synchronized with visuals by Remotion's `<Audio>` component, which starts playback at the beginning of each Sequence.
