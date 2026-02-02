"""
Recording session API endpoints.

This module provides endpoints for:
- Starting a recording session
- Uploading step chunks during recording
- Stopping and finalizing a recording session
"""

import uuid
import logging
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError

from models.project import Project
from models.step import Step, ActionType
from models.folder import Folder, FolderType
from services.storage_service import StorageService
from services.tts_service import TTSService


logger = logging.getLogger(__name__)

recording_bp = Blueprint('recording', __name__)


# In-memory session storage (for simplicity, could be Redis in production)
active_sessions = {}


@recording_bp.route('/start', methods=['POST'])
def start_recording():
    """
    Start a new recording session.
    
    Returns:
        JSON response with sessionId and status
    
    Example response:
        {
            "sessionId": "uuid-v4",
            "status": "active"
        }
    """
    try:
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Create session data
        active_sessions[session_id] = {
            'session_id': session_id,
            'project_id': None,
            'step_count': 0,
            'first_image_url': None
        }
        
        logger.info(f"Started recording session: {session_id}")
        
        return jsonify({
            'sessionId': session_id,
            'status': 'active'
        }), 200
    
    except Exception as e:
        logger.error(f"Failed to start recording session: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to start recording session'
        }), 500


@recording_bp.route('/chunk', methods=['POST'])
def upload_chunk():
    """
    Upload a step chunk during recording.
    
    Expected request body:
        {
            "sessionId": "uuid-v4",
            "orderIndex": 1,
            "actionType": "click",
            "targetText": "Submit Button",
            "posX": 450,
            "posY": 320,
            "viewportWidth": 1920,
            "viewportHeight": 1080,
            "screenshotBase64": "data:image/png;base64,iVBORw0KG..."
        }
    
    Returns:
        JSON response with stepId, imageUrl, and status
    
    Example response:
        {
            "stepId": 123,
            "imageUrl": "/static/images/uuid.png",
            "status": "saved"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Log received data for debugging (without the large base64 image)
        debug_data = {k: v if k != 'screenshotBase64' else f'<base64 data {len(v) if v else 0} chars>' 
                      for k, v in (data or {}).items()}
        logger.info(f"Received chunk upload request: {debug_data}")
        
        # Validate request has JSON data
        if not data:
            logger.error("No JSON data in request body")
            return jsonify({
                'error': 'Bad Request',
                'message': 'Request body must contain JSON data'
            }), 400
        
        # Validate required fields
        required_fields = ['sessionId', 'orderIndex', 'actionType', 'posX', 'posY', 'screenshotBase64']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}. Received fields: {list(data.keys())}")
            return jsonify({
                'error': 'Bad Request',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        session_id = data['sessionId']
        
        # Validate session exists
        if session_id not in active_sessions:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Invalid session ID'
            }), 400
        
        session = active_sessions[session_id]
        
        # Initialize services
        storage_service = StorageService(
            images_folder=current_app.config['IMAGES_FOLDER'],
            audio_folder=current_app.config['AUDIO_FOLDER'],
            thumbnails_folder=current_app.config['THUMBNAILS_FOLDER']
        )
        tts_service = TTSService(
            storage_service=storage_service,
            fps=current_app.config['VIDEO_FPS']
        )
        
        # Decode and save Base64 image
        try:
            image_url = storage_service.save_image(data['screenshotBase64'])
        except ValueError as e:
            return jsonify({
                'error': 'Bad Request',
                'message': f'Invalid Base64 image data: {str(e)}'
            }), 400
        
        # Store first image URL for thumbnail generation
        if session['first_image_url'] is None:
            session['first_image_url'] = image_url
        
        # Create project if this is the first step
        if session['project_id'] is None:
            # Get default folder (All Flows)
            db_session = current_app.db_session
            default_folder = db_session.query(Folder).filter_by(
                name='All Flows',
                type=FolderType.SYSTEM
            ).first()
            
            if not default_folder:
                # Create default folder if it doesn't exist
                default_folder = Folder(name='All Flows', type=FolderType.SYSTEM)
                db_session.add(default_folder)
                db_session.commit()
            
            # Create project
            from datetime import datetime
            project_title = f"New Demo - {datetime.now().strftime('%Y/%m/%d %H:%M')}"
            project = Project(
                title=project_title,
                folder_id=default_folder.id
            )
            db_session.add(project)
            db_session.commit()
            
            session['project_id'] = project.id
            logger.info(f"Created project {project.id} for session {session_id}")
        
        # Generate script text from target text
        target_text = data.get('targetText', '')
        if target_text:
            script_text = f"Click on {target_text}"
        else:
            script_text = f"Perform {data['actionType']} action"
        
        # Generate TTS audio
        audio_result = tts_service.generate_audio(script_text)
        if audio_result:
            audio_url, duration_frames = audio_result
        else:
            audio_url = None
            duration_frames = 90  # Default 3 seconds
            logger.warning(f"TTS generation failed for step, using default duration")
        
        # Create Step record
        db_session = current_app.db_session
        step = Step(
            project_id=session['project_id'],
            order_index=data['orderIndex'],
            action_type=ActionType(data['actionType']),
            target_text=target_text,
            script_text=script_text,
            audio_url=audio_url,
            image_url=image_url,
            pos_x=data['posX'],
            pos_y=data['posY'],
            duration_frames=duration_frames
        )
        db_session.add(step)
        db_session.commit()
        
        session['step_count'] += 1
        
        logger.info(f"Saved step {step.id} for session {session_id}")
        
        return jsonify({
            'stepId': step.id,
            'imageUrl': image_url,
            'status': 'saved'
        }), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in upload_chunk: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to upload chunk: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to upload chunk'
        }), 500


@recording_bp.route('/stop', methods=['POST'])
def stop_recording():
    """
    Stop and finalize a recording session.
    
    Expected request body:
        {
            "sessionId": "uuid-v4"
        }
    
    Returns:
        JSON response with projectId, uuid, and redirectUrl
    
    Example response:
        {
            "projectId": 42,
            "uuid": "project-uuid",
            "redirectUrl": "http://localhost:3000/editor/project-uuid"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        if 'sessionId' not in data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Missing required field: sessionId'
            }), 400
        
        session_id = data['sessionId']
        
        # Validate session exists
        if session_id not in active_sessions:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Invalid session ID'
            }), 400
        
        session = active_sessions[session_id]
        project_id = session['project_id']
        
        # If no project was created (no steps recorded), create an empty project
        if project_id is None:
            # Get default folder (All Flows)
            db_session = current_app.db_session
            default_folder = db_session.query(Folder).filter_by(
                name='All Flows',
                type=FolderType.SYSTEM
            ).first()
            
            if not default_folder:
                return jsonify({
                    'error': 'Internal Server Error',
                    'message': 'Default folder not found'
                }), 500
            
            # Create empty project
            from datetime import datetime
            project_title = f"New Demo - {datetime.now().strftime('%Y/%m/%d %H:%M')}"
            project = Project(
                title=project_title,
                folder_id=default_folder.id
            )
            db_session.add(project)
            db_session.commit()
            
            project_id = project.id
            logger.info(f"Created empty project {project_id} for session {session_id}")
        else:
            # Get existing project from database
            db_session = current_app.db_session
            project = db_session.query(Project).filter_by(id=project_id).first()
            
            if not project:
                return jsonify({
                    'error': 'Not Found',
                    'message': 'Project not found'
                }), 404
        
        # Generate thumbnail from first step's image
        if session['first_image_url']:
            try:
                storage_service = StorageService(
                    images_folder=current_app.config['IMAGES_FOLDER'],
                    audio_folder=current_app.config['AUDIO_FOLDER'],
                    thumbnails_folder=current_app.config['THUMBNAILS_FOLDER']
                )
                thumbnail_url = storage_service.generate_thumbnail(session['first_image_url'])
                project.thumbnail_url = thumbnail_url
                db_session.commit()
                logger.info(f"Generated thumbnail for project {project_id}: {thumbnail_url}")
            except Exception as e:
                logger.warning(f"Failed to generate thumbnail for project {project_id}: {str(e)}")
                # Continue without thumbnail
        
        # Build redirect URL
        # In production, this would be the actual frontend URL
        redirect_url = f"http://localhost:3000/editor/{project.uuid}"
        
        # Clean up session
        del active_sessions[session_id]
        
        logger.info(f"Stopped recording session {session_id}, created project {project_id}")
        
        return jsonify({
            'projectId': project.id,
            'uuid': project.uuid,
            'redirectUrl': redirect_url
        }), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in stop_recording: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to stop recording: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to stop recording'
        }), 500
