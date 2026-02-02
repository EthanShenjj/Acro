import os
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from config import config


def create_app(config_name=None):
    """
    Application factory function.
    
    Args:
        config_name: Configuration name ('development', 'production', 'testing')
    
    Returns:
        Flask application instance
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Create static directories if they don't exist
    os.makedirs(app.config['IMAGES_FOLDER'], exist_ok=True)
    os.makedirs(app.config['AUDIO_FOLDER'], exist_ok=True)
    os.makedirs(app.config['THUMBNAILS_FOLDER'], exist_ok=True)
    
    # Initialize database engine
    engine = create_engine(
        app.config['SQLALCHEMY_DATABASE_URI'],
        echo=app.config['SQLALCHEMY_ECHO'],
        pool_pre_ping=True,
        pool_recycle=3600
    )
    
    # Create scoped session
    session_factory = sessionmaker(bind=engine)
    db_session = scoped_session(session_factory)
    
    # Store db_session in app context
    app.db_session = db_session
    app.db_engine = engine
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    from routes.recording import recording_bp
    from routes.projects import projects_bp
    from routes.folders import folders_bp
    from routes.steps import steps_bp
    app.register_blueprint(recording_bp, url_prefix='/api/recording')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(folders_bp, url_prefix='/api/folders')
    app.register_blueprint(steps_bp, url_prefix='/api/steps')
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'acro-backend'}), 200
    
    # Serve static files
    @app.route('/static/<path:folder>/<path:filename>')
    def serve_static(folder, filename):
        """Serve static files (images, audio, thumbnails)."""
        from flask import send_from_directory
        import mimetypes
        
        # Map folder to directory
        folder_map = {
            'images': app.config['IMAGES_FOLDER'],
            'audio': app.config['AUDIO_FOLDER'],
            'thumbnails': app.config['THUMBNAILS_FOLDER']
        }
        
        if folder not in folder_map:
            return jsonify({'error': 'Not Found', 'message': 'Invalid folder'}), 404
        
        directory = folder_map[folder]
        
        # Set correct MIME type
        mimetype, _ = mimetypes.guess_type(filename)
        if mimetype is None:
            if filename.endswith('.png'):
                mimetype = 'image/png'
            elif filename.endswith('.mp3'):
                mimetype = 'audio/mpeg'
        
        return send_from_directory(directory, filename, mimetype=mimetype)
    
    # Teardown database session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
    
    return app


def register_error_handlers(app):
    """Register error handlers for the application."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request'
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        return jsonify({
            'error': 'Service Unavailable',
            'message': str(error.description) if hasattr(error, 'description') else 'Service temporarily unavailable'
        }), 503


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
