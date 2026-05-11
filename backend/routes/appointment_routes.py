from datetime import date
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from backend.db.repo import (
    get_appointments_for_day, get_clinic_resources,
    create_appointment, update_appointment,
    check_appointment_conflicts, get_current_hospitalizations,
    get_active_reminders,
)

appointments_bp = Blueprint("appointments", __name__, url_prefix="/appointments")


@appointments_bp.get("/resources")
@jwt_required()
def clinic_resources():
    return jsonify(get_clinic_resources(current_app.db_engine)), 200


@appointments_bp.get("/")
@jwt_required()
def list_appointments():
    date_str = request.args.get("date", date.today().isoformat())
    return jsonify(get_appointments_for_day(current_app.db_engine, date_str)), 200


@appointments_bp.post("/")
@jwt_required()
def book_appointment():
    body = request.get_json(silent=True) or {}

    pet_id         = body.get("pet_id")
    appointment_dt = body.get("appointment_date")   # "YYYY-MM-DD HH:MM:00"
    procedure_type = body.get("procedure_type", "wellness")
    duration_mins  = int(body.get("duration_mins", 30))
    vet_user_id    = body.get("vet_user_id") or None
    room_id        = body.get("room_id")     or None

    if not pet_id or not appointment_dt:
        return jsonify(error="pet_id and appointment_date are required"), 400

    # ── Overlap check (skipped for emergencies) ────────────────────────────────
    if procedure_type != "emergency":
        conflicts = check_appointment_conflicts(
            engine          = current_app.db_engine,
            start_dt_str    = appointment_dt,
            duration_mins   = duration_mins,
            vet_user_id_str = vet_user_id,
            room_id         = int(room_id) if room_id else None,
        )
        if conflicts:
            return jsonify(error="conflict", conflicts=conflicts), 409

    try:
        result = create_appointment(
            engine            = current_app.db_engine,
            pet_id_str        = pet_id,
            vet_user_id_str   = vet_user_id,
            room_id           = int(room_id) if room_id else None,
            appointment_dt_str= appointment_dt,
            procedure_type    = procedure_type,
            duration_mins     = duration_mins,
            notes             = body.get("notes") or None,
        )
        return jsonify(result), 201
    except ValueError as e:
        return jsonify(error=str(e)), 404
    except Exception as e:
        return jsonify(error=f"Could not create appointment: {e}"), 500


@appointments_bp.patch("/<appt_id>")
@jwt_required()
def patch_appointment(appt_id):
    body = request.get_json(silent=True) or {}

    # ── Status-only shortcuts (cancel / check-in) ──────────────────────────────
    if body.get("status") in ("cancelled", "waiting"):
        try:
            update_appointment(current_app.db_engine, appt_id, {"status": body["status"]})
            return jsonify(ok=True), 200
        except Exception as e:
            return jsonify(error=str(e)), 500

    # ── Reschedule ─────────────────────────────────────────────────────────────
    appointment_dt = body.get("appointment_date")
    duration_mins  = int(body.get("duration_mins", 30))
    vet_user_id    = body.get("vet_user_id") or None
    room_id        = body.get("room_id")     or None

    if appointment_dt:
        conflicts = check_appointment_conflicts(
            engine          = current_app.db_engine,
            start_dt_str    = appointment_dt,
            duration_mins   = duration_mins,
            vet_user_id_str = vet_user_id,
            room_id         = int(room_id) if room_id else None,
            exclude_id_str  = appt_id,
        )
        if conflicts:
            return jsonify(error="conflict", conflicts=conflicts), 409

    updates = {}
    for field in ("appointment_date", "vet_user_id", "room_id",
                  "procedure_type", "duration_mins", "notes"):
        if field in body:
            updates[field] = body[field] if body[field] != "" else None

    try:
        update_appointment(current_app.db_engine, appt_id, updates)
        return jsonify(ok=True), 200
    except ValueError as e:
        return jsonify(error=str(e)), 404
    except Exception as e:
        return jsonify(error=f"Could not update appointment: {e}"), 500


@appointments_bp.get("/hospitalizations")
@jwt_required()
def current_hospitalizations():
    return jsonify(get_current_hospitalizations(current_app.db_engine)), 200


@appointments_bp.get("/reminders")
@jwt_required()
def active_reminders():
    return jsonify(get_active_reminders(current_app.db_engine)), 200
