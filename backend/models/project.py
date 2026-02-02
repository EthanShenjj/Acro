"""
Project model representing a demo video project.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
import uuid


class Project(Base):
    """
    Project model representing a demo video project.
    
    Attributes:
        id: Primary key
        uuid: Unique identifier for external references
        title: Project title
        folder_id: Foreign key to folder
        thumbnail_url: URL to project thumbnail image
        created_at: Timestamp when project was created
        deleted_at: Timestamp when project was soft deleted (null if not deleted)
        folder: Relationship to parent folder
        steps: Relationship to project steps
    """
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    thumbnail_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    folder = relationship('Folder', back_populates='projects')
    steps = relationship('Step', back_populates='project', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Project(id={self.id}, uuid='{self.uuid}', title='{self.title}')>"
    
    def to_dict(self, include_steps=False):
        """
        Convert project to dictionary representation.
        
        Args:
            include_steps: Whether to include steps in the output
        
        Returns:
            Dictionary representation of the project
        """
        result = {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'folderId': self.folder_id,
            'thumbnailUrl': self.thumbnail_url,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'deletedAt': self.deleted_at.isoformat() if self.deleted_at else None
        }
        
        if include_steps:
            result['steps'] = [step.to_dict() for step in self.steps.order_by('order_index')]
        
        return result
