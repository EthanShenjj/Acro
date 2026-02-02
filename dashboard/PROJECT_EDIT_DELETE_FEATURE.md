# Project Edit & Delete Feature

## Overview
Added visible edit and delete buttons to project cards in the dashboard for better discoverability and user experience.

## Changes Made

### 1. Enhanced ProjectCard Component (`dashboard/components/ProjectCard.tsx`)

#### Added Hover-Based Action Buttons
- **Edit Button**: Pencil icon that appears on hover, triggers rename functionality
- **Delete Button**: Trash icon that appears on hover, moves project to trash with confirmation
- **Restore Button**: For items in trash, shows restore icon on hover

#### Visual Design
- Buttons appear in the top-right corner of the project thumbnail
- Smooth opacity transition on hover (opacity-0 to opacity-100)
- White circular buttons with shadow for visibility
- Icon colors: gray for edit, red for delete, blue for restore
- Hover effects: gray background for edit, red tint for delete, blue tint for restore

#### User Experience Improvements
- **Confirmation Dialog**: Added confirmation prompt before deleting to prevent accidental deletions
- **Error Handling**: Shows alert if deletion fails
- **Loading State**: Disables interactions during operations
- **Context Menu**: Right-click menu still available as alternative

## Features

### Edit (Rename) Functionality
1. Click the edit button (pencil icon) on project card hover
2. Input field appears inline for quick editing
3. Press Enter to save, Escape to cancel
4. Click outside to save changes
5. Optimistic UI updates with rollback on error

### Delete Functionality
1. Click the delete button (trash icon) on project card hover
2. Confirmation dialog appears
3. Project moves to Trash folder (soft delete)
4. Removed from current view immediately
5. Can be restored from Trash folder

### Restore Functionality (Trash Only)
1. In Trash folder, hover over project card
2. Click restore button (circular arrow icon)
3. Project moves back to "All Flows" folder
4. Removed from Trash view immediately

## Technical Details

### CSS Classes Used
- `group`: Parent container for hover effects
- `group-hover:opacity-100`: Shows buttons on parent hover
- `transition-opacity duration-200`: Smooth fade-in animation

### Button Structure
```tsx
<button
  onClick={(e) => {
    e.stopPropagation(); // Prevent card click
    handleAction();
  }}
  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
  title="Action Name"
>
  <svg>...</svg>
</button>
```

## API Integration

Uses existing API methods from `DashboardAPI`:
- `updateProject(id, { title })` - For rename
- `updateProject(id, { folderId })` - For delete (move to trash)
- `restoreProject(id, folderId)` - For restore from trash

## Testing Recommendations

1. **Edit Flow**:
   - Hover over project card → edit button appears
   - Click edit → inline input appears
   - Type new name → press Enter → name updates
   - Verify name persists after page refresh

2. **Delete Flow**:
   - Hover over project card → delete button appears
   - Click delete → confirmation dialog appears
   - Confirm → project moves to Trash
   - Check Trash folder → project appears there

3. **Restore Flow**:
   - Navigate to Trash folder
   - Hover over project → restore button appears
   - Click restore → project moves to All Flows
   - Check All Flows → project appears there

4. **Error Handling**:
   - Test with network disconnected
   - Verify error messages appear
   - Verify UI rolls back to previous state

## Browser Compatibility

- Modern browsers with CSS Grid and Flexbox support
- Tailwind CSS utility classes
- SVG icons for cross-browser compatibility
