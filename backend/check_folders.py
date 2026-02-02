
import sys
import os
sys.path.append(os.getcwd())

from app import create_app
from models.folder import Folder, FolderType

app = create_app()

with app.app_context():
    folders = app.db_session.query(Folder).all()
    print(f"Total folders: {len(folders)}")
    for f in folders:
        print(f"ID: {f.id}, Name: '{f.name}', Type: {f.type}")
        
    trash = app.db_session.query(Folder).filter_by(name='Trash', type=FolderType.SYSTEM).first()
    if trash:
        print(f"\n✅ Trash folder found: ID {trash.id}")
    else:
        print("\n❌ Trash folder NOT found matching criteria (name='Trash', type=FolderType.SYSTEM)")
