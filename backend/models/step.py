"""
Step model representing a single captured user interaction.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models.base import Base
import enum


class ActionType(enum.Enum):
    """Enum for action types."""
    CLICK = 'click'
    SCROLL = 'scroll'


class Step(Base):
    """
    Step model representing a single captured user interaction.
    
    Attributes:
        id: Primary key
        project_id: Foreign key to project
        order_index: Order of step in the sequence
        action_type: Type of action (click or scroll)
        target_text: Text content of the target element
        script_text: Narration text for TTS
        audio_url: URL to generated audio file
        image_url: URL to screenshot image
        pos_x: X coordinate of the action
        pos_y: Y coordinate of the action
        duration_frames: Duration of step in frames (at 30 FPS)
        project: Relationship to parent project
    """
    __tablename__ = 'steps'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    order_index = Column(Integer, nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    target_text = Column(Text, nullable=True)
    script_text = Column(Text, nullable=False)
    audio_url = Column(String(512), nullable=True)
    image_url = Column(String(512), nullable=False)
    pos_x = Column(Integer, nullable=False)
    pos_y = Column(Integer, nullable=False)
    duration_frames = Column(Integer, nullable=False, default=90)
    
    # Relationships
    project = relationship('Project', back_populates='steps')
    
    def __repr__(self):
        return f"<Step(id={self.id}, project_id={self.project_id}, order_index={self.order_index})>"
    
    def to_dict(self):
        """Convert step to dictionary representation."""
        return {
            'id': self.id,
            'projectId': self.project_id,
            'orderIndex': self.order_index,
            'actionType': self.action_type.value,
            'targetText': self.target_text,
            'scriptText': self.script_text,
            'audioUrl': self.audio_url,
            'imageUrl': self.image_url,
            'posX': self.pos_x,
            'posY': self.pos_y,
            'durationFrames': self.duration_frames
        }
