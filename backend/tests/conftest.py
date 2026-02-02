import pytest
from app import create_app
from models import Base, Folder, FolderType


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app('testing')
    
    # Create all tables for testing
    with app.app_context():
        Base.metadata.create_all(app.db_engine)
        
        # Seed system folders
        all_flows = Folder(name='All Flows', type=FolderType.SYSTEM)
        trash = Folder(name='Trash', type=FolderType.SYSTEM)
        app.db_session.add(all_flows)
        app.db_session.add(trash)
        app.db_session.commit()
    
    yield app
    
    # Drop all tables after testing
    with app.app_context():
        Base.metadata.drop_all(app.db_engine)


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        session = app.db_session
        yield session
        # Rollback any uncommitted changes
        session.rollback()
        session.remove()
