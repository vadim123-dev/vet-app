from flask import Blueprint, request, jsonify
from backend.services.auth_service import AuthService
from backend.models import User
from backend.services.user_data_service import UserDataService
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

users_bp = Blueprint("users", __name__, url_prefix="/users")
# Apply CORS to all /users/* routes
# CORS(users_bp, resources={r"/*": {"origins": "http://localhost:5173"}})



auth_service = AuthService()
user_data_service = UserDataService()


@users_bp.route("/authenticate", methods=['POST','OPTIONS'])
def authenticate():
    if request.method == "OPTIONS":
        return "", 204  # ✅ preflight OK
    
    print("METHOD:", request.method)
    print("DATA:", request.data)

    data = request.get_json(silent=True) or {} # silent returns None if not valid json
    return auth_service.login_user(data)


@users_bp.route("/refresh", methods=['POST','OPTIONS'])
def refresh_token():
    if request.method == "OPTIONS":
        return "", 204
    
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token")
    
    if not refresh_token:
        return jsonify(error="refresh_token is required"), 400
    
    return auth_service.refresh_access_token(refresh_token)


@users_bp.get("/current")
@jwt_required()
def get_user_data():
    result = user_data_service.get_user_with_pets(get_jwt_identity())
    if not result:
        return jsonify(error="User not found"), 404
    user = {k: v for k, v in result["user"].items() if k != "password_hash"}
    return jsonify({"user": user, "pets": result.get("pets", [])}), 200

@users_bp.get("/all")
@jwt_required()
def get_all_users_data():
    users = user_data_service.get_all_users()
    return jsonify(users), 200


@users_bp.get("/<user_name>")
@jwt_required()
def get_user_with_pets(user_name):
    result = user_data_service.get_user_with_pets(user_name)
    if not result:
        return jsonify(error="User not found"), 404
    user = {k: v for k, v in result["user"].items() if k != "password_hash"}
    return jsonify({"user": user, "pets": result.get("pets", [])}), 200


@users_bp.post("/add")
@jwt_required()
def add_user():
    data = request.get_json(silent=True) or {}
    try:
        user = user_data_service.add_user(get_jwt_identity(), data)
        return jsonify(user), 201
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 500

