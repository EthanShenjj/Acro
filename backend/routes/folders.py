"""
Folder management API endpoints.

This module provides endpoints for:
- Retrieving all folders
- Creating new folders
- Renaming folders
- Deleting folders (with system folder protection)
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError

from models.folder import Folder, FolderType


logger = logging.getLogger(__name__)

folders_bp = Blueprint('folders', __name__)


@folders_bp.route('', methods=['GET'])
def get_folders():
    """
    Get all folders.
    
    Returns:
        JSON response with list of folders
    
    Example response:
        {
            "folders": [
                {
                    "id": 1,
                    "name": "All Flows",
                    "type": "system",
                    "createdAt": "2024-01-15T10:30:00Z"
                },
                {
                    "id": 2,
                    "name": "Trash",
                    "type": "system",
                    "createdAt": "2024-01-15T10:30:00Z"
                }
            ]
        }
    """
    try:
        db_session = current_app.db_session
        
        # Get all folders ordered by creation date
        folders = db_session.query(Folder).order_by(Folder.created_at.asc()).all()
        
        # Convert to dict
        folders_data = [folder.to_dict() for folder in folders]
        
        return jsonify({'folders': folders_data}), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_folders: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to get folders: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to get folders'
        }), 500


@folders_bp.route('', methods=['POST'])
def create_folder():
    """
    Create a new folder.
    
    Expected request body:
        {
            "name": "My Folder"
        }
    
    Returns:
        JSON response with created folder details
    
    Example response:
        {
            "id": 3,
            "name": "My Folder",
            "type": "user",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        if not data or 'name' not in data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Missing required field: name'
            }), 400
        
        name = data['name']
        
        # Validate name
        if not name or not name.strip():
            return jsonify({
                'error': 'Bad Request',
                'message': 'Folder name cannot be empty'
            }), 400
        
        if len(name) > 255:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Folder name cannot exceed 255 characters'
            }), 400
        
        db_session = current_app.db_session
        
        # Create folder (default type is USER)
        folder = Folder(
            name=name.strip(),
            type=FolderType.USER
        )
        db_session.add(folder)
        db_session.commit()
        
        logger.info(f"Created folder {folder.id}: {folder.name}")
        
        return jsonify(folder.to_dict()), 201
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in create_folder: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to create folder: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to create folder'
        }), 500


@folders_bp.route('/<int:folder_id>', methods=['PUT'])
def update_folder(folder_id):
    """
    Rename a folder.
    
    Expected request body:
        {
            "name": "Updated Folder Name"
        }
    
    Returns:
        JSON response with updated folder details
    
    Example response:
        {
            "id": 3,
            "name": "Updated Folder Name",
            "type": "user",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Missing required field: name'
            }), 400
        
        name = data['name']
        
        # Validate name
        if not name or not name.strip():
            return jsonify({
                'error': 'Bad Request',
                'message': 'Folder name cannot be empty'
            }), 400
        
        if len(name) > 255:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Folder name cannot exceed 255 characters'
            }), 400
        
        db_session = current_app.db_session
        
        # Get folder
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        
        if not folder:
            return jsonify({
                'error': 'Not Found',
                'message': 'Folder not found'
            }), 404
        
        # Update name
        folder.name = name.strip()
        db_session.commit()
        
        logger.info(f"Updated folder {folder.id} to name: {folder.name}")
        
        return jsonify(folder.to_dict()), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in update_folder: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to update folder: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to update folder'
        }), 500


@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    """
    Delete a folder.
    
    System folders (type='system') cannot be deleted.
    
    Returns:
        JSON response with success message
    
    Example response:
        {
            "message": "Folder deleted successfully",
            "folderId": 3
        }
    """
    try:
        db_session = current_app.db_session
        
        # Get folder
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        
        if not folder:
            return jsonify({
                'error': 'Not Found',
                'message': 'Folder not found'
            }), 404
        
        # Check if folder is a system folder
        if folder.type == FolderType.SYSTEM:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Cannot delete system folder'
            }), 400
        
        # Delete folder
        db_session.delete(folder)
        db_session.commit()
        
        logger.info(f"Deleted folder {folder_id}")
        
        return jsonify({
            'message': 'Folder deleted successfully',
            'folderId': folder_id
        }), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error in delete_folder: {str(e)}")
        current_app.db_session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Database error occurred'
        }), 500
    
    except Exception as e:
        logger.error(f"Failed to delete folder: {str(e)}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'Failed to delete folder'
        }), 500
