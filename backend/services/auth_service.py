from backend.services.user_data_service import UserDataService
from flask import jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from werkzeug.security import check_password_hash
from datetime import timedelta
from backend.db import repo


class AuthService:

    user_data_service = UserDataService()

    def login_user(self, req_json: dict):
        user_name = req_json.get("user_name")
        password = req_json.get("password")

        if not user_name or not password:
            return jsonify(error="username and password are required"), 400

        user_data = self.user_data_service.get_user(user_name)
        if not user_data:
            return jsonify(error="Invalid credentials"), 401

        try:
            valid = check_password_hash(user_data.get("password_hash", ""), password)
        except ValueError:
            valid = False
        if not valid:
            return jsonify(error="Invalid credentials"), 401

        engine = current_app.db_engine
        roles = repo.get_user_roles(engine, user_name)

        access_token  = create_access_token(identity=user_name, expires_delta=timedelta(minutes=15))
        refresh_token = create_refresh_token(identity=user_name, expires_delta=timedelta(days=7))

        return jsonify(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=900,
            user={
                "user_name":  user_name,
                "first_name": user_data.get("first_name"),
                "last_name":  user_data.get("last_name"),
                "roles":      roles,
            }
        ), 200

    def refresh_access_token(self, refresh_token: str):
        try:
            decoded = decode_token(refresh_token)
            identity = decoded.get("sub")
            new_access_token = create_access_token(identity=identity, expires_delta=timedelta(minutes=15))
            return jsonify(
                access_token=new_access_token,
                token_type="Bearer",
                expires_in=900
            ), 200
        except Exception:
            return jsonify(error="Invalid refresh token"), 401
