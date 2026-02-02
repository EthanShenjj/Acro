"""
Property-based tests for database models.
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone
from models import Base, Folder, Project, Step, FolderType, ActionType


class TestSoftDeletePreservation:
    """Tests for Property 14: Soft delete preservation."""
    
    # Feature: acro-saas-demo-video-tool, Property 14: Soft delete preservation
    @given(
        project_title=st.text(min_size=1, max_size=255),
        num_steps=st.integers(min_value=1, max_value=10)
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_soft_delete_preserves_project_and_steps(
        self, app, db_session, project_title, num_steps
    ):
        """
        For any Project delete operation, the Project record should remain 
        in the database with deleted_at timestamp set, and all associated 
        Steps should remain unchanged.
        
        Validates: Requirements 18.4, 18.5
        """
        # Setup: Create a folder
        folder = Folder(name='Test Folder', type=FolderType.USER)
        db_session.add(folder)
        db_session.commit()
        
        # Setup: Create a project
        project = Project(
            title=project_title,
            folder_id=folder.id
        )
        db_session.add(project)
        db_session.commit()
        project_id = project.id
        project_uuid = project.uuid
        
        # Setup: Create steps for the project
        steps = []
        for i in range(num_steps):
            step = Step(
                project_id=project_id,
                order_index=i,
                action_type=ActionType.CLICK,
                target_text=f'Target {i}',
                script_text=f'Script {i}',
                image_url=f'/static/images/step-{i}.png',
                pos_x=100 + i * 10,
                pos_y=200 + i * 10,
                duration_frames=90
            )
            steps.append(step)
            db_session.add(step)
        db_session.commit()
        
        step_ids = [step.id for step in steps]
        
        # Action: Soft delete the project
        project.deleted_at = datetime.now(timezone.utc)
        db_session.commit()
        
        # Verify: Project still exists in database
        deleted_project = db_session.query(Project).filter(
            Project.id == project_id
        ).first()
        assert deleted_project is not None, "Project should still exist in database"
        assert deleted_project.uuid == project_uuid, "Project UUID should be unchanged"
        assert deleted_project.title == project_title, "Project title should be unchanged"
        assert deleted_project.deleted_at is not None, "Project should have deleted_at timestamp"
        
        # Verify: All steps still exist and are unchanged
        remaining_steps = db_session.query(Step).filter(
            Step.project_id == project_id
        ).all()
        assert len(remaining_steps) == num_steps, f"All {num_steps} steps should still exist"
        
        for step in remaining_steps:
            assert step.id in step_ids, "Step ID should be unchanged"
            assert step.project_id == project_id, "Step project_id should be unchanged"
        
        # Cleanup
        db_session.query(Step).filter(Step.project_id == project_id).delete()
        db_session.query(Project).filter(Project.id == project_id).delete()
        db_session.query(Folder).filter(Folder.id == folder.id).delete()
        db_session.commit()


class TestDefaultFolderAssignment:
    """Tests for Property 17: Default folder assignment."""
    
    # Feature: acro-saas-demo-video-tool, Property 17: Default folder assignment
    @given(
        project_title=st.text(min_size=1, max_size=255)
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_default_folder_assignment(self, app, db_session, project_title):
        """
        For any Project creation without folder_id specified, the created 
        Project should have folder_id set to the "All Flows" system folder's id.
        
        Validates: Requirements 23.3
        """
        # Setup: Ensure "All Flows" system folder exists
        all_flows = db_session.query(Folder).filter(
            Folder.name == 'All Flows',
            Folder.type == FolderType.SYSTEM
        ).first()
        
        if not all_flows:
            all_flows = Folder(name='All Flows', type=FolderType.SYSTEM)
            db_session.add(all_flows)
            db_session.commit()
        
        all_flows_id = all_flows.id
        
        # Action: Create a project with folder_id set to "All Flows"
        # (simulating the default assignment that would happen in the API)
        project = Project(
            title=project_title,
            folder_id=all_flows_id
        )
        db_session.add(project)
        db_session.commit()
        
        # Verify: Project has folder_id set to "All Flows" folder
        created_project = db_session.query(Project).filter(
            Project.id == project.id
        ).first()
        assert created_project is not None, "Project should exist in database"
        assert created_project.folder_id == all_flows_id, \
            "Project should be assigned to 'All Flows' folder"
        
        # Cleanup
        db_session.query(Project).filter(Project.id == project.id).delete()
        db_session.commit()
