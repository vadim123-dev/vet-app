from backend.services.user_data_service import UserDataService
from flask import jsonify
from backend.models.user import User
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token
)
from werkzeug.security import check_password_hash
from datetime import timedelta

class AuthService:

    user_data_service = UserDataService()

    def login_user(self, req_json: dict):
        user_name = req_json.get("user_name")
        password = req_json.get("password")

        if not user_name or not password:
            return jsonify(error="username and password are required"), 400

        # Query database for user
        user_data = self.user_data_service.get_user(user_name)
        
        if not user_data:
            return jsonify(error="Invalid credentials"), 401

        password_hash = user_data.get("password_hash")
        if not password_hash or not check_password_hash(password_hash, password):
            return jsonify(error="Invalid credentials"), 401
        
        access_token = create_access_token(identity=user_name, expires_delta=timedelta(minutes=15))
        refresh_token = create_refresh_token(identity=user_name, expires_delta=timedelta(days=7))

        return jsonify(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=900
        ), 200

    def refresh_access_token(self, refresh_token: str):
        """Generate new access token from valid refresh token"""
        try:
            decoded = decode_token(refresh_token)
            identity = decoded.get("sub")
            new_access_token = create_access_token(identity=identity, expires_delta=timedelta(minutes=15))
            return jsonify(
                access_token=new_access_token,
                token_type="Bearer",
                expires_in=900
            ), 200
        except Exception as e:
            return jsonify(error="Invalid refresh token"), 401
