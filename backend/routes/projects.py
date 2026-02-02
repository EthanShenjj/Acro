"""
Project management API endpoints.

This module provides endpoints for:
- Creating new projects
- Retrieving projects (with optional folder filtering)
- Retrieving project details (with steps)
- Updating project title or folder
- Soft deleting projects
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

from models.project import Project
from models.folder import Folder, FolderType


logger = logging.getLogger(__name__)

projects_bp = Blueprint('projects', __name__)


@projects_bp.route('', methods=['POST'])
def create_project():
    """
    Create a new project.
    
    Expected request body:
        {
            "title": "My Demo Project",
            "folderId": 1  (optional)
        }
    
    Returns:
        JSON response with created project details
    
    Example response:
        {
            "id": 42,
            "uuid": "project-uuid",
            "title": "My Demo Project",
            "folderId": 1,
            "thumbnailUrl": null,
            "createdAt": "2024-01-15T10:30:00Z"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        if not data or 'title' not in data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Missing required field: title'
            }), 400
        
        title = data['title']
        
        # Validate title
        if not title or not title.strip():
            return jsonify({
                'error': 'Bad Request',
                'message': 'Title cannot be empty'
            }), 400
        
        if len(title) > 255:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Title cannot exceed 255 characters'
            }), 400
        
        db_session = current_app.db_session
        
        # Get folder_id (use default if not provided)
        folder_id = data.get('folderId')
        
        if folder_id is None:
            # Get default folder (All Flows)
            default_folder = db_session.query(Folder).filter_by(
                name='All Flows',
                type=FolderType.SYSTEM
            ).first()
            
            if not default_folder:
                return jsonify({
                    'error': 'Internal Server Error',
                    'message': 'Default folder not found'
                }), 500
            
            folder_id = default_folder.id
        else:
            # Validate folder exists
            folder = db_session.query(Folder).filter_by(id=folder_id).first()
            if not folder:
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Folder with id {folder_id} not found'
                }), 400
        
        # Create project
        project = Project(
            title=title.strip(),
            folder_id=folder_id
        )
        db_session.add(project)
        db_session.commit()
        
        logger.info(f"Created project {project.id}: {project.title}")
        
        return jsonify(project.to_dict()), 201
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in create_project: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to create project: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to create project'
        }), 500


@projects_bp.route('', methods=['GET'])
def get_projects():
    """
    Get all projects with optional folder filtering.
    
    Query parameters:
        folderId: Optional folder ID to filter projects
    
    Returns:
        JSON response with list of projects
    
    Example response:
        {
            "projects": [
                {
                    "id": 42,
                    "uuid": "project-uuid",
                    "title": "New Demo - 2024/01/15",
                    "folderId": 1,
                    "thumbnailUrl": "/static/thumbnails/uuid.png",
                    "createdAt": "2024-01-15T10:30:00Z",
                    "stepCount": 12
                }
            ]
        }
    """
    try:
        db_session = current_app.db_session
        
        # Get folder_id filter from query params
        folder_id = request.args.get('folderId', type=int)
        
        # Build query
        query = db_session.query(Project).filter(Project.deleted_at.is_(None))
        
        if folder_id is not None:
            # Check if this is the "All Flows" folder
            folder = db_session.query(Folder).filter_by(id=folder_id).first()
            if folder and folder.name == 'All Flows' and folder.type == FolderType.SYSTEM:
                # For All Flows, exclude Trash folder projects but include all others
                trash_folder = db_session.query(Folder).filter_by(
                    name='Trash',
                    type=FolderType.SYSTEM
                ).first()
                
                if trash_folder:
                    query = query.filter(Project.folder_id != trash_folder.id)
                # Don't filter by folder_id for All Flows - show all non-trash projects
            else:
                # Filter by specific folder
                query = query.filter(Project.folder_id == folder_id)
        else:
            # No folder specified (default "All Projects" view)
            # Exclude projects in Trash folder
            trash_folder = db_session.query(Folder).filter_by(
                name='Trash',
                type=FolderType.SYSTEM
            ).first()
            
            if trash_folder:
                query = query.filter(Project.folder_id != trash_folder.id)
        
        # Order by created_at descending (newest first)
        projects = query.order_by(Project.created_at.desc()).all()
        
        # Convert to dict and add step count
        projects_data = []
        for project in projects:
            project_dict = project.to_dict()
            project_dict['stepCount'] = project.steps.count()
            projects_data.append(project_dict)
        
        return jsonify({'projects': projects_data}), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_projects: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to get projects: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to get projects'
        }), 500


@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """
    Get a single project by ID.
    
    Returns:
        JSON response with project details
    
    Example response:
        {
            "id": 42,
            "uuid": "project-uuid",
            "title": "New Demo - 2024/01/15",
            "folderId": 1,
            "thumbnailUrl": "/static/thumbnails/uuid.png",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    """
    try:
        db_session = current_app.db_session
        
        # Get project
        project = db_session.query(Project).filter_by(id=project_id).first()
        
        if not project:
            return jsonify({
                'error': 'Not Found',
                'message': 'Project not found'
            }), 404
        
        return jsonify(project.to_dict()), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_project: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to get project: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to get project'
        }), 500


@projects_bp.route('/<project_identifier>/details', methods=['GET'])
def get_project_details(project_identifier):
    """
    Get project details with all steps.
    Accepts either project ID (integer) or UUID (string).
    
    Returns:
        JSON response with project and steps
    
    Example response:
        {
            "id": 42,
            "uuid": "project-uuid",
            "title": "New Demo - 2024/01/15",
            "steps": [
                {
                    "id": 1,
                    "orderIndex": 0,
                    "actionType": "click",
                    "targetText": "Submit Button",
                    "scriptText": "Click the submit button",
                    "audioUrl": "/static/audio/step-1-uuid.mp3",
                    "imageUrl": "/static/images/step-1-uuid.png",
                    "posX": 450,
                    "posY": 320,
                    "durationFrames": 120
                }
            ],
            "totalDurationFrames": 1440
        }
    """
    try:
        db_session = current_app.db_session
        
        # Try to parse as integer ID first, otherwise treat as UUID
        try:
            project_id = int(project_identifier)
            project = db_session.query(Project).filter_by(id=project_id).first()
        except ValueError:
            # Not an integer, treat as UUID
            project = db_session.query(Project).filter_by(uuid=project_identifier).first()
        
        if not project:
            return jsonify({
                'error': 'Not Found',
                'message': 'Project not found'
            }), 404
        
        # Get project dict with steps
        project_dict = project.to_dict(include_steps=True)
        
        # Calculate total duration
        total_duration = sum(step['durationFrames'] for step in project_dict['steps'])
        project_dict['totalDurationFrames'] = total_duration
        
        return jsonify(project_dict), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_project_details: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to get project details: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to get project details'
        }), 500


@projects_bp.route('/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """
    Update project title or folder.
    
    Expected request body:
        {
            "title": "Updated Demo Title",  (optional)
            "folderId": 2  (optional)
        }
    
    Returns:
        JSON response with updated project details
    
    Example response:
        {
            "id": 42,
            "uuid": "project-uuid",
            "title": "Updated Demo Title",
            "folderId": 2,
            "thumbnailUrl": "/static/thumbnails/uuid.png",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Request body is required'
            }), 400
        
        db_session = current_app.db_session
        
        # Get project
        project = db_session.query(Project).filter_by(id=project_id).first()
        
        if not project:
            return jsonify({
                'error': 'Not Found',
                'message': 'Project not found'
            }), 404
        
        # Update title if provided
        if 'title' in data:
            title = data['title']
            
            if not title or not title.strip():
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'Title cannot be empty'
                }), 400
            
            if len(title) > 255:
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'Title cannot exceed 255 characters'
                }), 400
            
            project.title = title.strip()
        
        # Update folder_id if provided
        if 'folderId' in data:
            folder_id = data['folderId']
            
            # Validate folder exists
            folder = db_session.query(Folder).filter_by(id=folder_id).first()
            if not folder:
                return jsonify({
                    'error': 'Bad Request',
                    'message': f'Folder with id {folder_id} not found'
                }), 400
            
            project.folder_id = folder_id
        
        db_session.commit()
        
        logger.info(f"Updated project {project.id}")
        
        return jsonify(project.to_dict()), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in update_project: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to update project: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to update project'
        }), 500


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """
    Soft delete a project by setting deleted_at timestamp.
    
    Returns:
        JSON response with success message
    
    Example response:
        {
            "message": "Project deleted successfully",
            "projectId": 42
        }
    """
    try:
        db_session = current_app.db_session
        
        # Get project
        project = db_session.query(Project).filter_by(id=project_id).first()
        
        if not project:
            return jsonify({
                'error': 'Not Found',
                'message': 'Project not found'
            }), 404
        
        # Soft delete by setting deleted_at
        project.deleted_at = datetime.now(timezone.utc)
        db_session.commit()
        
        logger.info(f"Soft deleted project {project.id}")
        
        return jsonify({
            'message': 'Project deleted successfully',
            'projectId': project.id
        }), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in delete_project: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to delete project: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to delete project'
        }), 500
