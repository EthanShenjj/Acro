"""
Basic tests for Flask application initialization.
"""
import pytest
import os
import tempfile
from hypothesis import given, strategies as st, settings, HealthCheck


def test_app_creation(app):
    """Test that the Flask app can be created."""
    assert app is not None
    assert app.config['TESTING'] is True


def test_health_check_endpoint(client):
    """Test the health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'acro-backend'


def test_404_error_handler(client):
    """Test 404 error handler."""
    response = client.get('/nonexistent')
    assert response.status_code == 404
    data = response.get_json()
    assert 'error' in data
    assert data['error'] == 'Not Found'


def test_config_loading(app):
    """Test that configuration is loaded correctly."""
    assert 'SQLALCHEMY_DATABASE_URI' in app.config
    assert 'IMAGES_FOLDER' in app.config
    assert 'AUDIO_FOLDER' in app.config
    assert 'VIDEO_FPS' in app.config
    assert app.config['VIDEO_FPS'] == 30


class TestStaticFileMimeTypes:
    """Property tests for static file MIME types."""
    
    # Feature: acro-saas-demo-video-tool, Property 33: Static file MIME types
    @given(
        filename=st.sampled_from([
            'test_image.png',
            'test_audio.mp3',
            'screenshot_12345.png',
            'audio_67890.mp3',
            'thumbnail_abc.png'
        ]),
        folder=st.sampled_from(['images', 'audio', 'thumbnails'])
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_static_file_mime_types(self, client, app, filename, folder):
        """For any request to /static/* routes, should return correct Content-Type header."""
        # Create a temporary file in the appropriate folder
        folder_map = {
            'images': app.config['IMAGES_FOLDER'],
            'audio': app.config['AUDIO_FOLDER'],
            'thumbnails': app.config['THUMBNAILS_FOLDER']
        }
        
        file_path = os.path.join(folder_map[folder], filename)
        
        # Create the file with minimal content
        with open(file_path, 'wb') as f:
            if filename.endswith('.png'):
                # Minimal PNG header
                f.write(b'\x89PNG\r\n\x1a\n')
            elif filename.endswith('.mp3'):
                # Minimal MP3 header
                f.write(b'\xff\xfb')
        
        try:
            # Make request to static file endpoint
            response = client.get(f'/static/{folder}/{filename}')
            
            # Verify response
            assert response.status_code == 200
            
            # Verify correct MIME type based on file extension
            if filename.endswith('.png'):
                assert response.content_type == 'image/png'
            elif filename.endswith('.mp3'):
                assert response.content_type == 'audio/mpeg'
        finally:
            # Clean up the test file
            if os.path.exists(file_path):
                os.remove(file_path)


class TestErrorResponseMapping:
    """Property tests for error response mapping."""
    
    # Feature: acro-saas-demo-video-tool, Property 34: Error response mapping
    @given(
        error_code=st.sampled_from([400, 404, 500, 503])
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_error_response_structure(self, client, app, error_code):
        """For any API error response, should return proper error structure."""
        # Trigger different error codes
        if error_code == 404:
            # Request non-existent endpoint
            response = client.get('/api/nonexistent/endpoint')
        elif error_code == 400:
            # Trigger 400 by sending invalid data to an endpoint
            response = client.post('/api/projects', json={})
        elif error_code == 500:
            # 500 errors are harder to trigger in tests, we'll test the handler directly
            with app.test_request_context():
                from werkzeug.exceptions import InternalServerError
                error_handler = app.error_handler_spec[None][500]
                if error_handler:
                    handler_func = list(error_handler.values())[0]
                    response_data, status_code = handler_func(InternalServerError())
                    assert status_code == 500
                    assert 'error' in response_data.get_json()
                    assert response_data.get_json()['error'] == 'Internal Server Error'
            return
        elif error_code == 503:
            # 503 errors are also tested via handler
            with app.test_request_context():
                from werkzeug.exceptions import ServiceUnavailable
                error_handler = app.error_handler_spec[None][503]
                if error_handler:
                    handler_func = list(error_handler.values())[0]
                    response_data, status_code = handler_func(ServiceUnavailable())
                    assert status_code == 503
                    assert 'error' in response_data.get_json()
                    assert response_data.get_json()['error'] == 'Service Unavailable'
            return
        
        # Verify error response structure
        assert response.status_code == error_code
        data = response.get_json()
        
        # All error responses should have 'error' and 'message' fields
        assert 'error' in data
        assert 'message' in data
        assert isinstance(data['error'], str)
        assert isinstance(data['message'], str)
        
        # Verify error type matches status code
        if error_code == 400:
            assert data['error'] == 'Bad Request'
        elif error_code == 404:
            assert data['error'] == 'Not Found'
        elif error_code == 500:
            assert data['error'] == 'Internal Server Error'
        elif error_code == 503:
            assert data['error'] == 'Service Unavailable'
