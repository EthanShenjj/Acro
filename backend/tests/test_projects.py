"""
Tests for project management API endpoints.

This module includes:
- Property-based tests for trash folder exclusion
- Unit tests for project CRUD operations
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone

from models.project import Project
from models.folder import Folder, FolderType
from models.step import Step, ActionType


class TestTrashFolderExclusion:
    """Property-based tests for trash folder exclusion."""
    
    # Feature: acro-saas-demo-video-tool, Property 15: Trash folder exclusion
    def test_trash_folder_exclusion_from_all_flows(self, client, db_session):
        """
        Property 15: Trash folder exclusion
        
        For any query for "All Flows" folder, the returned Projects should exclude 
        all Projects where folder_id equals the Trash folder's id.
        
        Validates: Requirements 23.4
        """
        # Get existing system folders (created by fixture)
        all_flows_folder = db_session.query(Folder).filter(
            Folder.name == 'All Flows',
            Folder.type == FolderType.SYSTEM
        ).first()
        trash_folder = db_session.query(Folder).filter(
            Folder.name == 'Trash',
            Folder.type == FolderType.SYSTEM
        ).first()
        assert all_flows_folder is not None, "All Flows folder should exist from fixture"
        assert trash_folder is not None, "Trash folder should exist from fixture"
        
        # Create custom folder
        custom_folder = Folder(name='Custom Folder', type=FolderType.USER)
        db_session.add(custom_folder)
        db_session.commit()
        
        # Create projects in All Flows folder
        all_flows_projects = []
        for i in range(3):
            project = Project(
                title=f'All Flows Project {i}',
                folder_id=all_flows_folder.id
            )
            db_session.add(project)
            db_session.commit()
            all_flows_projects.append(project)
        
        # Create projects in Trash folder
        trash_projects = []
        for i in range(2):
            project = Project(
                title=f'Trash Project {i}',
                folder_id=trash_folder.id
            )
            db_session.add(project)
            db_session.commit()
            trash_projects.append(project)
        
        # Create projects in custom folder
        custom_projects = []
        for i in range(2):
            project = Project(
                title=f'Custom Project {i}',
                folder_id=custom_folder.id
            )
            db_session.add(project)
            db_session.commit()
            custom_projects.append(project)
        
        # Query for All Flows folder
        response = client.get(f'/api/projects?folderId={all_flows_folder.id}')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'projects' in data
        
        returned_project_ids = [p['id'] for p in data['projects']]
        
        # Property: All Flows projects should be included
        for project in all_flows_projects:
            assert project.id in returned_project_ids, \
                f"All Flows project {project.id} should be included"
        
        # Property: Trash projects should be excluded
        for project in trash_projects:
            assert project.id not in returned_project_ids, \
                f"Trash project {project.id} should be excluded from All Flows"
        
        # Property: Custom folder projects should be INCLUDED (All Flows shows all non-trash)
        for project in custom_projects:
            assert project.id in returned_project_ids, \
                f"Custom folder project {project.id} should be included in All Flows"
        
        # Property: Total count should match all non-trash projects
        expected_count = len(all_flows_projects) + len(custom_projects)
        assert len(returned_project_ids) == expected_count, \
            f"Expected {expected_count} projects, got {len(returned_project_ids)}"


class TestProjectCRUD:
    """Unit tests for project CRUD operations."""
    
    def test_create_project_with_title(self, client, db_session):
        """Test creating a project with a title."""
        # Get the existing default folder (created by fixture)
        default_folder = db_session.query(Folder).filter(
            Folder.name == 'All Flows',
            Folder.type == FolderType.SYSTEM
        ).first()
        assert default_folder is not None, "All Flows folder should exist from fixture"
        
        # Create project
        project_data = {'title': 'My Test Project'}
        response = client.post('/api/projects', json=project_data)
        
        # Verify response
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'My Test Project'
        assert data['folderId'] == default_folder.id
        assert 'id' in data
        assert 'uuid' in data
        assert 'createdAt' in data
    
    def test_create_project_with_folder_id(self, client, db_session):
        """Test creating a project with a specific folder."""
        # Get existing default folder and create custom folder
        default_folder = db_session.query(Folder).filter(
            Folder.name == 'All Flows',
            Folder.type == FolderType.SYSTEM
        ).first()
        custom_folder = Folder(name='My Folder', type=FolderType.USER)
        db_session.add(custom_folder)
        db_session.commit()
        
        # Create project in custom folder
        project_data = {
            'title': 'My Test Project',
            'folderId': custom_folder.id
        }
        response = client.post('/api/projects', json=project_data)
        
        # Verify response
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'My Test Project'
        assert data['folderId'] == custom_folder.id
    
    def test_create_project_without_title(self, client, db_session):
        """Test that creating a project without title fails."""
        response = client.post('/api/projects', json={})
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'title' in data['message'].lower()
    
    def test_create_project_with_empty_title(self, client, db_session):
        """Test that creating a project with empty title fails."""
        project_data = {'title': '   '}
        response = client.post('/api/projects', json=project_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'empty' in data['message'].lower()
    
    def test_create_project_with_invalid_folder(self, client, db_session):
        """Test that creating a project with invalid folder fails."""
        project_data = {
            'title': 'My Test Project',
            'folderId': 9999
        }
        response = client.post('/api/projects', json=project_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'not found' in data['message'].lower()
    
    def test_get_projects_empty(self, client, db_session):
        """Test getting projects when none exist."""
        response = client.get('/api/projects')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'projects' in data
        assert len(data['projects']) == 0
    
    def test_get_projects_with_data(self, client, db_session):
        """Test getting projects with data."""
        # Create folder and projects
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project1 = Project(title='Project 1', folder_id=folder.id)
        project2 = Project(title='Project 2', folder_id=folder.id)
        db_session.add(project1)
        db_session.add(project2)
        db_session.commit()
        
        # Get projects
        response = client.get('/api/projects')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'projects' in data
        assert len(data['projects']) == 2
        assert all('stepCount' in p for p in data['projects'])
    
    def test_get_projects_excludes_deleted(self, client, db_session):
        """Test that deleted projects are excluded."""
        # Create folder and projects
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project1 = Project(title='Project 1', folder_id=folder.id)
        project2 = Project(title='Project 2', folder_id=folder.id, deleted_at=datetime.now(timezone.utc))
        db_session.add(project1)
        db_session.add(project2)
        db_session.commit()
        
        # Get projects
        response = client.get('/api/projects')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['projects']) == 1
        assert data['projects'][0]['title'] == 'Project 1'
    
    def test_get_projects_filtered_by_folder(self, client, db_session):
        """Test getting projects filtered by folder."""
        # Create folders and projects
        folder1 = Folder(name='Folder 1', type=FolderType.USER)
        folder2 = Folder(name='Folder 2', type=FolderType.USER)
        db_session.add(folder1)
        db_session.add(folder2)
        db_session.commit()
        
        project1 = Project(title='Project 1', folder_id=folder1.id)
        project2 = Project(title='Project 2', folder_id=folder2.id)
        db_session.add(project1)
        db_session.add(project2)
        db_session.commit()
        
        # Get projects for folder1
        response = client.get(f'/api/projects?folderId={folder1.id}')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['projects']) == 1
        assert data['projects'][0]['title'] == 'Project 1'
    
    def test_get_project_by_id(self, client, db_session):
        """Test getting a single project by ID."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Get project
        response = client.get(f'/api/projects/{project.id}')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == project.id
        assert data['title'] == 'My Project'
    
    def test_get_project_not_found(self, client, db_session):
        """Test getting a non-existent project."""
        response = client.get('/api/projects/9999')
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
        assert 'not found' in data['message'].lower()
    
    def test_get_project_details_with_steps(self, client, db_session):
        """Test getting project details with steps."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create steps
        step1 = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button 1',
            script_text='Click button 1',
            image_url='/static/images/step1.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        step2 = Step(
            project_id=project.id,
            order_index=1,
            action_type=ActionType.CLICK,
            target_text='Button 2',
            script_text='Click button 2',
            image_url='/static/images/step2.png',
            pos_x=150,
            pos_y=250,
            duration_frames=120
        )
        db_session.add(step1)
        db_session.add(step2)
        db_session.commit()
        
        # Get project details
        response = client.get(f'/api/projects/{project.id}/details')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == project.id
        assert 'steps' in data
        assert len(data['steps']) == 2
        assert data['totalDurationFrames'] == 210
        assert data['steps'][0]['orderIndex'] == 0
        assert data['steps'][1]['orderIndex'] == 1
    
    def test_update_project_title(self, client, db_session):
        """Test updating a project title."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Original Title', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Update project
        update_data = {'title': 'Updated Title'}
        response = client.put(f'/api/projects/{project.id}', json=update_data)
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Updated Title'
        
        # Verify in database
        db_session.expire(project)
        assert project.title == 'Updated Title'
    
    def test_update_project_folder(self, client, db_session):
        """Test updating a project folder."""
        # Create folders and project
        folder1 = Folder(name='Folder 1', type=FolderType.USER)
        folder2 = Folder(name='Folder 2', type=FolderType.USER)
        db_session.add(folder1)
        db_session.add(folder2)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder1.id)
        db_session.add(project)
        db_session.commit()
        
        # Update project folder
        update_data = {'folderId': folder2.id}
        response = client.put(f'/api/projects/{project.id}', json=update_data)
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['folderId'] == folder2.id
        
        # Verify in database
        db_session.expire(project)
        assert project.folder_id == folder2.id
    
    def test_update_project_not_found(self, client, db_session):
        """Test updating a non-existent project."""
        update_data = {'title': 'Updated Title'}
        response = client.put('/api/projects/9999', json=update_data)
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_update_project_with_invalid_folder(self, client, db_session):
        """Test updating project with invalid folder."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Update with invalid folder
        update_data = {'folderId': 9999}
        response = client.put(f'/api/projects/{project.id}', json=update_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'not found' in data['message'].lower()
    
    def test_delete_project_soft_delete(self, client, db_session):
        """Test soft deleting a project."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        project_id = project.id
        
        # Delete project
        response = client.delete(f'/api/projects/{project_id}')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        assert data['projectId'] == project_id
        
        # Verify project still exists but is soft deleted
        db_session.expire(project)
        assert project.deleted_at is not None
        
        # Verify project is excluded from GET requests
        response = client.get('/api/projects')
        data = response.get_json()
        assert len(data['projects']) == 0
    
    def test_delete_project_preserves_steps(self, client, db_session):
        """Test that soft deleting a project preserves steps."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='My Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Click button',
            image_url='/static/images/step.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        step_id = step.id
        
        # Delete project
        response = client.delete(f'/api/projects/{project.id}')
        assert response.status_code == 200
        
        # Verify step still exists
        step = db_session.query(Step).filter_by(id=step_id).first()
        assert step is not None
    
    def test_delete_project_not_found(self, client, db_session):
        """Test deleting a non-existent project."""
        response = client.delete('/api/projects/9999')
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
