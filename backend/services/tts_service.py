"""
TTS service for generating audio from text.

This service provides functionality for:
- Converting text to speech using gTTS
- Calculating audio duration in frames (30 FPS)
- Saving generated audio files using StorageService
- Handling TTS failures gracefully
"""

import os
import tempfile
import math
from typing import Optional, Tuple
from gtts import gTTS
import logging

from services.storage_service import StorageService


logger = logging.getLogger(__name__)


try:
    from mutagen.mp3 import MP3
    MUTAGEN_AVAILABLE = True
except ImportError:
    MUTAGEN_AVAILABLE = False
    logger.warning("mutagen not available, using fallback duration calculation")


class TTSService:
    """Service for text-to-speech conversion and audio management."""
    
    def __init__(self, storage_service: StorageService, fps: int = 30):
        """
        Initialize the TTS service.
        
        Args:
            storage_service: StorageService instance for saving audio files
            fps: Frames per second for duration calculation (default: 30)
        """
        self.storage_service = storage_service
        self.fps = fps
    
    def generate_audio(self, text: str, language: str = 'en') -> Optional[Tuple[str, int]]:
        """
        Generate TTS audio from text and save to storage.
        
        Args:
            text: Text to convert to speech
            language: Language code for TTS (default: 'en')
        
        Returns:
            Tuple of (audio_url, duration_frames) if successful, None if TTS fails
        
        Note:
            If TTS generation fails, returns None and logs a warning.
            This allows the system to continue without audio for the step.
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for TTS generation")
            return None
        
        try:
            # Generate TTS audio
            tts = gTTS(text=text, lang=language, slow=False)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = temp_file.name
                tts.save(temp_path)
            
            # Read audio data
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            # Calculate duration in frames
            duration_frames = self.calculate_duration_frames(temp_path)
            
            # Clean up temporary file
            os.unlink(temp_path)
            
            # Save audio using StorageService
            audio_url = self.storage_service.save_audio(audio_data, extension='mp3')
            
            logger.info(f"Generated TTS audio: {audio_url}, duration: {duration_frames} frames")
            return (audio_url, duration_frames)
        
        except Exception as e:
            logger.warning(f"TTS generation failed for text '{text[:50]}...': {str(e)}")
            return None
    
    def calculate_duration_frames(self, audio_path: str) -> int:
        """
        Calculate the duration of an audio file in frames.
        
        Args:
            audio_path: Path to the audio file
        
        Returns:
            Duration in frames (rounded up to nearest frame)
        
        Note:
            Uses 30 FPS by default. Duration is calculated as:
            duration_frames = ceil(audio_duration_seconds * fps)
        """
        try:
            if MUTAGEN_AVAILABLE:
                # Use mutagen to get accurate duration
                audio = MP3(audio_path)
                duration_seconds = audio.info.length
            else:
                # Fallback: estimate based on file size
                # Average MP3 bitrate is ~128 kbps = 16 KB/s
                file_size = os.path.getsize(audio_path)
                duration_seconds = file_size / 16000  # Rough estimate
            
            # Convert to frames (round up)
            duration_frames = math.ceil(duration_seconds * self.fps)
            
            return duration_frames
        
        except Exception as e:
            logger.error(f"Failed to calculate audio duration: {str(e)}")
            # Return default duration (3 seconds) if calculation fails
            return 90  # 3 seconds * 30 fps

