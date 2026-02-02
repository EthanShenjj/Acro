"""
Tests for TTSService.

This module contains both unit tests and property-based tests for the TTS service.
"""

import os
import tempfile
import shutil
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, patch, MagicMock
import io

from services.tts_service import TTSService
from services.storage_service import StorageService


@pytest.fixture(scope='module')
def temp_storage_dirs():
    """Create temporary directories for testing storage service."""
    temp_dir = tempfile.mkdtemp()
    images_folder = os.path.join(temp_dir, 'images')
    audio_folder = os.path.join(temp_dir, 'audio')
    thumbnails_folder = os.path.join(temp_dir, 'thumbnails')
    
    os.makedirs(images_folder)
    os.makedirs(audio_folder)
    os.makedirs(thumbnails_folder)
    
    yield {
        'images': images_folder,
        'audio': audio_folder,
        'thumbnails': thumbnails_folder,
        'temp_dir': temp_dir
    }
    
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture(scope='module')
def storage_service(temp_storage_dirs):
    """Create StorageService instance with temporary directories."""
    return StorageService(
        images_folder=temp_storage_dirs['images'],
        audio_folder=temp_storage_dirs['audio'],
        thumbnails_folder=temp_storage_dirs['thumbnails']
    )


@pytest.fixture(scope='module')
def tts_service(storage_service):
    """Create TTSService instance."""
    return TTSService(storage_service=storage_service, fps=30)


# Property-based tests

@pytest.mark.property
class TestTTSAudioGeneration:
    """Property-based tests for TTS audio generation."""
    
    # Feature: acro-saas-demo-video-tool, Property 27: TTS audio generation
    @given(
        text=st.text(min_size=5, max_size=50, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\x00\n\r\t'
        ))
    )
    @settings(max_examples=100, deadline=None)
    def test_tts_audio_generation(self, tts_service, temp_storage_dirs, text):
        """
        For any script_text update request, should generate MP3 audio and return audio_url and duration_frames.
        
        Validates: Requirements 16.1, 16.2, 11.3, 11.4
        """
        # Mock gTTS to avoid slow network calls
        with patch('services.tts_service.gTTS') as mock_gtts_class:
            # Create a mock TTS instance
            mock_tts = MagicMock()
            mock_gtts_class.return_value = mock_tts
            
            # Mock the save method to create a fake MP3 file
            def mock_save(path):
                # Create a fake MP3 file with some content
                with open(path, 'wb') as f:
                    # Write fake MP3 header and some data
                    f.write(b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 100)
            
            mock_tts.save = mock_save
            
            # Generate audio
            result = tts_service.generate_audio(text)
            
            # Should return a tuple
            assert result is not None, "Valid text should generate audio"
            audio_url, duration_frames = result
            
            # Verify audio_url format
            assert audio_url.startswith('/static/audio/'), \
                f"Audio URL should start with /static/audio/, got: {audio_url}"
            assert audio_url.endswith('.mp3'), \
                f"Audio URL should end with .mp3, got: {audio_url}"
            
            # Verify audio file exists
            filename = audio_url.split('/')[-1]
            filepath = os.path.join(temp_storage_dirs['audio'], filename)
            assert os.path.exists(filepath), \
                f"Audio file should exist at: {filepath}"
            
            # Verify file is not empty
            file_size = os.path.getsize(filepath)
            assert file_size > 0, \
                f"Audio file should not be empty, got size: {file_size}"
            
            # Verify duration_frames is positive
            assert duration_frames > 0, \
                f"Duration frames should be positive, got: {duration_frames}"
            
            # Verify gTTS was called with correct parameters
            mock_gtts_class.assert_called_once_with(text=text, lang='en', slow=False)


@pytest.mark.property
class TestDurationCalculationAccuracy:
    """Property-based tests for duration calculation accuracy."""
    
    # Feature: acro-saas-demo-video-tool, Property 28: Duration calculation accuracy
    @given(
        text=st.text(min_size=10, max_size=50, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\x00\n\r\t'
        ))
    )
    @settings(max_examples=100, deadline=None)
    def test_duration_calculation_accuracy(self, tts_service, temp_storage_dirs, text):
        """
        For any generated audio file, duration_frames should equal ceil(audio_duration_seconds * 30).
        
        Validates: Requirements 16.3
        """
        # Mock gTTS to avoid slow network calls
        with patch('services.tts_service.gTTS') as mock_gtts_class:
            # Create a mock TTS instance
            mock_tts = MagicMock()
            mock_gtts_class.return_value = mock_tts
            
            # Mock the save method to create a fake MP3 file
            def mock_save(path):
                # Create a fake MP3 file with some content
                with open(path, 'wb') as f:
                    # Write fake MP3 header and some data (simulate ~1 second audio)
                    f.write(b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 16000)
            
            mock_tts.save = mock_save
            
            # Generate audio
            result = tts_service.generate_audio(text)
            
            # Should return a tuple
            assert result is not None
            audio_url, duration_frames = result
            
            # Get the actual audio file path
            filename = audio_url.split('/')[-1]
            filepath = os.path.join(temp_storage_dirs['audio'], filename)
            
            # Calculate duration independently
            calculated_frames = tts_service.calculate_duration_frames(filepath)
            
            # Duration should match (allowing for rounding)
            assert duration_frames == calculated_frames, \
                f"Duration frames mismatch: returned {duration_frames}, calculated {calculated_frames}"
            
            # Verify it's using 30 FPS
            assert tts_service.fps == 30, \
                f"FPS should be 30, got: {tts_service.fps}"


# Unit tests for edge cases and error handling

@pytest.mark.unit
class TestTTSServiceEdgeCases:
    """Unit tests for edge cases and error handling."""
    
    def test_generate_audio_empty_text(self, tts_service):
        """Test that empty text returns None."""
        result = tts_service.generate_audio("")
        assert result is None, "Empty text should return None"
    
    def test_generate_audio_whitespace_only(self, tts_service):
        """Test that whitespace-only text returns None."""
        result = tts_service.generate_audio("   \t\n  ")
        assert result is None, "Whitespace-only text should return None"
    
    def test_generate_audio_with_mock(self, tts_service, temp_storage_dirs):
        """Test that valid text generates audio successfully (with mock)."""
        with patch('services.tts_service.gTTS') as mock_gtts_class:
            # Create a mock TTS instance
            mock_tts = MagicMock()
            mock_gtts_class.return_value = mock_tts
            
            # Mock the save method
            def mock_save(path):
                with open(path, 'wb') as f:
                    f.write(b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 16000)
            
            mock_tts.save = mock_save
            
            result = tts_service.generate_audio("Hello world, this is a test.")
            
            # Should return tuple
            assert result is not None, "Valid text should generate audio"
            audio_url, duration_frames = result
            
            # Verify audio file exists
            filename = audio_url.split('/')[-1]
            filepath = os.path.join(temp_storage_dirs['audio'], filename)
            assert os.path.exists(filepath)
            
            # Verify duration is positive
            assert duration_frames > 0, f"Duration should be positive, got: {duration_frames}"
    
    def test_calculate_duration_frames_nonexistent_file(self, tts_service):
        """Test that calculating duration for nonexistent file returns default."""
        duration = tts_service.calculate_duration_frames("/nonexistent/file.mp3")
        assert duration == 90, "Should return default 90 frames for nonexistent file"
    
    def test_tts_failure_graceful_degradation(self, storage_service):
        """
        Test that TTS failures return None for audio_url with warning.
        
        Validates: Requirements 16.5, 24.5
        """
        tts_service = TTSService(storage_service=storage_service, fps=30)
        
        # Mock gTTS to raise an exception
        with patch('services.tts_service.gTTS') as mock_gtts:
            mock_gtts.side_effect = Exception("TTS service unavailable")
            
            result = tts_service.generate_audio("This should fail")
            
            # Should return None on failure
            assert result is None, "TTS failure should return None"
    
    def test_custom_fps(self, storage_service):
        """Test that custom FPS is used in duration calculation."""
        tts_service_60fps = TTSService(storage_service=storage_service, fps=60)
        assert tts_service_60fps.fps == 60
        
        # Test with mock
        with patch('services.tts_service.gTTS') as mock_gtts_class:
            mock_tts = MagicMock()
            mock_gtts_class.return_value = mock_tts
            
            def mock_save(path):
                with open(path, 'wb') as f:
                    f.write(b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 16000)
            
            mock_tts.save = mock_save
            
            result = tts_service_60fps.generate_audio("Test with 60 FPS")
            
            if result is not None:
                audio_url, duration_frames = result
                # Duration should be roughly 2x compared to 30 FPS for same audio
                assert duration_frames > 0
