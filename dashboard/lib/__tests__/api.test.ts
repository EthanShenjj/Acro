import fc from 'fast-check';
import axios, { AxiosError } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DashboardAPI } from '../api';

describe('DashboardAPI Error Handling', () => {
  let api: DashboardAPI;
  let mock: MockAdapter;

  beforeEach(() => {
    api = new DashboardAPI('http://localhost:5000');
    // Access the private client through type assertion for testing
    const apiWithClient = api as any;
    mock = new MockAdapter(apiWithClient.client);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Property 34: Error response mapping', () => {
    // Feature: acro-saas-demo-video-tool, Property 34: Error response mapping

    it('should map network errors to "Network error" message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '/api/projects',
            '/api/folders',
            '/api/projects/1',
            '/api/projects/1/details'
          ),
          async (endpoint) => {
            // Simulate network error (no response)
            mock.onGet(endpoint).networkError();

            try {
              if (endpoint === '/api/projects') {
                await api.getProjects();
              } else if (endpoint === '/api/folders') {
                await api.getFolders();
              } else if (endpoint === '/api/projects/1') {
                await api.getProject(1);
              } else if (endpoint === '/api/projects/1/details') {
                await api.getProjectDetails(1);
              }
              
              // Should not reach here
              expect(true).toBe(false);
            } catch (error: any) {
              expect(error.message).toBe('Network error, please check your connection');
              expect(error.code).toBe('NETWORK_ERROR');
              expect(error.status).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map 4xx errors to response message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 499 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(
            '/api/projects',
            '/api/folders',
            '/api/projects/1'
          ),
          async (statusCode, errorMessage, endpoint) => {
            // Simulate 4xx error with custom message
            mock.onGet(endpoint).reply(statusCode, { message: errorMessage });

            try {
              if (endpoint === '/api/projects') {
                await api.getProjects();
              } else if (endpoint === '/api/folders') {
                await api.getFolders();
              } else if (endpoint === '/api/projects/1') {
                await api.getProject(1);
              }
              
              // Should not reach here
              expect(true).toBe(false);
            } catch (error: any) {
              expect(error.message).toBe(errorMessage);
              expect(error.code).toBe('CLIENT_ERROR');
              expect(error.status).toBe(statusCode);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map 5xx errors to "Server error" message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 500, max: 599 }),
          fc.constantFrom(
            '/api/projects',
            '/api/folders',
            '/api/projects/1',
            '/api/projects/1/details'
          ),
          async (statusCode, endpoint) => {
            // Simulate 5xx error
            mock.onGet(endpoint).reply(statusCode, { message: 'Internal server error' });

            try {
              if (endpoint === '/api/projects') {
                await api.getProjects();
              } else if (endpoint === '/api/folders') {
                await api.getFolders();
              } else if (endpoint === '/api/projects/1') {
                await api.getProject(1);
              } else if (endpoint === '/api/projects/1/details') {
                await api.getProjectDetails(1);
              }
              
              // Should not reach here
              expect(true).toBe(false);
            } catch (error: any) {
              expect(error.message).toBe('Server error, please try again later');
              expect(error.code).toBe('SERVER_ERROR');
              expect(error.status).toBe(statusCode);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle 4xx errors without message field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 499 }),
          async (statusCode) => {
            // Simulate 4xx error without message
            mock.onGet('/api/projects').reply(statusCode, {});

            try {
              await api.getProjects();
              
              // Should not reach here
              expect(true).toBe(false);
            } catch (error: any) {
              expect(error.message).toContain(`Client error: ${statusCode}`);
              expect(error.code).toBe('CLIENT_ERROR');
              expect(error.status).toBe(statusCode);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('API Methods - Success Cases', () => {
    it('should successfully fetch projects', async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: 'test-uuid',
          title: 'Test Project',
          folderId: 1,
          thumbnailUrl: '/static/thumbnails/test.png',
          createdAt: '2024-01-01T00:00:00Z',
          deletedAt: null,
        },
      ];

      mock.onGet('/api/projects').reply(200, { projects: mockProjects });

      const projects = await api.getProjects();
      expect(projects).toEqual(mockProjects);
    });

    it('should successfully fetch projects with folder filter', async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: 'test-uuid',
          title: 'Test Project',
          folderId: 2,
          thumbnailUrl: '/static/thumbnails/test.png',
          createdAt: '2024-01-01T00:00:00Z',
          deletedAt: null,
        },
      ];

      mock.onGet('/api/projects', { params: { folderId: 2 } }).reply(200, { projects: mockProjects });

      const projects = await api.getProjects(2);
      expect(projects).toEqual(mockProjects);
    });

    it('should successfully fetch folders', async () => {
      const mockFolders = [
        { id: 1, name: 'All Flows', type: 'system' as const, createdAt: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Trash', type: 'system' as const, createdAt: '2024-01-01T00:00:00Z' },
      ];

      mock.onGet('/api/folders').reply(200, { folders: mockFolders });

      const folders = await api.getFolders();
      expect(folders).toEqual(mockFolders);
    });

    it('should successfully create a project', async () => {
      const newProject = {
        title: 'New Project',
        folderId: 1,
      };

      const createdProject = {
        id: 1,
        uuid: 'new-uuid',
        ...newProject,
        thumbnailUrl: '/static/thumbnails/new.png',
        createdAt: '2024-01-01T00:00:00Z',
        deletedAt: null,
      };

      mock.onPost('/api/projects').reply(200, createdProject);

      const result = await api.createProject(newProject);
      expect(result).toEqual(createdProject);
    });

    it('should successfully update a project', async () => {
      const updatedData = {
        title: 'Updated Title',
      };

      const updatedProject = {
        id: 1,
        uuid: 'test-uuid',
        title: 'Updated Title',
        folderId: 1,
        thumbnailUrl: '/static/thumbnails/test.png',
        createdAt: '2024-01-01T00:00:00Z',
        deletedAt: null,
      };

      mock.onPut('/api/projects/1').reply(200, updatedProject);

      const result = await api.updateProject(1, updatedData);
      expect(result).toEqual(updatedProject);
    });

    it('should successfully delete a project', async () => {
      mock.onDelete('/api/projects/1').reply(200);

      await expect(api.deleteProject(1)).resolves.not.toThrow();
    });

    it('should successfully create a folder', async () => {
      const newFolder = {
        id: 3,
        name: 'New Folder',
        type: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mock.onPost('/api/folders').reply(200, newFolder);

      const result = await api.createFolder('New Folder');
      expect(result).toEqual(newFolder);
    });

    it('should successfully update a folder', async () => {
      const updatedFolder = {
        id: 3,
        name: 'Renamed Folder',
        type: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mock.onPut('/api/folders/3').reply(200, updatedFolder);

      const result = await api.updateFolder(3, 'Renamed Folder');
      expect(result).toEqual(updatedFolder);
    });
  });
});
