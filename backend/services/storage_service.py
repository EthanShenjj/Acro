"""
Storage service for handling file operations.

This service provides functionality for:
- Saving Base64 encoded images as PNG files
- Saving audio files (MP3)
- Generating thumbnails from images
- Managing file storage with unique filenames
"""

import os
import base64
import uuid
from datetime import datetime
from PIL import Image
from io import BytesIO
from typing import Tuple


class StorageService:
    """Service for managing file storage operations."""
    
    def __init__(self, images_folder: str, audio_folder: str, thumbnails_folder: str):
        """
        Initialize the storage service.
        
        Args:
            images_folder: Path to the images storage directory
            audio_folder: Path to the audio storage directory
            thumbnails_folder: Path to the thumbnails storage directory
        """
        self.images_folder = images_folder
        self.audio_folder = audio_folder
        self.thumbnails_folder = thumbnails_folder
        
        # Ensure directories exist
        os.makedirs(self.images_folder, exist_ok=True)
        os.makedirs(self.audio_folder, exist_ok=True)
        os.makedirs(self.thumbnails_folder, exist_ok=True)
    
    def save_image(self, base64_data: str) -> str:
        """
        Decode Base64 image data and save as PNG file.
        
        Args:
            base64_data: Base64 encoded image string (with or without data URI prefix)
        
        Returns:
            URL path to the saved image in format /static/images/{filename}
        
        Raises:
            ValueError: If base64_data is invalid or cannot be decoded
        """
        try:
            # Remove data URI prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            
            # Decode Base64 data
            image_bytes = base64.b64decode(base64_data)
            
            # Generate unique filename
            filename = self._generate_unique_filename('png')
            filepath = os.path.join(self.images_folder, filename)
            
            # Open image and save as PNG
            image = Image.open(BytesIO(image_bytes))
            image.save(filepath, 'PNG')
            
            # Return URL path
            return f'/static/images/{filename}'
        
        except Exception as e:
            raise ValueError(f"Failed to save image: {str(e)}")
    
    def save_audio(self, audio_data: bytes, extension: str = 'mp3') -> str:
        """
        Save audio file to storage.
        
        Args:
            audio_data: Raw audio file bytes
            extension: File extension (default: 'mp3')
        
        Returns:
            URL path to the saved audio in format /static/audio/{filename}
        
        Raises:
            ValueError: If audio_data is invalid or cannot be saved
        """
        try:
            # Generate unique filename
            filename = self._generate_unique_filename(extension)
            filepath = os.path.join(self.audio_folder, filename)
            
            # Write audio data to file
            with open(filepath, 'wb') as f:
                f.write(audio_data)
            
            # Return URL path
            return f'/static/audio/{filename}'
        
        except Exception as e:
            raise ValueError(f"Failed to save audio: {str(e)}")
    
    def generate_thumbnail(self, image_path: str, size: Tuple[int, int] = (320, 180)) -> str:
        """
        Generate a thumbnail from an image file.
        
        Args:
            image_path: Path to the source image file (can be full path or URL path)
            size: Thumbnail dimensions as (width, height) tuple (default: 320x180)
        
        Returns:
            URL path to the generated thumbnail in format /static/thumbnails/{filename}
        
        Raises:
            ValueError: If image cannot be processed or thumbnail cannot be created
        """
        try:
            # Convert URL path to filesystem path if needed
            if image_path.startswith('/static/images/'):
                filename = image_path.split('/')[-1]
                source_path = os.path.join(self.images_folder, filename)
            else:
                source_path = image_path
            
            # Verify source file exists
            if not os.path.exists(source_path):
                raise ValueError(f"Source image not found: {source_path}")
            
            # Open image
            image = Image.open(source_path)
            
            # Create thumbnail (maintains aspect ratio)
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Generate unique filename for thumbnail
            filename = self._generate_unique_filename('png')
            thumbnail_path = os.path.join(self.thumbnails_folder, filename)
            
            # Save thumbnail
            image.save(thumbnail_path, 'PNG')
            
            # Return URL path
            return f'/static/thumbnails/{filename}'
        
        except Exception as e:
            raise ValueError(f"Failed to generate thumbnail: {str(e)}")
    
    def _generate_unique_filename(self, extension: str) -> str:
        """
        Generate a unique filename using UUID and timestamp.
        
        Args:
            extension: File extension (without dot)
        
        Returns:
            Unique filename in format {uuid}_{timestamp}.{extension}
        """
        unique_id = uuid.uuid4().hex
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{unique_id}_{timestamp}.{extension}"
