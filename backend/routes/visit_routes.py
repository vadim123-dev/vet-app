from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.db import repo

visits_bp = Blueprint("visits", __name__, url_prefix="/visits")


def _engine():
    return current_app.db_engine


def _caller_roles(identity: str) -> list[str]:
    return repo.get_user_roles(_engine(), identity)


@visits_bp.post("/")
@jwt_required()
def create_visit():
    identity = get_jwt_identity()
    roles = _caller_roles(identity)
    if "vet" not in roles and "admin" not in roles:
        return jsonify(error="Forbidden"), 403

    data = request.get_json(silent=True) or {}
    appointment_id = data.get("appointment_id")
    pet_id = data.get("pet_id")
    if not appointment_id or not pet_id:
        return jsonify(error="appointment_id and pet_id are required"), 400

    try:
        visit = repo.create_visit(
            _engine(),
            appointment_id_str=appointment_id,
            pet_id_str=pet_id,
            vet_user_id_str=data.get("vet_user_id"),
            chief_complaint=data.get("chief_complaint"),
            exam_notes=data.get("exam_notes"),
            assessment=data.get("assessment"),
            plan=data.get("plan"),
        )
        if data.get("prescriptions"):
            repo.set_prescriptions(_engine(), visit["id"], data["prescriptions"])
        repo.update_appointment(_engine(), appointment_id, {"status": "completed"})
        return jsonify(repo.get_visit(_engine(), visit["id"])), 201
    except Exception as e:
        return jsonify(error=str(e)), 500


@visits_bp.get("/appointment/<appointment_id>")
@jwt_required()
def get_visit_by_appointment(appointment_id):
    visit = repo.get_visit_by_appointment(_engine(), appointment_id)
    return jsonify(visit if visit else None), 200


@visits_bp.get("/<visit_id>")
@jwt_required()
def get_visit(visit_id):
    visit = repo.get_visit(_engine(), visit_id)
    if not visit:
        return jsonify(error="Visit not found"), 404
    return jsonify(visit), 200


@visits_bp.patch("/<visit_id>")
@jwt_required()
def update_visit(visit_id):
    identity = get_jwt_identity()
    roles = _caller_roles(identity)
    if "vet" not in roles and "admin" not in roles:
        return jsonify(error="Forbidden"), 403

    data = request.get_json(silent=True) or {}
    allowed = {"chief_complaint", "exam_notes", "assessment", "plan"}
    updates = {k: v for k, v in data.items() if k in allowed}
    try:
        if updates:
            repo.update_visit(_engine(), visit_id, updates)
        if "prescriptions" in data:
            repo.set_prescriptions(_engine(), visit_id, data["prescriptions"])
        return jsonify(repo.get_visit(_engine(), visit_id)), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
