import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///property_management.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

# JWT configuration - MORE SECURE
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
if not app.config["JWT_SECRET_KEY"] and os.environ.get("FLASK_ENV") != "development":
    raise ValueError("JWT_SECRET_KEY must be set in production environment")
elif not app.config["JWT_SECRET_KEY"]:
    app.config["JWT_SECRET_KEY"] = "dev-secret-key-change-in-production"

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)  # Changed from False to 24 hours
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"
app.config["JWT_ERROR_MESSAGE_KEY"] = "error"

# Security headers
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=24)

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db, render_as_batch=True)  # render_as_batch for SQLite ALTER support
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# CORS configuration
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Authorization", "Content-Type"],
            "supports_credentials": True,
        }
    },
)


# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return {"error": "Token has expired", "message": "Please log in again"}, 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return {"error": "Invalid token", "message": str(error)}, 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    return {"error": "Authorization required", "message": str(error)}, 401


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return {"error": "Token has been revoked", "message": "Please log in again"}, 401


# Request logging for debugging
@app.before_request
def log_request_info():
    if app.debug:
        from flask import request
        app.logger.debug(f"Request: {request.method} {request.path}")


@app.after_request
def after_request(response):
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Health check endpoint
@app.route("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}, 200


# Import models and routes after app initialization to avoid circular imports
# This ensures all models are registered with SQLAlchemy
with app.app_context():
    # Import models first to register them
    from models import User, Property, Tenant, RentPayment
    
    # Import routes after models
    import routes
    
    # Create tables if they don't exist (development only)
    if os.environ.get("FLASK_ENV") == "development":
        db.create_all()


if __name__ == "__main__":
    env = os.environ.get("FLASK_ENV", "development")
    debug = env == "development"
    
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5555)),
        debug=debug,
    )