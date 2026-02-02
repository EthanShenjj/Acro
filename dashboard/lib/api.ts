import axios, { AxiosInstance, AxiosError } from 'axios';
import { Project, Folder, ProjectDetails, Step, APIError, ExportResponse } from './types';

/**
 * API Client for Acro Backend
 * 
 * This class provides methods to interact with the Acro backend API.
 * It handles all HTTP requests for projects, folders, and recording sessions.
 */
class DashboardAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Project Management Methods

  /**
   * Fetch all projects, optionally filtered by folder
   * @param folderId - Optional folder ID to filter projects
   * @returns Promise resolving to array of projects
   */
  async getProjects(folderId?: number): Promise<Project[]> {
    try {
      const params = folderId !== undefined ? { folderId } : {};
      const response = await this.client.get<{ projects: Project[] }>('/api/projects', { params });
      return response.data.projects;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetch a single project by ID
   * @param id - Project ID
   * @returns Promise resolving to project details
   */
  async getProject(id: number): Promise<Project> {
    try {
      const response = await this.client.get<Project>(`/api/projects/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetch detailed project information including all steps
   * @param id - Project ID (number) or UUID (string)
   * @returns Promise resolving to project details with steps
   */
  async getProjectDetails(id: number | string): Promise<ProjectDetails> {
    try {
      const response = await this.client.get<ProjectDetails>(`/api/projects/${id}/details`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new project
   * @param data - Partial project data
   * @returns Promise resolving to created project
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const response = await this.client.post<Project>('/api/projects', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing project
   * @param id - Project ID
   * @param data - Partial project data to update
   * @returns Promise resolving to updated project
   */
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    try {
      const response = await this.client.put<Project>(`/api/projects/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Soft delete a project (moves to trash)
   * @param id - Project ID
   * @returns Promise resolving when deletion is complete
   */
  async deleteProject(id: number): Promise<void> {
    try {
      await this.client.delete(`/api/projects/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Restore a project from trash
   * @param id - Project ID
   * @param folderId - Folder ID to restore to (defaults to All Flows)
   * @returns Promise resolving to restored project
   */
  async restoreProject(id: number, folderId: number): Promise<Project> {
    try {
      const response = await this.client.put<Project>(`/api/projects/${id}`, {
        folderId,
        deletedAt: null,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Permanently delete all projects in trash
   * @returns Promise resolving when all trash projects are deleted
   */
  async emptyTrash(): Promise<void> {
    try {
      await this.client.delete('/api/projects/trash');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Folder Management Methods

  /**
   * Fetch all folders
   * @returns Promise resolving to array of folders
   */
  async getFolders(): Promise<Folder[]> {
    try {
      const response = await this.client.get<{ folders: Folder[] }>('/api/folders');
      return response.data.folders;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new folder
   * @param name - Folder name
   * @returns Promise resolving to created folder
   */
  async createFolder(name: string): Promise<Folder> {
    try {
      const response = await this.client.post<Folder>('/api/folders', { name });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update folder name
   * @param id - Folder ID
   * @param name - New folder name
   * @returns Promise resolving to updated folder
   */
  async updateFolder(id: number, name: string): Promise<Folder> {
    try {
      const response = await this.client.put<Folder>(`/api/folders/${id}`, { name });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Step Management Methods

  /**
   * Update step script text and regenerate TTS audio
   * @param id - Step ID
   * @param scriptText - New script text
   * @returns Promise resolving to updated step with new audio URL and duration
   */
  async updateStepScript(id: number, scriptText: string): Promise<Step> {
    try {
      const response = await this.client.post<Step>(`/api/steps/${id}/update_script`, { scriptText });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Export Methods

  /**
   * Export project as MP4 video
   * @param id - Project ID
   * @returns Promise resolving to export response with status and download URL
   */
  async exportProject(id: number): Promise<{ downloadUrl: string }> {
    try {
      const response = await this.client.post<{ downloadUrl: string }>(`/api/projects/${id}/export`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error Handling

  /**
   * Handle API errors and convert to user-friendly messages
   * @param error - Error from axios request
   * @returns APIError with appropriate message
   */
  private handleError(error: unknown): APIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      // Network error (no response from server)
      if (!axiosError.response) {
        return {
          message: 'Network error, please check your connection',
          status: 0,
          code: 'NETWORK_ERROR',
        };
      }

      const status = axiosError.response.status;
      const responseMessage = axiosError.response.data?.message;

      // 4xx errors - client errors
      if (status >= 400 && status < 500) {
        return {
          message: responseMessage || `Client error: ${status}`,
          status,
          code: 'CLIENT_ERROR',
        };
      }

      // 5xx errors - server errors
      if (status >= 500) {
        return {
          message: 'Server error, please try again later',
          status,
          code: 'SERVER_ERROR',
        };
      }

      // Other errors
      return {
        message: responseMessage || 'An unexpected error occurred',
        status,
        code: 'UNKNOWN_ERROR',
      };
    }

    // Non-axios errors
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export { DashboardAPI };
