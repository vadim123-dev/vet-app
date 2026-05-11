import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.routes.user_routes import users_bp
from backend.routes.pet_routes import pets_bp
from backend.routes.appointment_routes import appointments_bp
from backend.routes.visit_routes import visits_bp
from backend.routes.shift_routes import shifts_bp
from backend.routes.dashboard_routes import dashboard_bp
from backend.config import Config
from backend.db.db_config import DBConfig, create_db_engine
from dotenv import load_dotenv

jwt = JWTManager()
load_dotenv()
# AnimalDataService()

# Global database engine - accessible via app.db_engine
db_engine = None

def _create_app():
    global db_engine
    
    app = Flask(__name__)
    app.config.from_object(Config)

    jwt.init_app(app) #TODO: what is done here?

    # Initialize database connection pool
    cfg = DBConfig.from_env()
    db_engine = create_db_engine(cfg)
    app.db_engine = db_engine

    app.register_blueprint(users_bp)
    app.register_blueprint(pets_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(visits_bp)
    app.register_blueprint(shifts_bp)
    app.register_blueprint(dashboard_bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    origins_env = os.getenv("CORS_ORIGINS", "")
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
    CORS(
        app,
        origins=allowed_origins,
        methods=["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    return app

app = _create_app()

def get_db_engine():
    """Helper function to get the global database engine"""
    return db_engine

if __name__ == "__main__":
    app.run()
