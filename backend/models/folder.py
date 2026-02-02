"""
Folder model for organizing projects.
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
import enum


class FolderType(enum.Enum):
    """Enum for folder types."""
    SYSTEM = 'system'
    USER = 'user'


class Folder(Base):
    """
    Folder model for organizing projects.
    
    Attributes:
        id: Primary key
        name: Folder name
        type: Folder type (system or user)
        created_at: Timestamp when folder was created
        projects: Relationship to projects in this folder
    """
    __tablename__ = 'folders'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    type = Column(Enum(FolderType), nullable=False, default=FolderType.USER)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    projects = relationship('Project', back_populates='folder', lazy='dynamic')
    
    def __repr__(self):
        return f"<Folder(id={self.id}, name='{self.name}', type='{self.type.value}')>"
    
    def to_dict(self):
        """Convert folder to dictionary representation."""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type.value,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
