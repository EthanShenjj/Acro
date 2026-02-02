"""
Tests for step update API endpoints.

This module includes:
- Property-based tests for TTS regeneration trigger
- Unit tests for step script updates
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from unittest.mock import patch, MagicMock

from models.project import Project
from models.folder import Folder, FolderType
from models.step import Step, ActionType


class TestTTSRegenerationTrigger:
    """Property-based tests for TTS regeneration trigger."""
    
    # Feature: acro-saas-demo-video-tool, Property 26: TTS regeneration trigger
    @given(
        script_text=st.text(min_size=1, max_size=500).filter(lambda s: s.strip())
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_tts_regeneration_trigger(self, client, db_session, script_text):
        """
        Property 26: TTS regeneration trigger
        
        For any script_text modification and save action, a POST request to 
        /api/steps/{id}/update_script should be sent with the updated text.
        
        Validates: Requirements 11.2
        """
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Test Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Original script',
            image_url='/static/images/test.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        step_id = step.id
        
        # Mock TTS service to avoid actual TTS generation
        with patch('routes.steps.TTSService') as mock_tts_service:
            mock_tts_instance = MagicMock()
            mock_tts_instance.generate_audio.return_value = ('/static/audio/new.mp3', 120)
            mock_tts_service.return_value = mock_tts_instance
            
            # Update script text
            update_data = {'scriptText': script_text}
            response = client.post(f'/api/steps/{step_id}/update_script', json=update_data)
            
            # Property: Request should succeed
            assert response.status_code == 200, \
                f"Script update should succeed for text: {script_text[:50]}..."
            
            data = response.get_json()
            
            # Property: Response should contain updated script text
            assert 'scriptText' in data, "Response should contain scriptText"
            assert data['scriptText'] == script_text.strip(), \
                "Response scriptText should match the updated text"
            
            # Property: TTS service should be called with the new text
            mock_tts_instance.generate_audio.assert_called_once()
            call_args = mock_tts_instance.generate_audio.call_args[0]
            assert call_args[0] == script_text.strip(), \
                "TTS service should be called with the updated script text"
            
            # Property: Response should contain audio URL and duration
            assert 'audioUrl' in data, "Response should contain audioUrl"
            assert 'durationFrames' in data, "Response should contain durationFrames"
        
        # Verify database was updated
        db_session.expire(step)
        assert step.script_text == script_text.strip(), \
            "Step script_text should be updated in database"


class TestStepScriptUpdate:
    """Unit tests for step script updates."""
    
    def test_update_script_success(self, client, db_session):
        """Test successfully updating step script."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Test Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Original script',
            image_url='/static/images/test.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        
        # Mock TTS service
        with patch('routes.steps.TTSService') as mock_tts_service:
            mock_tts_instance = MagicMock()
            mock_tts_instance.generate_audio.return_value = ('/static/audio/new.mp3', 120)
            mock_tts_service.return_value = mock_tts_instance
            
            # Update script
            update_data = {'scriptText': 'Updated script text'}
            response = client.post(f'/api/steps/{step.id}/update_script', json=update_data)
            
            # Verify response
            assert response.status_code == 200
            data = response.get_json()
            assert data['scriptText'] == 'Updated script text'
            assert data['audioUrl'] == '/static/audio/new.mp3'
            assert data['durationFrames'] == 120
    
    def test_update_script_without_script_text(self, client, db_session):
        """Test that updating without scriptText fails."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Test Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Original script',
            image_url='/static/images/test.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        
        # Update without scriptText
        response = client.post(f'/api/steps/{step.id}/update_script', json={})
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'scriptText' in data['message']
    
    def test_update_script_with_empty_text(self, client, db_session):
        """Test that updating with empty scriptText fails."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Test Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Original script',
            image_url='/static/images/test.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        
        # Update with empty text
        update_data = {'scriptText': '   '}
        response = client.post(f'/api/steps/{step.id}/update_script', json=update_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'empty' in data['message'].lower()
    
    def test_update_script_step_not_found(self, client, db_session):
        """Test updating a non-existent step."""
        update_data = {'scriptText': 'Updated script'}
        response = client.post('/api/steps/9999/update_script', json=update_data)
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_update_script_tts_failure(self, client, db_session):
        """Test that TTS failure is handled gracefully."""
        # Create folder and project
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        
        project = Project(title='Test Project', folder_id=folder.id)
        db_session.add(project)
        db_session.commit()
        
        # Create step with existing audio
        step = Step(
            project_id=project.id,
            order_index=0,
            action_type=ActionType.CLICK,
            target_text='Button',
            script_text='Original script',
            audio_url='/static/audio/original.mp3',
            image_url='/static/images/test.png',
            pos_x=100,
            pos_y=200,
            duration_frames=90
        )
        db_session.add(step)
        db_session.commit()
        original_audio = step.audio_url
        original_duration = step.duration_frames
        
        # Mock TTS service to return None (failure)
        with patch('routes.steps.TTSService') as mock_tts_service:
            mock_tts_instance = MagicMock()
            mock_tts_instance.generate_audio.return_value = None
            mock_tts_service.return_value = mock_tts_instance
            
            # Update script
            update_data = {'scriptText': 'Updated script text'}
            response = client.post(f'/api/steps/{step.id}/update_script', json=update_data)
            
            # Verify response
            assert response.status_code == 200
            data = response.get_json()
            assert data['scriptText'] == 'Updated script text'
            assert 'warning' in data
            assert 'TTS' in data['warning']
            
            # Verify audio URL and duration remain unchanged
            assert data['audioUrl'] == original_audio
            assert data['durationFrames'] == original_duration
