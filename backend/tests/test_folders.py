"""
Tests for folder management API endpoints.

This module includes:
- Property-based tests for system folder protection
- Unit tests for folder CRUD operations
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck

from models.folder import Folder, FolderType


class TestSystemFolderProtection:
    """Property-based tests for system folder protection."""
    
    # Feature: acro-saas-demo-video-tool, Property 16: System folder protection
    @given(
        folder_name=st.sampled_from(['All Flows', 'Trash'])
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_system_folder_protection(self, client, db_session, folder_name):
        """
        Property 16: System folder protection
        
        For any delete attempt on a folder with type='system', the operation 
        should be rejected with an error.
        
        Validates: Requirements 23.5
        """
        # Create system folder
        system_folder = Folder(name=folder_name, type=FolderType.SYSTEM)
        db_session.add(system_folder)
        db_session.commit()
        folder_id = system_folder.id
        
        # Attempt to delete system folder
        response = client.delete(f'/api/folders/{folder_id}')
        
        # Property: Delete should be rejected
        assert response.status_code == 400, \
            f"System folder '{folder_name}' should not be deletable"
        
        data = response.get_json()
        assert 'error' in data
        assert 'system' in data['message'].lower(), \
            "Error message should mention system folder"
        
        # Property: Folder should still exist in database
        db_session.expire(system_folder)
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        assert folder is not None, \
            f"System folder '{folder_name}' should still exist after delete attempt"
        assert folder.type == FolderType.SYSTEM


class TestFolderCRUD:
    """Unit tests for folder CRUD operations."""
    
    def test_get_folders_empty(self, client, db_session):
        """Test getting folders returns system folders by default."""
        response = client.get('/api/folders')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'folders' in data
        # Should have 2 system folders (All Flows and Trash)
        assert len(data['folders']) == 2
        folder_names = {f['name'] for f in data['folders']}
        assert 'All Flows' in folder_names
        assert 'Trash' in folder_names
    
    def test_get_folders_with_data(self, client, db_session):
        """Test getting folders with additional user folders."""
        # Create user folder (system folders already exist from fixture)
        folder3 = Folder(name='My Folder', type=FolderType.USER)
        db_session.add(folder3)
        db_session.commit()
        
        # Get folders
        response = client.get('/api/folders')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'folders' in data
        assert len(data['folders']) == 3
        
        # Verify folder data
        folder_names = [f['name'] for f in data['folders']]
        assert 'All Flows' in folder_names
        assert 'Trash' in folder_names
        assert 'My Folder' in folder_names
    
    def test_create_folder_with_name(self, client, db_session):
        """Test creating a folder with a name."""
        folder_data = {'name': 'My Test Folder'}
        response = client.post('/api/folders', json=folder_data)
        
        # Verify response
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'My Test Folder'
        assert data['type'] == 'user'
        assert 'id' in data
        assert 'createdAt' in data
    
    def test_create_folder_without_name(self, client, db_session):
        """Test that creating a folder without name fails."""
        response = client.post('/api/folders', json={})
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'name' in data['message'].lower()
    
    def test_create_folder_with_empty_name(self, client, db_session):
        """Test that creating a folder with empty name fails."""
        folder_data = {'name': '   '}
        response = client.post('/api/folders', json=folder_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'empty' in data['message'].lower()
    
    def test_create_folder_with_long_name(self, client, db_session):
        """Test that creating a folder with name > 255 chars fails."""
        folder_data = {'name': 'A' * 256}
        response = client.post('/api/folders', json=folder_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert '255' in data['message']
    
    def test_update_folder_name(self, client, db_session):
        """Test updating a folder name."""
        # Create folder
        folder = Folder(name='Original Name', type=FolderType.USER)
        db_session.add(folder)
        db_session.commit()
        
        # Update folder
        update_data = {'name': 'Updated Name'}
        response = client.put(f'/api/folders/{folder.id}', json=update_data)
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Updated Name'
        
        # Verify in database
        db_session.expire(folder)
        assert folder.name == 'Updated Name'
    
    def test_update_folder_not_found(self, client, db_session):
        """Test updating a non-existent folder."""
        update_data = {'name': 'Updated Name'}
        response = client.put('/api/folders/9999', json=update_data)
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_update_folder_with_empty_name(self, client, db_session):
        """Test that updating folder with empty name fails."""
        # Create folder
        folder = Folder(name='Original Name', type=FolderType.USER)
        db_session.add(folder)
        db_session.commit()
        
        # Update with empty name
        update_data = {'name': '   '}
        response = client.put(f'/api/folders/{folder.id}', json=update_data)
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'empty' in data['message'].lower()
    
    def test_delete_user_folder(self, client, db_session):
        """Test deleting a user folder."""
        # Create folder
        folder = Folder(name='My Folder', type=FolderType.USER)
        db_session.add(folder)
        db_session.commit()
        folder_id = folder.id
        
        # Delete folder
        response = client.delete(f'/api/folders/{folder_id}')
        
        # Verify response
        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        assert data['folderId'] == folder_id
        
        # Verify folder is deleted from database
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        assert folder is None
    
    def test_delete_system_folder_all_flows(self, client, db_session):
        """Test that deleting All Flows system folder fails."""
        # Create system folder
        folder = Folder(name='All Flows', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        folder_id = folder.id
        
        # Attempt to delete
        response = client.delete(f'/api/folders/{folder_id}')
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'system' in data['message'].lower()
        
        # Verify folder still exists
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        assert folder is not None
    
    def test_delete_system_folder_trash(self, client, db_session):
        """Test that deleting Trash system folder fails."""
        # Create system folder
        folder = Folder(name='Trash', type=FolderType.SYSTEM)
        db_session.add(folder)
        db_session.commit()
        folder_id = folder.id
        
        # Attempt to delete
        response = client.delete(f'/api/folders/{folder_id}')
        
        # Verify error response
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'system' in data['message'].lower()
        
        # Verify folder still exists
        folder = db_session.query(Folder).filter_by(id=folder_id).first()
        assert folder is not None
    
    def test_delete_folder_not_found(self, client, db_session):
        """Test deleting a non-existent folder."""
        response = client.delete('/api/folders/9999')
        
        # Verify error response
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
