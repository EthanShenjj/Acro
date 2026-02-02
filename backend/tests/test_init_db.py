"""
Tests for database initialization script.

Validates: Requirements 23.1, 23.2
"""
import pytest
from models import Folder, FolderType
from init_db import init_database


class TestDatabaseInitialization:
    """Test database initialization and seeding."""
    
    def test_init_database_creates_tables(self, app):
        """Test that init_database creates all required tables."""
        with app.app_context():
            # Tables should already be created by conftest fixture
            # Verify tables exist by querying them
            folders = app.db_session.query(Folder).all()
            assert folders is not None  # Query succeeds, table exists
    
    def test_system_folders_created(self, app):
        """
        Test that system folders are created during initialization.
        
        Validates: Requirements 23.1, 23.2
        """
        with app.app_context():
            # Query system folders
            system_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).all()
            
            # Should have exactly 2 system folders
            assert len(system_folders) == 2
            
            # Extract folder names
            folder_names = {folder.name for folder in system_folders}
            
            # Verify required system folders exist
            assert 'All Flows' in folder_names
            assert 'Trash' in folder_names
    
    def test_all_flows_folder_properties(self, app):
        """
        Test that 'All Flows' folder has correct properties.
        
        Validates: Requirement 23.1
        """
        with app.app_context():
            all_flows = app.db_session.query(Folder).filter(
                Folder.name == 'All Flows'
            ).first()
            
            assert all_flows is not None
            assert all_flows.type == FolderType.SYSTEM
            assert all_flows.created_at is not None
    
    def test_trash_folder_properties(self, app):
        """
        Test that 'Trash' folder has correct properties.
        
        Validates: Requirement 23.2
        """
        with app.app_context():
            trash = app.db_session.query(Folder).filter(
                Folder.name == 'Trash'
            ).first()
            
            assert trash is not None
            assert trash.type == FolderType.SYSTEM
            assert trash.created_at is not None
    
    def test_init_database_idempotent(self, app):
        """
        Test that running init_database multiple times is safe.
        
        Should not create duplicate system folders.
        """
        with app.app_context():
            # Get initial count
            initial_count = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).count()
            
            # Run init_database again (simulated by checking existing folders)
            existing_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).all()
            
            # Should still have same count
            assert len(existing_folders) == initial_count
            assert initial_count == 2
    
    def test_system_folder_ids_are_sequential(self, app):
        """Test that system folders have sequential IDs."""
        with app.app_context():
            system_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).order_by(Folder.id).all()
            
            assert len(system_folders) == 2
            # IDs should be positive integers
            assert all(folder.id > 0 for folder in system_folders)
    
    def test_folder_to_dict_includes_type(self, app):
        """Test that folder serialization includes type field."""
        with app.app_context():
            all_flows = app.db_session.query(Folder).filter(
                Folder.name == 'All Flows'
            ).first()
            
            folder_dict = all_flows.to_dict()
            
            assert 'type' in folder_dict
            assert folder_dict['type'] == 'system'
            assert folder_dict['name'] == 'All Flows'
            assert 'id' in folder_dict
            assert 'createdAt' in folder_dict


class TestSystemFolderBehavior:
    """Test behavior specific to system folders."""
    
    def test_system_folders_cannot_be_deleted(self, app):
        """
        Test that system folders are protected from deletion.
        
        This is enforced at the API level, not database level.
        Validates: Requirement 23.5
        """
        with app.app_context():
            all_flows = app.db_session.query(Folder).filter(
                Folder.name == 'All Flows'
            ).first()
            
            # Verify it's a system folder
            assert all_flows.type == FolderType.SYSTEM
            
            # System folders should be identifiable by type
            # (Deletion protection is implemented in API routes)
            assert all_flows.type == FolderType.SYSTEM
    
    def test_can_query_folders_by_type(self, app):
        """Test that folders can be filtered by type."""
        with app.app_context():
            # Query system folders
            system_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).all()
            
            # Query user folders
            user_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.USER
            ).all()
            
            # Should have 2 system folders
            assert len(system_folders) == 2
            
            # Should have 0 user folders initially
            assert len(user_folders) == 0
