#!/usr/bin/env python
"""
Demo script to show database initialization usage.

This script demonstrates how to use the init_db module
programmatically.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from init_db import init_database
from app import create_app
from models import Folder, FolderType


def demo_init_database():
    """Demonstrate database initialization."""
    print("=" * 60)
    print("Database Initialization Demo")
    print("=" * 60)
    print()
    
    # Initialize database
    print("Step 1: Initialize database")
    print("-" * 60)
    success = init_database()
    
    if not success:
        print("\n❌ Database initialization failed!")
        return False
    
    print()
    print("Step 2: Verify system folders")
    print("-" * 60)
    
    # Verify folders were created
    app = create_app()
    with app.app_context():
        folders = app.db_session.query(Folder).filter(
            Folder.type == FolderType.SYSTEM
        ).all()
        
        print(f"Found {len(folders)} system folders:")
        for folder in folders:
            print(f"  • {folder.name}")
            print(f"    - ID: {folder.id}")
            print(f"    - Type: {folder.type.value}")
            print(f"    - Created: {folder.created_at}")
        
        print()
        print("=" * 60)
        print("✅ Database initialization successful!")
        print("=" * 60)
    
    return True


if __name__ == '__main__':
    success = demo_init_database()
    sys.exit(0 if success else 1)
