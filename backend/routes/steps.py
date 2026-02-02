"""
Step update API endpoints.

This module provides endpoints for:
- Updating step script text and regenerating TTS audio
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError

from models.step import Step
from services.tts_service import TTSService
from services.storage_service import StorageService


logger = logging.getLogger(__name__)

steps_bp = Blueprint('steps', __name__)


@steps_bp.route('/<int:step_id>/update_script', methods=['POST'])
def update_script(step_id):
    """
    Update step script text and regenerate TTS audio.
    
    Expected request body:
        {
            "scriptText": "Now click the submit button to proceed"
        }
    
    Returns:
        JSON response with updated step details
    
    Example response:
        {
            "id": 1,
            "scriptText": "Now click the submit button to proceed",
            "audioUrl": "/static/audio/step-1-new-uuid.mp3",
            "durationFrames": 135
        }
    
    Note:
        If TTS generation fails, the step is updated with the new script text
        but audio_url remains unchanged (or null), and a warning is included
        in the response.
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        if not data or 'scriptText' not in data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Missing required field: scriptText'
            }), 400
        
        script_text = data['scriptText']
        
        # Validate script text
        if not script_text or not script_text.strip():
            return jsonify({
                'error': 'Bad Request',
                'message': 'Script text cannot be empty'
            }), 400
        
        db_session = current_app.db_session
        
        # Get step
        step = db_session.query(Step).filter_by(id=step_id).first()
        
        if not step:
            return jsonify({
                'error': 'Not Found',
                'message': 'Step not found'
            }), 404
        
        # Update script text
        step.script_text = script_text.strip()
        
        # Initialize TTS service
        storage_service = StorageService(
            images_folder=current_app.config['IMAGES_FOLDER'],
            audio_folder=current_app.config['AUDIO_FOLDER'],
            thumbnails_folder=current_app.config['THUMBNAILS_FOLDER']
        )
        tts_service = TTSService(storage_service=storage_service)
        
        # Generate new TTS audio
        tts_result = tts_service.generate_audio(script_text.strip())
        
        warning = None
        if tts_result:
            audio_url, duration_frames = tts_result
            step.audio_url = audio_url
            step.duration_frames = duration_frames
            logger.info(f"Updated step {step_id} with new TTS audio")
        else:
            # TTS generation failed - keep existing audio or set to None
            warning = "TTS generation failed, audio not updated"
            logger.warning(f"TTS generation failed for step {step_id}")
        
        db_session.commit()
        
        # Build response
        response = {
            'id': step.id,
            'scriptText': step.script_text,
            'audioUrl': step.audio_url,
            'durationFrames': step.duration_frames
        }
        
        if warning:
            response['warning'] = warning
        
        return jsonify(response), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in update_script: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to update script: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to update script'
        }), 500
