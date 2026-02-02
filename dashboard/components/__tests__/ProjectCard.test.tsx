import React from 'react';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import ProjectCard from '../ProjectCard';
import { Project } from '@/lib/types';

describe('ProjectCard', () => {
  // Feature: acro-saas-demo-video-tool, Property 12: Project card display completeness
  describe('Property 12: Project card display completeness', () => {
    it('should display thumbnail, title, and timestamp for any project', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 100000 }),
            uuid: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 255 }),
            folderId: fc.integer({ min: 1, max: 100 }),
            thumbnailUrl: fc.oneof(
              fc.constant(''),
              fc.webUrl({ validSchemes: ['http', 'https'] })
            ),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
              .filter(d => !isNaN(d.getTime()))
              .map(d => d.toISOString()),
            deletedAt: fc.constant(null),
            stepCount: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
          }),
          (project: Project) => {
            const { container, unmount } = render(<ProjectCard project={project} />);
            
            // Component displays "Untitled Project" for whitespace-only titles
            const displayTitle = project.title.trim() || 'Untitled Project';
            
            // Verify title is displayed (use container to scope query to this specific render)
            const titleElement = container.querySelector('h3');
            expect(titleElement).toBeInTheDocument();
            expect(titleElement?.textContent).toBe(displayTitle);
            
            // Verify timestamp is displayed (formatted date)
            const date = new Date(project.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const dateElement = container.querySelector('p');
            expect(dateElement).toBeInTheDocument();
            expect(dateElement?.textContent).toBe(formattedDate);
            
            // Verify thumbnail area exists (either image or placeholder)
            if (project.thumbnailUrl) {
              const imgElement = container.querySelector('img');
              expect(imgElement).toBeInTheDocument();
              expect(imgElement).toHaveAttribute('src', project.thumbnailUrl);
              expect(imgElement).toHaveAttribute('alt', displayTitle);
            } else {
              // Placeholder icon should be present
              const svgElement = container.querySelector('svg');
              expect(svgElement).toBeInTheDocument();
            }
            
            // Clean up after each property test iteration
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional unit test for specific example
  it('should render project card with all elements', () => {
    const mockProject: Project = {
      id: 1,
      uuid: 'test-uuid-123',
      title: 'Test Project',
      folderId: 1,
      thumbnailUrl: 'https://example.com/thumbnail.png',
      createdAt: '2024-01-15T10:30:00Z',
      deletedAt: null,
      stepCount: 5,
    };

    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByAltText('Test Project')).toHaveAttribute(
      'src',
      'https://example.com/thumbnail.png'
    );
  });

  it('should render placeholder when no thumbnail is provided', () => {
    const mockProject: Project = {
      id: 2,
      uuid: 'test-uuid-456',
      title: 'Project Without Thumbnail',
      folderId: 1,
      thumbnailUrl: '',
      createdAt: '2024-01-20T14:45:00Z',
      deletedAt: null,
    };

    const { container } = render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Project Without Thumbnail')).toBeInTheDocument();
    // Verify placeholder icon is rendered
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });
});
