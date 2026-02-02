# Acro Dashboard

Web-based project management interface for the Acro SaaS Demo Video Creation Tool.

## Overview

The Acro Dashboard is built with Next.js 14 (App Router) and provides a centralized interface for managing demo video projects and organizing them into folders.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS with custom theme
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Language**: TypeScript

## Project Structure

```
dashboard/
├── app/
│   ├── dashboard/          # Dashboard page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/             # React components
│   └── README.md          # Component documentation
├── lib/
│   └── api.ts             # API client for backend communication
├── public/                # Static assets
└── tailwind.config.ts     # TailwindCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Acro backend running on http://localhost:5000

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_EXTENSION_ID=your_extension_id_here
```

### Getting the Extension ID

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Load the Acro Chrome Extension (from the `extension/` directory)
4. Copy the Extension ID shown under the extension name
5. Paste it into your `.env.local` file as `NEXT_PUBLIC_EXTENSION_ID`

**Note**: The "New Guideflow" button requires the Chrome Extension to be installed and the Extension ID to be configured.

## Features (Implementation Plan)

- ✅ Project setup with Next.js 14 and TailwindCSS
- ✅ Project grid view with thumbnails
- ✅ Folder-based organization
- ✅ Project CRUD operations (create, rename, delete, restore)
- ✅ Drag-and-drop folder assignment
- ✅ Integration with Chrome Extension for recording ("New Guideflow" button)

## Custom Theme

The dashboard uses a custom TailwindCSS theme with:

- Primary color palette (blue tones)
- Secondary color palette (gray tones)
- Success, error, and warning colors
- Custom spacing, shadows, and animations
- Responsive design utilities

## API Integration

The dashboard communicates with the Acro backend via REST API:

- `GET /api/projects` - Fetch all projects
- `GET /api/projects/:id` - Fetch project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Soft delete project
- `GET /api/folders` - Fetch all folders
- `POST /api/folders` - Create new folder
- `PUT /api/folders/:id` - Update folder

## Development Guidelines

1. Follow the implementation plan in `.kiro/specs/acro-saas-demo-video-tool/tasks.md`
2. Use TypeScript for type safety
3. Follow React best practices and hooks patterns
4. Use TailwindCSS utility classes for styling
5. Implement error handling for all API calls
6. Write tests for critical functionality

## License

Proprietary - Acro SaaS Demo Video Creation Tool

