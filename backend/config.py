import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class."""
    
    # Flask configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Database configuration
    USE_SQLITE = os.getenv('USE_SQLITE', 'False').lower() == 'true'
    
    if USE_SQLITE:
        # Use SQLite for development
        DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'acro.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{DB_PATH}"
    else:
        # Use MySQL for production
        DB_HOST = os.getenv('DB_HOST', 'localhost')
        DB_PORT = int(os.getenv('DB_PORT', 3306))
        DB_USER = os.getenv('DB_USER', 'root')
        DB_PASSWORD = os.getenv('DB_PASSWORD', '')
        DB_NAME = os.getenv('DB_NAME', 'acro_db')
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG
    
    # Storage configuration
    STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    IMAGES_FOLDER = os.path.join(STATIC_FOLDER, 'images')
    AUDIO_FOLDER = os.path.join(STATIC_FOLDER, 'audio')
    THUMBNAILS_FOLDER = os.path.join(STATIC_FOLDER, 'thumbnails')
    
    # File upload configuration
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max file size
    
    # TTS configuration
    TTS_LANGUAGE = os.getenv('TTS_LANGUAGE', 'en')
    VIDEO_FPS = 30  # Frames per second for video composition
    
    # CORS configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
