# repo.py
import uuid
from sqlalchemy import text
from sqlalchemy.engine import Engine
from db.db_config import bin_to_uuid, uuid_to_bin


def get_user_with_pets(engine: Engine, user_name: str) -> dict:
    # This SQL returns: user fields + pet fields + pet type + breed + latest measurement per pet.
    # It uses LEFT JOIN so a user with no pets still returns one user row.
    sql = text("""
        SELECT
            u.id          AS u_id,
            u.user_name   AS u_user_name,
            u.first_name  AS u_first_name,
            u.last_name   AS u_last_name,
            u.gender      AS u_gender,
            u.city        AS u_city,
            u.telephone   AS u_telephone,
            u.created_at  AS u_created_at,
            u.updated_at  AS u_updated_at,
            u.password_hash AS u_password_hash,

            p.id          AS p_id,
            p.name        AS p_name,
            p.birth_date  AS p_birth_date,
            p.birth_date_is_estimated AS p_birth_date_is_estimated,

            pt.code       AS pt_code,
            b.name        AS b_name,

            m.measured_at AS m_measured_at,
            m.weight_kg   AS m_weight_kg,
            m.height_cm   AS m_height_cm
        FROM users u
        LEFT JOIN pets p
            ON p.owner_user_id = u.id
        LEFT JOIN pet_types pt
            ON pt.id = p.pet_type_id
        LEFT JOIN breeds b
            ON b.id = p.breed_id
        LEFT JOIN pet_measurements m
            ON m.id = (
                SELECT m2.id
                FROM pet_measurements m2
                WHERE m2.pet_id = p.id
                ORDER BY m2.measured_at DESC
                LIMIT 1
            )
        WHERE u.user_name = :user_name
        ORDER BY p.created_at DESC
    """)

    # Open a DB connection from the pool; "engine.begin()" also starts a transaction.
    # For reads, it’s fine; it ensures the connection is returned to the pool.
    with engine.begin() as conn:
        rows = conn.execute(sql, {"user_name": user_name}).mappings().all()
        # .mappings() returns dict-like rows instead of tuples (easier for JSON).

    if not rows:
        # No such user_name.
        return {}

    # Build the user object from the first row (all rows have the same user fields).
    first = rows[0]
    user = {
        "id": bin_to_uuid(first["u_id"]),
        "user_name": first["u_user_name"],
        "first_name": first["u_first_name"],
        "last_name": first["u_last_name"],
        "gender": first["u_gender"],
        "city": first["u_city"],
        "telephone": first["u_telephone"],
        "password_hash": first["u_password_hash"],
        "created_at": str(first["u_created_at"]),
        "updated_at": str(first["u_updated_at"]),
    }

    pets = []
    for r in rows:
        # If user has no pets, p_id will be NULL -> skip.
        if r["p_id"] is None:
            continue

        pets.append({
            "id": bin_to_uuid(r["p_id"]),
            "name": r["p_name"],
            "type": r["pt_code"],          # e.g. 'dog'
            "breed": r["b_name"],          # may be None if breed_id is NULL
            "birth_date": str(r["p_birth_date"]) if r["p_birth_date"] else None,
            "birth_date_is_estimated": bool(r["p_birth_date_is_estimated"]),
            "latest_measurement": None if r["m_measured_at"] is None else {
                "measured_at": str(r["m_measured_at"]),
                "weight_kg": float(r["m_weight_kg"]) if r["m_weight_kg"] is not None else None,
                "height_cm": float(r["m_height_cm"]) if r["m_height_cm"] is not None else None,
            }
        })

    return {"user": user, "pets": pets}


def get_all_users(engine: Engine) -> list[dict]:
    """Get all users from database without pets (lightweight query for listing all users)"""
    sql = text("""
        SELECT
            u.id          AS u_id,
            u.user_name   AS u_user_name,
            u.first_name  AS u_first_name,
            u.last_name   AS u_last_name,
            u.gender      AS u_gender,
            u.city        AS u_city,
            u.telephone   AS u_telephone,
            u.password_hash AS u_password_hash,
            u.created_at  AS u_created_at,
            u.updated_at  AS u_updated_at
        FROM users u
        ORDER BY u.created_at DESC
    """)

    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()

    users = []
    for row in rows:
        users.append({
            "id": bin_to_uuid(row["u_id"]),
            "user_name": row["u_user_name"],
            "first_name": row["u_first_name"],
            "last_name": row["u_last_name"],
            "gender": row["u_gender"],
            "city": row["u_city"],
            "telephone": row["u_telephone"],
            "password_hash": row["u_password_hash"],
            "created_at": str(row["u_created_at"]),
            "updated_at": str(row["u_updated_at"]),
        })

    return users


def add_user(engine: Engine, user_name: str, first_name: str, last_name: str, 
             gender: int, city: str, telephone: str, password_hash: str) -> dict:
    """Add a new user to the database"""
    user_id = uuid.uuid4()
    user_id_bin = uuid_to_bin(user_id)

    sql = text("""
        INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash)
        VALUES (:id, :user_name, :first_name, :last_name, :gender, :city, :telephone, :password_hash)
    """)

    try:
        with engine.begin() as conn:
            conn.execute(sql, {
                "id": user_id_bin,
                "user_name": user_name,
                "first_name": first_name,
                "last_name": last_name,
                "gender": gender,
                "city": city,
                "telephone": telephone,
                "password_hash": password_hash,
            })

        return {
            "id": str(user_id),
            "user_name": user_name,
            "first_name": first_name,
            "last_name": last_name,
            "gender": gender,
            "city": city,
            "telephone": telephone,
        }
    except Exception as e:
        # Handle duplicate user_name or other DB errors
        raise Exception(f"Failed to create user: {str(e)}")


def get_pet_by_id(engine: Engine, pet_id_str: str) -> dict:
    # Parse UUID string -> UUID object -> 16 bytes for BINARY(16).
    pet_uuid = uuid.UUID(pet_id_str)
    pet_id_bin = uuid_to_bin(pet_uuid)

    sql = text("""
        SELECT
            p.id AS p_id,
            p.name AS p_name,
            pt.code AS pt_code,
            b.name AS b_name
        FROM pets p
        JOIN pet_types pt ON pt.id = p.pet_type_id
        LEFT JOIN breeds b ON b.id = p.breed_id
        WHERE p.id = :pet_id
    """)

    with engine.begin() as conn:
        row = conn.execute(sql, {"pet_id": pet_id_bin}).mappings().first()

    if not row:
        return {}

    return {
        "id": bin_to_uuid(row["p_id"]),
        "name": row["p_name"],
        "type": row["pt_code"],
        "breed": row["b_name"],
    }
