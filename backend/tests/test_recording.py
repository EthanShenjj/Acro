"""
Tests for recording session API endpoints.

This module includes:
- Property-based tests for session finalization
- Unit tests for chunk upload edge cases
"""
import pytest
import base64
from hypothesis import given, strategies as st, settings, HealthCheck
from io import BytesIO
from PIL import Image

from models.project import Project
from models.step import Step
from models.folder import Folder, FolderType


# Helper function to generate valid Base64 image
def generate_base64_image(width=100, height=100):
    """Generate a valid Base64 encoded PNG image."""
    img = Image.new('RGB', (width, height), color='red')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    b64_string = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/png;base64,{b64_string}"


class TestRecordingSessionFinalization:
    """Property-based tests for recording session finalization."""
    
    # Feature: acro-saas-demo-video-tool, Property 32: Session finalization
    @given(
        num_steps=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    def test_session_finalization_returns_required_fields(self, client, db_session, num_steps):
        """
        Property 32: Session finalization
        
        For any POST to /api/recording/stop, the Backend should return a response 
        containing project_id and redirect_url pointing to the editor page.
        
        Validates: Requirements 15.4
        """
        # Create default folder
        default_folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(default_folder)
        db_session.commit()
        
        # Start recording session
        response = client.post('/api/recording/start')
        assert response.status_code == 200
        session_data = response.get_json()
        session_id = session_data['sessionId']
        
        # Upload steps
        for i in range(num_steps):
            chunk_data = {
                'sessionId': session_id,
                'orderIndex': i,
                'actionType': 'click',
                'targetText': f'Button {i}',
                'posX': 100 + i * 10,
                'posY': 200 + i * 10,
                'viewportWidth': 1920,
                'viewportHeight': 1080,
                'screenshotBase64': generate_base64_image()
            }
            response = client.post('/api/recording/chunk', json=chunk_data)
            assert response.status_code == 200
        
        # Stop recording session
        stop_data = {'sessionId': session_id}
        response = client.post('/api/recording/stop', json=stop_data)
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        
        # Property: Response must contain project_id
        assert 'projectId' in data
        assert isinstance(data['projectId'], int)
        assert data['projectId'] > 0
        
        # Property: Response must contain uuid
        assert 'uuid' in data
        assert isinstance(data['uuid'], str)
        assert len(data['uuid']) > 0
        
        # Property: Response must contain redirect_url pointing to editor
        assert 'redirectUrl' in data
        assert isinstance(data['redirectUrl'], str)
        assert '/editor/' in data['redirectUrl']
        assert data['uuid'] in data['redirectUrl']
        
        # Verify project exists in database
        project = db_session.query(Project).filter_by(id=data['projectId']).first()
        assert project is not None
        assert project.uuid == data['uuid']
        
        # Verify thumbnail was generated
        assert project.thumbnail_url is not None
        assert project.thumbnail_url.startswith('/static/thumbnails/')


class TestChunkUploadEdgeCases:
    """Unit tests for chunk upload edge cases."""
    
    def test_chunk_upload_with_invalid_base64(self, client, db_session):
        """
        Test that invalid Base64 data is handled gracefully.
        
        Validates: Requirements 15.2, 15.3
        """
        # Create default folder
        default_folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(default_folder)
        db_session.commit()
        
        # Start recording session
        response = client.post('/api/recording/start')
        assert response.status_code == 200
        session_data = response.get_json()
        session_id = session_data['sessionId']
        
        # Upload chunk with invalid Base64 data
        chunk_data = {
            'sessionId': session_id,
            'orderIndex': 0,
            'actionType': 'click',
            'targetText': 'Submit Button',
            'posX': 450,
            'posY': 320,
            'viewportWidth': 1920,
            'viewportHeight': 1080,
            'screenshotBase64': 'invalid-base64-data!!!'
        }
        response = client.post('/api/recording/chunk', json=chunk_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Bad Request'
        assert 'Invalid Base64 image data' in data['message']
    
    def test_chunk_upload_with_missing_session_id(self, client, db_session):
        """
        Test that missing sessionId field is rejected.
        
        Validates: Requirements 15.2, 15.3
        """
        # Upload chunk without sessionId
        chunk_data = {
            'orderIndex': 0,
            'actionType': 'click',
            'posX': 450,
            'posY': 320,
            'screenshotBase64': generate_base64_image()
        }
        response = client.post('/api/recording/chunk', json=chunk_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Bad Request'
        assert 'Missing required fields' in data['message']
        assert 'sessionId' in data['message']
    
    def test_chunk_upload_with_missing_coordinates(self, client, db_session):
        """
        Test that missing coordinate fields are rejected.
        
        Validates: Requirements 15.2, 15.3
        """
        # Start recording session
        response = client.post('/api/recording/start')
        assert response.status_code == 200
        session_data = response.get_json()
        session_id = session_data['sessionId']
        
        # Upload chunk without posX and posY
        chunk_data = {
            'sessionId': session_id,
            'orderIndex': 0,
            'actionType': 'click',
            'screenshotBase64': generate_base64_image()
        }
        response = client.post('/api/recording/chunk', json=chunk_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Bad Request'
        assert 'Missing required fields' in data['message']
    
    def test_chunk_upload_with_invalid_session_id(self, client, db_session):
        """
        Test that invalid sessionId is rejected.
        
        Validates: Requirements 15.2, 15.3
        """
        # Upload chunk with non-existent sessionId
        chunk_data = {
            'sessionId': 'invalid-session-id',
            'orderIndex': 0,
            'actionType': 'click',
            'posX': 450,
            'posY': 320,
            'screenshotBase64': generate_base64_image()
        }
        response = client.post('/api/recording/chunk', json=chunk_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Bad Request'
        assert 'Invalid session ID' in data['message']
    
    def test_chunk_upload_with_missing_screenshot(self, client, db_session):
        """
        Test that missing screenshotBase64 field is rejected.
        
        Validates: Requirements 15.2, 15.3
        """
        # Start recording session
        response = client.post('/api/recording/start')
        assert response.status_code == 200
        session_data = response.get_json()
        session_id = session_data['sessionId']
        
        # Upload chunk without screenshotBase64
        chunk_data = {
            'sessionId': session_id,
            'orderIndex': 0,
            'actionType': 'click',
            'posX': 450,
            'posY': 320
        }
        response = client.post('/api/recording/chunk', json=chunk_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert data['error'] == 'Bad Request'
        assert 'Missing required fields' in data['message']
        assert 'screenshotBase64' in data['message']


class TestRecordingSessionBasics:
    """Basic unit tests for recording session endpoints."""
    
    def test_start_recording_creates_session(self, client):
        """Test that starting a recording creates a valid session."""
        response = client.post('/api/recording/start')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'sessionId' in data
        assert 'status' in data
        assert data['status'] == 'active'
        assert len(data['sessionId']) > 0
    
    def test_stop_recording_without_steps(self, client):
        """Test that stopping a session without steps returns error."""
        # Start recording session
        response = client.post('/api/recording/start')
        assert response.status_code == 200
        session_data = response.get_json()
        session_id = session_data['sessionId']
        
        # Stop recording without uploading any steps
        stop_data = {'sessionId': session_id}
        response = client.post('/api/recording/stop', json=stop_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'No steps were recorded' in data['message']
    
    def test_stop_recording_with_invalid_session(self, client):
        """Test that stopping with invalid session ID returns error."""
        stop_data = {'sessionId': 'invalid-session-id'}
        response = client.post('/api/recording/stop', json=stop_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Invalid session ID' in data['message']
    
    def test_stop_recording_without_session_id(self, client):
        """Test that stopping without sessionId returns error."""
        response = client.post('/api/recording/stop', json={})
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Missing required field: sessionId' in data['message']
