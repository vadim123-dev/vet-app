from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from backend.db.repo import get_all_pets, get_pet_detail, add_pet

pets_bp = Blueprint("pets", __name__, url_prefix="/pets")


@pets_bp.get("/all")
@jwt_required()
def list_all_pets():
    return jsonify(get_all_pets(current_app.db_engine)), 200


@pets_bp.post("/add")
@jwt_required()
def create_pet():
    data = request.get_json(silent=True) or {}
    owner_user_name = data.get("owner_user_name")
    name            = data.get("name")
    pet_type_code   = data.get("pet_type_code")
    if not all([owner_user_name, name, pet_type_code]):
        return jsonify(error="owner_user_name, name, and pet_type_code are required"), 400
    try:
        pet = add_pet(
            current_app.db_engine,
            owner_user_name=owner_user_name,
            name=name,
            pet_type_code=pet_type_code,
            breed_id=data.get("breed_id"),
            birth_date=data.get("birth_date") or None,
            birth_date_is_estimated=bool(data.get("birth_date_is_estimated", False)),
        )
        return jsonify(pet), 201
    except ValueError as e:
        return jsonify(error=str(e)), 404
    except Exception as e:
        return jsonify(error=str(e)), 500


@pets_bp.get("/<pet_id>")
@jwt_required()
def pet_detail(pet_id):
    try:
        detail = get_pet_detail(current_app.db_engine, pet_id)
    except ValueError:
        return jsonify(error="Invalid pet ID"), 400
    if not detail:
        return jsonify(error="Pet not found"), 404
    return jsonify(detail), 200
