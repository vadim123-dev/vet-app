from flask import Blueprint, request, jsonify, current_app
from backend.services.auth_service import AuthService
from backend.services.user_data_service import UserDataService
from backend.db import repo
from flask_jwt_extended import jwt_required, get_jwt_identity

users_bp = Blueprint("users", __name__, url_prefix="/users")

auth_service = AuthService()
user_data_service = UserDataService()


def _engine():
    return current_app.db_engine


def _caller_roles(identity: str) -> list[str]:
    return repo.get_user_roles(_engine(), identity)


@users_bp.route("/authenticate", methods=["POST", "OPTIONS"])
def authenticate():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json(silent=True) or {}
    return auth_service.login_user(data)


@users_bp.route("/refresh", methods=["POST", "OPTIONS"])
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
    identity = get_jwt_identity()
    result = user_data_service.get_user_with_pets(identity)
    if not result:
        return jsonify(error="User not found"), 404
    user = {k: v for k, v in result["user"].items() if k != "password_hash"}
    user["roles"] = repo.get_user_roles(_engine(), identity)
    return jsonify({"user": user, "pets": result.get("pets", [])}), 200


@users_bp.get("/all")
@jwt_required()
def get_all_users_data():
    identity = get_jwt_identity()
    roles = _caller_roles(identity)
    if "admin" in roles:
        users = repo.get_all_users_with_roles(_engine())
    else:
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
    identity = get_jwt_identity()
    roles = _caller_roles(identity)
    if "admin" not in roles:
        return jsonify(error="Forbidden"), 403
    data = request.get_json(silent=True) or {}
    try:
        user = user_data_service.add_user(identity, data)
        return jsonify(user), 201
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 500


@users_bp.patch("/<user_name>/role")
@jwt_required()
def update_user_role(user_name):
    identity = get_jwt_identity()
    roles = _caller_roles(identity)
    if "admin" not in roles:
        return jsonify(error="Forbidden"), 403
    data = request.get_json(silent=True) or {}
    new_role = data.get("role")
    if not new_role:
        return jsonify(error="role is required"), 400
    try:
        repo.update_user_role(_engine(), user_name, new_role)
        return jsonify(ok=True), 200
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 500
