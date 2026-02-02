"""
End-to-End Integration Tests for Acro SaaS Demo Video Tool

Tests the complete flow:
1. Extension recording → Backend API
2. Backend processing → Database storage
3. Dashboard display → Project retrieval
4. Editor preview → Video composition

Feature: acro-saas-demo-video-tool, Task 40: End-to-end integration
"""

import pytest
import json
import base64
import os
from io import BytesIO
from PIL import Image
from app import create_app
from models import Base, Project, Folder, FolderType, Step


class TestEndToEndIntegration:
    """Test complete flow across all components"""
    
    @pytest.fixture
    def app(self):
        """Create test application"""
        app = create_app('testing')
        
        with app.app_context():
            Base.metadata.create_all(app.db_engine)
            
            # Create system folders
            all_flows = Folder(name='All Flows', type=FolderType.SYSTEM)
            trash = Folder(name='Trash', type=FolderType.SYSTEM)
            app.db_session.add(all_flows)
            app.db_session.add(trash)
            app.db_session.commit()
            
            yield app
            
            Base.metadata.drop_all(app.db_engine)
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def sample_screenshot(self):
        """Generate a sample screenshot as Base64"""
        img = Image.new('RGB', (1920, 1080), color='blue')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        base64_str = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/png;base64,{base64_str}"
    
    def test_complete_recording_to_editor_flow(self, app, client, sample_screenshot):
        """
        Test complete flow: Start recording → Capture steps → Stop recording → 
        Load in dashboard → Open in editor
        
        Validates: Requirements All (end-to-end integration)
        """
        with app.app_context():
            # Step 1: Extension starts recording session
            response = client.post('/api/recording/start')
            assert response.status_code == 200
            data = response.get_json()
            assert 'sessionId' in data
            assert data['status'] == 'active'
            session_id = data['sessionId']
            
            # Step 2: Extension captures multiple steps
            steps_data = [
                {
                    'sessionId': session_id,
                    'orderIndex': 1,
                    'actionType': 'click',
                    'targetText': 'Login Button',
                    'posX': 450,
                    'posY': 320,
                    'viewportWidth': 1920,
                    'viewportHeight': 1080,
                    'screenshotBase64': sample_screenshot
                },
                {
                    'sessionId': session_id,
                    'orderIndex': 2,
                    'actionType': 'click',
                    'targetText': 'Submit Form',
                    'posX': 800,
                    'posY': 600,
                    'viewportWidth': 1920,
                    'viewportHeight': 1080,
                    'screenshotBase64': sample_screenshot
                },
                {
                    'sessionId': session_id,
                    'orderIndex': 3,
                    'actionType': 'click',
                    'targetText': 'Dashboard Link',
                    'posX': 200,
                    'posY': 100,
                    'viewportWidth': 1920,
                    'viewportHeight': 1080,
                    'screenshotBase64': sample_screenshot
                }
            ]
            
            step_ids = []
            for step_data in steps_data:
                response = client.post('/api/recording/chunk', 
                                       json=step_data,
                                       content_type='application/json')
                assert response.status_code == 200
                chunk_data = response.get_json()
                assert 'stepId' in chunk_data
                assert 'imageUrl' in chunk_data
                assert chunk_data['imageUrl'].startswith('/static/images/')
                assert chunk_data['status'] == 'saved'
                step_ids.append(chunk_data['stepId'])
            
            # Step 3: Extension stops recording
            response = client.post('/api/recording/stop',
                                  json={'sessionId': session_id},
                                  content_type='application/json')
            assert response.status_code == 200
            stop_data = response.get_json()
            assert 'projectId' in stop_data
            assert 'uuid' in stop_data
            assert 'redirectUrl' in stop_data
            assert '/editor/' in stop_data['redirectUrl']
            project_id = stop_data['projectId']
            project_uuid = stop_data['uuid']
            
            # Step 4: Dashboard loads all projects
            response = client.get('/api/projects')
            assert response.status_code == 200
            projects = response.get_json()
            assert 'projects' in projects
            assert len(projects['projects']) == 1
            
            project = projects['projects'][0]
            assert project['id'] == project_id
            assert project['uuid'] == project_uuid
            assert project['thumbnailUrl'] is not None
            assert project['thumbnailUrl'].startswith('/static/thumbnails/')
            assert project['stepCount'] == 3
            assert project['deletedAt'] is None
            
            # Step 5: Dashboard filters by folder
            all_flows_folder = app.db_session.query(Folder).filter_by(name='All Flows').first()
            response = client.get(f'/api/projects?folderId={all_flows_folder.id}')
            assert response.status_code == 200
            filtered_projects = response.get_json()
            assert len(filtered_projects['projects']) == 1
            
            # Step 6: Editor loads project details
            response = client.get(f'/api/projects/{project_id}/details')
            assert response.status_code == 200
            details = response.get_json()
            
            assert details['id'] == project_id
            assert details['uuid'] == project_uuid
            assert 'steps' in details
            assert len(details['steps']) == 3
            assert 'totalDurationFrames' in details
            
            # Verify steps are in correct order
            for i, step in enumerate(details['steps']):
                assert step['orderIndex'] == i + 1
                assert step['imageUrl'].startswith('/static/images/')
                assert step['audioUrl'] is not None or step['audioUrl'] == ''
                assert step['posX'] == steps_data[i]['posX']
                assert step['posY'] == steps_data[i]['posY']
                assert step['targetText'] == steps_data[i]['targetText']
                assert step['durationFrames'] > 0
            
            # Step 7: Verify data consistency across components
            # Check database records
            db_project = app.db_session.get(Project, project_id)
            assert db_project is not None
            assert db_project.uuid == project_uuid
            
            db_steps = app.db_session.query(Step).filter_by(project_id=project_id).order_by(Step.order_index).all()
            assert len(db_steps) == 3
            for i, db_step in enumerate(db_steps):
                assert db_step.order_index == i + 1
                assert db_step.action_type.value == 'click'
                assert db_step.image_url is not None
    
    def test_error_recovery_invalid_session(self, client, sample_screenshot):
        """
        Test error handling when invalid session is used
        
        Validates: Requirements 24.1, 24.2, 24.3 (error handling)
        """
        # Try to upload chunk with invalid session
        response = client.post('/api/recording/chunk',
                              json={
                                  'sessionId': 'invalid-session-id',
                                  'orderIndex': 1,
                                  'actionType': 'click',
                                  'targetText': 'Button',
                                  'posX': 100,
                                  'posY': 100,
                                  'viewportWidth': 1920,
                                  'viewportHeight': 1080,
                                  'screenshotBase64': sample_screenshot
                              },
                              content_type='application/json')
        
        assert response.status_code in [400, 404]
        error_data = response.get_json()
        assert 'error' in error_data or 'message' in error_data
    
    def test_error_recovery_missing_project(self, client):
        """
        Test error handling when loading non-existent project
        
        Validates: Requirements 24.1, 24.2, 24.3 (error handling)
        """
        # Try to load non-existent project
        response = client.get('/api/projects/99999/details')
        assert response.status_code == 404
        error_data = response.get_json()
        assert 'error' in error_data or 'message' in error_data
    
    def test_soft_delete_consistency(self, app, client, sample_screenshot):
        """
        Test that soft delete maintains data consistency
        
        Validates: Requirements 8.3, 18.4, 18.5 (soft delete preservation)
        """
        with app.app_context():
            # Create a project with steps
            response = client.post('/api/recording/start')
            session_id = response.get_json()['sessionId']
            
            # Add a step
            client.post('/api/recording/chunk',
                       json={
                           'sessionId': session_id,
                           'orderIndex': 1,
                           'actionType': 'click',
                           'targetText': 'Test',
                           'posX': 100,
                           'posY': 100,
                           'viewportWidth': 1920,
                           'viewportHeight': 1080,
                           'screenshotBase64': sample_screenshot
                       },
                       content_type='application/json')
            
            # Stop recording
            response = client.post('/api/recording/stop',
                                  json={'sessionId': session_id},
                                  content_type='application/json')
            project_id = response.get_json()['projectId']
            
            # Soft delete the project
            response = client.delete(f'/api/projects/{project_id}')
            assert response.status_code == 200
            
            # Verify project is marked as deleted but still in database
            db_project = app.db_session.query(Project).get(project_id)
            assert db_project is not None
            assert db_project.deleted_at is not None
            
            # Verify steps are still in database
            db_steps = app.db_session.query(Step).filter_by(project_id=project_id).all()
            assert len(db_steps) == 1
            
            # Verify project doesn't appear in normal listing
            response = client.get('/api/projects')
            projects = response.get_json()['projects']
            assert not any(p['id'] == project_id for p in projects)
    
    def test_folder_organization_consistency(self, app, client, sample_screenshot):
        """
        Test folder organization across dashboard operations
        
        Validates: Requirements 7.1, 7.2, 7.5, 23.3 (folder management)
        """
        with app.app_context():
            # Create a custom folder
            response = client.post('/api/folders',
                                  json={'name': 'Product Demos'},
                                  content_type='application/json')
            assert response.status_code == 201
            custom_folder_id = response.get_json()['id']
            
            # Create a project (should default to All Flows)
            response = client.post('/api/recording/start')
            session_id = response.get_json()['sessionId']
            
            client.post('/api/recording/chunk',
                       json={
                           'sessionId': session_id,
                           'orderIndex': 1,
                           'actionType': 'click',
                           'targetText': 'Test',
                           'posX': 100,
                           'posY': 100,
                           'viewportWidth': 1920,
                           'viewportHeight': 1080,
                           'screenshotBase64': sample_screenshot
                       },
                       content_type='application/json')
            
            response = client.post('/api/recording/stop',
                                  json={'sessionId': session_id},
                                  content_type='application/json')
            project_id = response.get_json()['projectId']
            
            # Verify default folder assignment
            db_project = app.db_session.query(Project).get(project_id)
            all_flows = app.db_session.query(Folder).filter_by(name='All Flows').first()
            assert db_project.folder_id == all_flows.id
            
            # Move project to custom folder
            response = client.put(f'/api/projects/{project_id}',
                                 json={'folderId': custom_folder_id},
                                 content_type='application/json')
            assert response.status_code == 200
            
            # Verify folder filtering
            response = client.get(f'/api/projects?folderId={custom_folder_id}')
            filtered_projects = response.get_json()['projects']
            assert len(filtered_projects) == 1
            assert filtered_projects[0]['id'] == project_id
            
            # Verify project STILL appears in All Flows (All Flows shows all non-trash projects)
            response = client.get(f'/api/projects?folderId={all_flows.id}')
            all_flows_projects = response.get_json()['projects']
            assert any(p['id'] == project_id for p in all_flows_projects)
    
    def test_script_editing_updates_composition(self, app, client, sample_screenshot):
        """
        Test that script editing triggers TTS and updates video composition
        
        Validates: Requirements 11.1, 11.2, 11.5 (script editing and TTS)
        """
        with app.app_context():
            # Create a project with a step
            response = client.post('/api/recording/start')
            session_id = response.get_json()['sessionId']
            
            client.post('/api/recording/chunk',
                       json={
                           'sessionId': session_id,
                           'orderIndex': 1,
                           'actionType': 'click',
                           'targetText': 'Login',
                           'posX': 100,
                           'posY': 100,
                           'viewportWidth': 1920,
                           'viewportHeight': 1080,
                           'screenshotBase64': sample_screenshot
                       },
                       content_type='application/json')
            
            response = client.post('/api/recording/stop',
                                  json={'sessionId': session_id},
                                  content_type='application/json')
            project_id = response.get_json()['projectId']
            
            # Get step details
            response = client.get(f'/api/projects/{project_id}/details')
            step = response.get_json()['steps'][0]
            step_id = step['id']
            original_audio_url = step['audioUrl']
            original_duration = step['durationFrames']
            
            # Update script text
            new_script = "Click the login button to access your account"
            response = client.post(f'/api/steps/{step_id}/update_script',
                                  json={'scriptText': new_script},
                                  content_type='application/json')
            
            assert response.status_code == 200
            updated_step = response.get_json()
            
            # Verify TTS was regenerated
            assert updated_step['scriptText'] == new_script
            assert 'audioUrl' in updated_step
            assert 'durationFrames' in updated_step
            
            # If TTS succeeded, audio URL should be different
            if updated_step['audioUrl']:
                assert updated_step['audioUrl'] != original_audio_url
            
            # Verify composition data is updated
            response = client.get(f'/api/projects/{project_id}/details')
            composition_step = response.get_json()['steps'][0]
            assert composition_step['scriptText'] == new_script
