from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.db import repo

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


def _engine():
    return current_app.db_engine


@dashboard_bp.get("/layout")
@jwt_required()
def get_layout():
    order = repo.get_dashboard_layout(_engine(), get_jwt_identity())
    return jsonify({"widget_order": order}), 200


@dashboard_bp.put("/layout")
@jwt_required()
def save_layout():
    body = request.get_json(silent=True) or {}
    widget_order = body.get("widget_order")
    if not isinstance(widget_order, list):
        return jsonify(error="widget_order must be an array"), 400
    try:
        repo.save_dashboard_layout(_engine(), get_jwt_identity(), widget_order)
        return jsonify(ok=True), 200
    except ValueError as e:
        return jsonify(error=str(e)), 400
