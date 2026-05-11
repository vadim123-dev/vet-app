from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.db import repo

shifts_bp = Blueprint("shifts", __name__, url_prefix="/shifts")


def _engine():
    return current_app.db_engine


@shifts_bp.get("/today")
@jwt_required()
def todays_shifts():
    return jsonify(repo.get_todays_shift_checkins(_engine())), 200


@shifts_bp.get("/my-status")
@jwt_required()
def my_status():
    status = repo.get_my_shift_status(_engine(), get_jwt_identity())
    return jsonify(status), 200


@shifts_bp.post("/checkin")
@jwt_required()
def checkin():
    try:
        result = repo.shift_checkin(_engine(), get_jwt_identity())
        return jsonify(result), 201
    except ValueError as e:
        return jsonify(error=str(e)), 400


@shifts_bp.post("/checkout")
@jwt_required()
def checkout():
    updated = repo.shift_checkout(_engine(), get_jwt_identity())
    return jsonify(ok=updated), 200
