from werkzeug.security import generate_password_hash
from flask import current_app
from backend.utils import auth_utils
from backend.db.repo import get_user_with_pets, get_all_users, add_user_with_role as repo_add_user


class UserDataService:
    """Service for user data operations - queries the database instead of using in-memory storage"""

    def _get_engine(self):
        """Get the database engine from Flask app context"""
        return current_app.db_engine

    def get_all_users(self) -> list:
        """Get all users from database"""
        engine = self._get_engine()
        users_data = get_all_users(engine)
        
        # Convert to User objects if needed for consistency
        return users_data

    def get_user(self, user_name: str) -> dict:
        """Get a specific user with their pets from database"""
        engine = self._get_engine()
        result = get_user_with_pets(engine, user_name)
        
        if not result or "user" not in result:
            return None
        
        return result["user"]
    
    def get_user_with_pets(self, user_name: str) -> dict:
        """Get user with all their pets from database"""
        engine = self._get_engine()
        return get_user_with_pets(engine, user_name)
    
    def add_user(self, user_requester, req_json) -> dict:
        """Add a new user to the database (admin only)."""
        engine = self._get_engine()

        user_name  = req_json.get("user_name")
        last_name  = req_json.get("last_name")
        first_name = req_json.get("first_name")
        gender     = req_json.get("gender")
        city       = req_json.get("city")
        telephone  = req_json.get("telephone")
        role       = req_json.get("role", "customer")

        if not all([user_name, last_name, first_name, gender, city, telephone]):
            raise ValueError("Missing required user fields")

        temp_password = auth_utils.generate_strong_password(8)
        password_hash = generate_password_hash(temp_password)

        new_user = repo_add_user(
            engine,
            user_name=user_name,
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            city=city,
            telephone=telephone,
            password_hash=password_hash,
            role_code=role,
        )

        new_user["temporary_password"] = temp_password
        new_user["role"] = role
        return new_user
