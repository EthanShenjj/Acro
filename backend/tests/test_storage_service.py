"""
Tests for StorageService.

This module contains both unit tests and property-based tests for the storage service.
"""

import os
import base64
import tempfile
import shutil
import pytest
from hypothesis import given, strategies as st, settings
from PIL import Image
from io import BytesIO

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


def generate_test_image(width: int, height: int, color: tuple = (255, 0, 0)) -> bytes:
    """Generate a test image as bytes."""
    image = Image.new('RGB', (width, height), color)
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def image_to_base64(image_bytes: bytes, with_prefix: bool = True) -> str:
    """Convert image bytes to Base64 string."""
    b64_string = base64.b64encode(image_bytes).decode('utf-8')
    if with_prefix:
        return f"data:image/png;base64,{b64_string}"
    return b64_string


# Property-based tests

@pytest.mark.property
class TestImageProcessingPipeline:
    """Property-based tests for image processing pipeline."""
    
    # Feature: acro-saas-demo-video-tool, Property 30: Image processing pipeline
    @given(
        width=st.integers(min_value=100, max_value=2000),
        height=st.integers(min_value=100, max_value=2000),
        with_prefix=st.booleans()
    )
    @settings(max_examples=100, deadline=None)
    def test_image_processing_pipeline(self, storage_service, temp_storage_dirs, width, height, with_prefix):
        """
        For any Base64 image upload, should decode, save, and return URL.
        
        Validates: Requirements 17.1, 17.2, 17.3
        """
        # Generate test image
        image_bytes = generate_test_image(width, height)
        base64_image = image_to_base64(image_bytes, with_prefix=with_prefix)
        
        # Save image
        result_url = storage_service.save_image(base64_image)
        
        # Verify URL format
        assert result_url.startswith('/static/images/'), \
            f"URL should start with /static/images/, got: {result_url}"
        assert result_url.endswith('.png'), \
            f"URL should end with .png, got: {result_url}"
        
        # Verify file exists
        filename = result_url.split('/')[-1]
        filepath = os.path.join(temp_storage_dirs['images'], filename)
        assert os.path.exists(filepath), \
            f"Image file should exist at: {filepath}"
        
        # Verify file is a valid PNG
        saved_image = Image.open(filepath)
        assert saved_image.format == 'PNG', \
            f"Saved image should be PNG format, got: {saved_image.format}"
        assert saved_image.size == (width, height), \
            f"Saved image dimensions should be {width}x{height}, got: {saved_image.size}"


@pytest.mark.property
class TestThumbnailGeneration:
    """Property-based tests for thumbnail generation."""
    
    # Feature: acro-saas-demo-video-tool, Property 31: Thumbnail generation
    @given(
        source_width=st.integers(min_value=320, max_value=3840),
        source_height=st.integers(min_value=180, max_value=2160)
    )
    @settings(max_examples=100, deadline=None)
    def test_thumbnail_generation(self, storage_service, temp_storage_dirs, source_width, source_height):
        """
        For any image, should generate a 320x180 thumbnail.
        
        Validates: Requirements 15.5, 25.5
        """
        # Create source image
        image_bytes = generate_test_image(source_width, source_height)
        base64_image = image_to_base64(image_bytes)
        
        # Save source image
        source_url = storage_service.save_image(base64_image)
        
        # Generate thumbnail
        thumbnail_url = storage_service.generate_thumbnail(source_url)
        
        # Verify thumbnail URL format
        assert thumbnail_url.startswith('/static/thumbnails/'), \
            f"Thumbnail URL should start with /static/thumbnails/, got: {thumbnail_url}"
        assert thumbnail_url.endswith('.png'), \
            f"Thumbnail URL should end with .png, got: {thumbnail_url}"
        
        # Verify thumbnail file exists
        thumbnail_filename = thumbnail_url.split('/')[-1]
        thumbnail_path = os.path.join(temp_storage_dirs['thumbnails'], thumbnail_filename)
        assert os.path.exists(thumbnail_path), \
            f"Thumbnail file should exist at: {thumbnail_path}"
        
        # Verify thumbnail dimensions
        thumbnail_image = Image.open(thumbnail_path)
        assert thumbnail_image.format == 'PNG', \
            f"Thumbnail should be PNG format, got: {thumbnail_image.format}"
        
        # Thumbnail should fit within 320x180 while maintaining aspect ratio
        assert thumbnail_image.width <= 320, \
            f"Thumbnail width should be <= 320, got: {thumbnail_image.width}"
        assert thumbnail_image.height <= 180, \
            f"Thumbnail height should be <= 180, got: {thumbnail_image.height}"
        
        # At least one dimension should match the target size (aspect ratio maintained)
        assert thumbnail_image.width == 320 or thumbnail_image.height == 180, \
            f"At least one dimension should match target size, got: {thumbnail_image.width}x{thumbnail_image.height}"


# Unit tests for edge cases

@pytest.mark.unit
class TestStorageServiceEdgeCases:
    """Unit tests for edge cases and error handling."""
    
    def test_save_image_invalid_base64(self, storage_service):
        """Test that invalid Base64 data raises ValueError."""
        with pytest.raises(ValueError, match="Failed to save image"):
            storage_service.save_image("invalid-base64-data")
    
    def test_save_audio_creates_file(self, storage_service, temp_storage_dirs):
        """Test that save_audio creates a valid audio file."""
        audio_data = b"fake audio data"
        audio_url = storage_service.save_audio(audio_data)
        
        assert audio_url.startswith('/static/audio/')
        assert audio_url.endswith('.mp3')
        
        # Verify file exists
        filename = audio_url.split('/')[-1]
        filepath = os.path.join(temp_storage_dirs['audio'], filename)
        assert os.path.exists(filepath)
        
        # Verify content
        with open(filepath, 'rb') as f:
            assert f.read() == audio_data
    
    def test_generate_thumbnail_nonexistent_image(self, storage_service):
        """Test that generating thumbnail from nonexistent image raises ValueError."""
        with pytest.raises(ValueError, match="Source image not found"):
            storage_service.generate_thumbnail("/static/images/nonexistent.png")
    
    def test_unique_filenames(self, storage_service):
        """Test that generated filenames are unique."""
        image_bytes = generate_test_image(100, 100)
        base64_image = image_to_base64(image_bytes)
        
        # Save same image multiple times
        url1 = storage_service.save_image(base64_image)
        url2 = storage_service.save_image(base64_image)
        
        # URLs should be different
        assert url1 != url2, "Generated filenames should be unique"
