/**
 * Type definitions for Acro Dashboard
 * 
 * These interfaces match the backend API models and are used
 * throughout the dashboard application.
 */

export interface Project {
  id: number;
  uuid: string;
  title: string;
  folderId: number;
  thumbnailUrl: string;
  createdAt: string;
  deletedAt: string | null;
  stepCount?: number;
}

export interface Folder {
  id: number;
  name: string;
  type: 'system' | 'user';
  createdAt: string;
}

export interface Step {
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

export interface ProjectDetails extends Project {
  steps: Step[];
  totalDurationFrames: number;
}

export interface DashboardState {
  projects: Project[];
  folders: Folder[];
  selectedFolderId: number | null;
  loading: boolean;
  error: string | null;
}

export interface APIError {
  message: string;
  status?: number;
  code?: string;
}

export interface ExportResponse {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  downloadUrl?: string;
  message?: string;
}

export interface ExportProgress {
  projectId: number;
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
}
