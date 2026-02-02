"""
Database initialization script.
Creates tables and seeds system folders.

This script initializes the database schema and creates the required system folders:
- "All Flows": Default folder for all projects
- "Trash": Folder for soft-deleted projects

Usage:
    python init_db.py

Requirements:
    - Database server must be running
    - Database credentials must be configured in .env file
    - Database specified in DB_NAME must exist

Validates: Requirements 23.1, 23.2
"""
import sys
from app import create_app
from models import Base, Folder, FolderType
from sqlalchemy.exc import SQLAlchemyError, OperationalError


def init_database():
    """
    Initialize database with tables and system folders.
    
    This function:
    1. Creates all database tables defined in SQLAlchemy models
    2. Seeds the database with required system folders
    3. Validates that system folders were created successfully
    
    Returns:
        bool: True if initialization successful, False otherwise
    
    Raises:
        OperationalError: If database connection fails
        SQLAlchemyError: If database operations fail
    """
    try:
        app = create_app()
        
        with app.app_context():
            print("Initializing database...")
            # Print database info (hide credentials for MySQL)
            db_uri = app.config['SQLALCHEMY_DATABASE_URI']
            if 'sqlite' in db_uri:
                print(f"Database: SQLite ({db_uri.split('///')[-1]})")
            else:
                print(f"Database URI: {db_uri.split('@')[1] if '@' in db_uri else db_uri}")
            
            # Create all tables
            try:
                Base.metadata.create_all(app.db_engine)
                print("✓ Database tables created successfully")
            except OperationalError as e:
                print(f"✗ Failed to create tables: {e}")
                print("  Please ensure:")
                print("  - Database server is running")
                print("  - Database credentials are correct in .env file")
                print("  - Database exists (create it if needed)")
                return False
            
            # Check if system folders already exist
            existing_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).all()
            
            if existing_folders:
                print("✓ System folders already exist:")
                for folder in existing_folders:
                    print(f"  - {folder.name} (id={folder.id}, type={folder.type.value})")
                return True
            
            # Create system folders
            print("Creating system folders...")
            all_flows = Folder(name='All Flows', type=FolderType.SYSTEM)
            trash = Folder(name='Trash', type=FolderType.SYSTEM)
            
            app.db_session.add(all_flows)
            app.db_session.add(trash)
            
            try:
                app.db_session.commit()
                print("✓ System folders created successfully:")
                print(f"  - {all_flows.name} (id={all_flows.id}, type={all_flows.type.value})")
                print(f"  - {trash.name} (id={trash.id}, type={trash.type.value})")
            except SQLAlchemyError as e:
                app.db_session.rollback()
                print(f"✗ Failed to create system folders: {e}")
                return False
            
            # Verify system folders were created
            verify_folders = app.db_session.query(Folder).filter(
                Folder.type == FolderType.SYSTEM
            ).all()
            
            if len(verify_folders) != 2:
                print(f"✗ Warning: Expected 2 system folders, found {len(verify_folders)}")
                return False
            
            print("\n✓ Database initialization completed successfully!")
            return True
            
    except Exception as e:
        print(f"✗ Unexpected error during database initialization: {e}")
        return False


def drop_all_tables():
    """
    Drop all database tables.
    
    WARNING: This will delete all data in the database!
    Use only for development/testing purposes.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        app = create_app()
        
        with app.app_context():
            print("WARNING: This will delete all data in the database!")
            response = input("Are you sure you want to continue? (yes/no): ")
            
            if response.lower() != 'yes':
                print("Operation cancelled.")
                return False
            
            Base.metadata.drop_all(app.db_engine)
            print("✓ All tables dropped successfully")
            return True
            
    except Exception as e:
        print(f"✗ Failed to drop tables: {e}")
        return False


if __name__ == '__main__':
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--drop':
            success = drop_all_tables()
        elif sys.argv[1] == '--reset':
            print("Resetting database...")
            if drop_all_tables():
                success = init_database()
            else:
                success = False
        else:
            print(f"Unknown argument: {sys.argv[1]}")
            print("Usage:")
            print("  python init_db.py          # Initialize database")
            print("  python init_db.py --drop   # Drop all tables")
            print("  python init_db.py --reset  # Drop and recreate tables")
            sys.exit(1)
    else:
        success = init_database()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
