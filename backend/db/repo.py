# repo.py
import uuid
from sqlalchemy import text
from sqlalchemy.engine import Engine
from backend.db.db_config import bin_to_uuid, uuid_to_bin


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
    # For reads, it's fine; it ensures the connection is returned to the pool.
    with engine.begin() as conn:
        rows = conn.execute(sql, {"user_name": user_name}).mappings().all()
        # .mappings() returns dict-like rows instead of tuples (easier for JSON).

    if not rows:
        # No such user_name.
        return {}

    # Build the user object from the first row (all rows have the same user fields).
    first = rows[0]
    user = {
        "id":            bin_to_uuid(first["u_id"]),
        "user_name":     first["u_user_name"],
        "first_name":    first["u_first_name"],
        "last_name":     first["u_last_name"],
        "gender":        first["u_gender"],
        "city":          first["u_city"],
        "telephone":     first["u_telephone"],
        "password_hash": first["u_password_hash"],  # kept for internal auth use only
        "created_at":    str(first["u_created_at"]),
        "updated_at":    str(first["u_updated_at"]),
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
    """Get all customer users with pet count and last completed appointment date."""
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
            COUNT(DISTINCT p.id)                                        AS pet_count,
            MAX(CASE WHEN va.status = 'completed' THEN va.appointment_date END) AS last_appointment
        FROM users u
        JOIN user_role_assignments ura ON ura.user_id = u.id
        JOIN user_roles ur            ON ur.id = ura.role_id AND ur.code = 'customer'
        LEFT JOIN pets p              ON p.owner_user_id = u.id
        LEFT JOIN vet_appointments va ON va.owner_user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """)

    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()

    users = []
    for row in rows:
        users.append({
            "id":               bin_to_uuid(row["u_id"]),
            "user_name":        row["u_user_name"],
            "first_name":       row["u_first_name"],
            "last_name":        row["u_last_name"],
            "gender":           row["u_gender"],
            "city":             row["u_city"],
            "telephone":        row["u_telephone"],
            "created_at":       str(row["u_created_at"]),
            "pet_count":        int(row["pet_count"]),
            "last_appointment": str(row["last_appointment"]) if row["last_appointment"] else None,
        })

    return users


def add_user(engine: Engine, user_name: str, first_name: str, last_name: str,
             gender: int, city: str, telephone: str, password_hash: str) -> dict:
    """Add a new user to the database and assign the customer role."""
    user_id = uuid.uuid4()
    user_id_bin = uuid_to_bin(user_id)

    insert_user_sql = text("""
        INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash)
        VALUES (:id, :user_name, :first_name, :last_name, :gender, :city, :telephone, :password_hash)
    """)
    role_id_sql = text("SELECT id FROM user_roles WHERE code = 'customer' LIMIT 1")
    assign_role_sql = text("""
        INSERT INTO user_role_assignments (user_id, role_id) VALUES (:user_id, :role_id)
    """)

    try:
        with engine.begin() as conn:
            conn.execute(insert_user_sql, {
                "id": user_id_bin,
                "user_name": user_name,
                "first_name": first_name,
                "last_name": last_name,
                "gender": gender,
                "city": city,
                "telephone": telephone,
                "password_hash": password_hash,
            })
            role_row = conn.execute(role_id_sql).mappings().first()
            if role_row:
                conn.execute(assign_role_sql, {"user_id": user_id_bin, "role_id": role_row["id"]})

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
        raise Exception(f"Failed to create user: {str(e)}")


def add_pet(engine: Engine, owner_user_name: str, name: str, pet_type_code: str,
            breed_id: int = None, birth_date: str = None,
            birth_date_is_estimated: bool = False) -> dict:
    """Add a new pet and link it to an existing owner."""
    owner_sql   = text("SELECT id FROM users WHERE user_name = :user_name")
    type_sql    = text("SELECT id FROM pet_types WHERE code = :code")
    insert_sql  = text("""
        INSERT INTO pets (id, owner_user_id, name, pet_type_id, breed_id, birth_date, birth_date_is_estimated)
        VALUES (:id, :owner_user_id, :name, :pet_type_id, :breed_id, :birth_date, :birth_date_is_estimated)
    """)

    pet_id = uuid.uuid4()
    pet_id_bin = uuid_to_bin(pet_id)

    try:
        with engine.begin() as conn:
            owner_row = conn.execute(owner_sql, {"user_name": owner_user_name}).mappings().first()
            if not owner_row:
                raise ValueError(f"Owner '{owner_user_name}' not found")
            type_row = conn.execute(type_sql, {"code": pet_type_code}).mappings().first()
            if not type_row:
                raise ValueError(f"Pet type '{pet_type_code}' not found")
            conn.execute(insert_sql, {
                "id":                      pet_id_bin,
                "owner_user_id":           owner_row["id"],
                "name":                    name,
                "pet_type_id":             type_row["id"],
                "breed_id":                breed_id,
                "birth_date":              birth_date,
                "birth_date_is_estimated": birth_date_is_estimated,
            })
        return {
            "id":                      str(pet_id),
            "name":                    name,
            "owner_user_name":         owner_user_name,
            "type_code":               pet_type_code,
            "breed_id":                breed_id,
            "birth_date":              birth_date,
            "birth_date_is_estimated": birth_date_is_estimated,
        }
    except ValueError:
        raise
    except Exception as e:
        raise Exception(f"Failed to create pet: {str(e)}")


def get_all_pets(engine: Engine) -> list[dict]:
    """All pets with owner, latest measurement, last completed visit, next scheduled appointment."""
    sql = text("""
        SELECT
            p.id          AS p_id,
            p.name        AS p_name,
            p.birth_date  AS p_birth_date,
            p.birth_date_is_estimated AS p_birth_date_is_estimated,
            pt.code       AS pt_code,
            pt.name       AS pt_name,
            b.name        AS b_name,
            u.user_name   AS u_user_name,
            u.first_name  AS u_first_name,
            u.last_name   AS u_last_name,
            m.measured_at           AS m_measured_at,
            m.weight_kg             AS m_weight_kg,
            m.height_cm             AS m_height_cm,
            m.temperature_celsius   AS m_temperature_celsius,
            MAX(CASE WHEN va.status = 'completed'
                     THEN va.appointment_date END)                          AS last_appointment,
            MIN(CASE WHEN va.status = 'scheduled'
                      AND va.appointment_date > NOW()
                     THEN va.appointment_date END)                          AS next_appointment
        FROM pets p
        JOIN pet_types pt ON pt.id = p.pet_type_id
        LEFT JOIN breeds b ON b.id = p.breed_id
        JOIN users u ON u.id = p.owner_user_id
        LEFT JOIN (
            SELECT m.pet_id, m.measured_at, m.weight_kg, m.height_cm, m.temperature_celsius
            FROM pet_measurements m
            INNER JOIN (
                SELECT pet_id, MAX(measured_at) AS latest_at
                FROM pet_measurements
                GROUP BY pet_id
            ) lm ON lm.pet_id = m.pet_id AND lm.latest_at = m.measured_at
        ) m ON m.pet_id = p.id
        LEFT JOIN vet_appointments va ON va.pet_id = p.id
        GROUP BY
            p.id, p.name, p.birth_date, p.birth_date_is_estimated,
            pt.code, pt.name, b.name,
            u.user_name, u.first_name, u.last_name,
            m.measured_at, m.weight_kg, m.height_cm, m.temperature_celsius
        ORDER BY p.name ASC
    """)

    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()

    pets = []
    for r in rows:
        pets.append({
            "id":                      bin_to_uuid(r["p_id"]),
            "name":                    r["p_name"],
            "birth_date":              str(r["p_birth_date"]) if r["p_birth_date"] else None,
            "birth_date_is_estimated": bool(r["p_birth_date_is_estimated"]),
            "type_code":               r["pt_code"],
            "type_name":               r["pt_name"],
            "breed":                   r["b_name"],
            "owner_user_name":         r["u_user_name"],
            "owner_first_name":        r["u_first_name"],
            "owner_last_name":         r["u_last_name"],
            "latest_measurement": None if r["m_measured_at"] is None else {
                "measured_at":        str(r["m_measured_at"]),
                "weight_kg":          float(r["m_weight_kg"])           if r["m_weight_kg"]           is not None else None,
                "height_cm":          float(r["m_height_cm"])           if r["m_height_cm"]           is not None else None,
                "temperature_celsius": float(r["m_temperature_celsius"]) if r["m_temperature_celsius"] is not None else None,
            },
            "last_appointment": str(r["last_appointment"]) if r["last_appointment"] else None,
            "next_appointment": str(r["next_appointment"]) if r["next_appointment"] else None,
        })

    return pets


def get_pet_detail(engine: Engine, pet_id_str: str) -> dict:
    """Full pet profile: info + owner + all measurements + all appointments."""
    pet_id_bin = uuid_to_bin(uuid.UUID(pet_id_str))

    pet_sql = text("""
        SELECT
            p.id, p.name, p.birth_date, p.birth_date_is_estimated,
            pt.code AS type_code, pt.name AS type_name,
            b.name  AS breed,
            u.user_name  AS owner_user_name,
            u.first_name AS owner_first_name,
            u.last_name  AS owner_last_name,
            u.telephone  AS owner_telephone,
            u.city       AS owner_city,
            u.created_at AS owner_created_at
        FROM pets p
        JOIN  pet_types pt ON pt.id = p.pet_type_id
        LEFT JOIN breeds b ON b.id  = p.breed_id
        JOIN  users u      ON u.id  = p.owner_user_id
        WHERE p.id = :pet_id
    """)

    meas_sql = text("""
        SELECT measured_at, weight_kg, height_cm, temperature_celsius, notes
        FROM   pet_measurements
        WHERE  pet_id = :pet_id
        ORDER  BY measured_at DESC
        LIMIT  20
    """)

    appt_sql = text("""
        SELECT
            va.id, va.appointment_date, va.status, va.notes, va.summary,
            u.first_name AS vet_first, u.last_name AS vet_last
        FROM   vet_appointments va
        LEFT JOIN users u ON u.id = va.vet_user_id
        WHERE  va.pet_id = :pet_id
        ORDER  BY va.appointment_date DESC
    """)

    with engine.begin() as conn:
        row  = conn.execute(pet_sql,  {"pet_id": pet_id_bin}).mappings().first()
        if not row:
            return {}
        meas = conn.execute(meas_sql, {"pet_id": pet_id_bin}).mappings().all()
        apts = conn.execute(appt_sql, {"pet_id": pet_id_bin}).mappings().all()

    return {
        "id":   bin_to_uuid(row["id"]),
        "name": row["name"],
        "birth_date":              str(row["birth_date"]) if row["birth_date"] else None,
        "birth_date_is_estimated": bool(row["birth_date_is_estimated"]),
        "type_code": row["type_code"],
        "type_name": row["type_name"],
        "breed":     row["breed"],
        "owner": {
            "user_name":  row["owner_user_name"],
            "first_name": row["owner_first_name"],
            "last_name":  row["owner_last_name"],
            "telephone":  row["owner_telephone"],
            "city":       row["owner_city"],
        },
        "measurements": [
            {
                "measured_at":         str(m["measured_at"]),
                "weight_kg":           float(m["weight_kg"])           if m["weight_kg"]           is not None else None,
                "height_cm":           float(m["height_cm"])           if m["height_cm"]           is not None else None,
                "temperature_celsius": float(m["temperature_celsius"]) if m["temperature_celsius"] is not None else None,
                "notes": m["notes"],
            }
            for m in meas
        ],
        "appointments": [
            {
                "id":               bin_to_uuid(a["id"]),
                "appointment_date": str(a["appointment_date"]),
                "status":           a["status"],
                "notes":            a["notes"],
                "summary":          a["summary"],
                "vet_name":         f"Dr. {a['vet_first']} {a['vet_last']}" if a["vet_first"] else None,
            }
            for a in apts
        ],
    }


def check_appointment_conflicts(
    engine: Engine,
    start_dt_str: str,
    duration_mins: int,
    vet_user_id_str: str | None,
    room_id: int | None,
    exclude_id_str: str | None = None,
) -> list[dict]:
    """Return any scheduled appointments that overlap the requested slot for the same vet or room."""
    if not vet_user_id_str and not room_id:
        return []

    vet_id_bin  = uuid_to_bin(uuid.UUID(vet_user_id_str)) if vet_user_id_str else None
    exclude_bin = uuid_to_bin(uuid.UUID(exclude_id_str))  if exclude_id_str   else None

    exclude_clause = "AND va.id != :exclude_id" if exclude_bin else ""

    sql = text(f"""
        SELECT
            va.id,
            p.name              AS pet_name,
            va.appointment_date,
            va.duration_mins,
            u.first_name        AS vet_first,
            u.last_name         AS vet_last,
            cr.name             AS room_name,
            CASE
                WHEN :vet_id IS NOT NULL AND va.vet_user_id = :vet_id THEN 'vet'
                ELSE 'room'
            END                 AS conflict_on
        FROM vet_appointments va
        JOIN  pets p          ON p.id  = va.pet_id
        LEFT JOIN users u     ON u.id  = va.vet_user_id
        LEFT JOIN clinic_rooms cr ON cr.id = va.room_id
        WHERE va.status != 'cancelled'
          {exclude_clause}
          AND (
                (:vet_id  IS NOT NULL AND va.vet_user_id = :vet_id)
             OR (:room_id IS NOT NULL AND va.room_id     = :room_id)
          )
          AND va.appointment_date < DATE_ADD(:start_time, INTERVAL :duration MINUTE)
          AND DATE_ADD(va.appointment_date, INTERVAL va.duration_mins MINUTE) > :start_time
    """)

    params = {
        "vet_id":     vet_id_bin,
        "room_id":    room_id,
        "start_time": start_dt_str,
        "duration":   duration_mins,
    }
    if exclude_bin:
        params["exclude_id"] = exclude_bin

    with engine.begin() as conn:
        rows = conn.execute(sql, params).mappings().all()

    return [
        {
            "pet_name":         r["pet_name"],
            "appointment_date": str(r["appointment_date"]),
            "duration_mins":    r["duration_mins"],
            "vet_name":         f"Dr. {r['vet_first']} {r['vet_last']}" if r["vet_first"] else None,
            "room_name":        r["room_name"],
            "conflict_on":      r["conflict_on"],
        }
        for r in rows
    ]


def update_appointment(engine: Engine, appt_id_str: str, updates: dict) -> None:
    """Patch allowed fields on an existing appointment."""
    appt_id_bin = uuid_to_bin(uuid.UUID(appt_id_str))
    allowed = {"appointment_date", "vet_user_id", "room_id",
               "procedure_type", "duration_mins", "notes", "status"}

    set_parts, params = [], {"appt_id": appt_id_bin}
    for field, value in updates.items():
        if field not in allowed:
            continue
        if field == "vet_user_id" and value:
            params[field] = uuid_to_bin(uuid.UUID(value))
        else:
            params[field] = value
        set_parts.append(f"{field} = :{field}")

    if not set_parts:
        return

    sql = text(f"UPDATE vet_appointments SET {', '.join(set_parts)} WHERE id = :appt_id")
    with engine.begin() as conn:
        conn.execute(sql, params)


def create_appointment(engine: Engine, pet_id_str: str, vet_user_id_str: str | None,
                       room_id: int | None, appointment_dt_str: str,
                       procedure_type: str, duration_mins: int, notes: str | None) -> dict:
    """Insert a new appointment and return its id."""
    pet_id_bin = uuid_to_bin(uuid.UUID(pet_id_str))
    vet_id_bin = uuid_to_bin(uuid.UUID(vet_user_id_str)) if vet_user_id_str else None
    appt_id     = uuid.uuid4()
    appt_id_bin = uuid_to_bin(appt_id)

    owner_sql = text("SELECT owner_user_id FROM pets WHERE id = :pet_id")
    insert_sql = text("""
        INSERT INTO vet_appointments
          (id, pet_id, owner_user_id, vet_user_id, room_id,
           appointment_date, status, procedure_type, duration_mins, notes)
        VALUES
          (:id, :pet_id, :owner_id, :vet_id, :room_id,
           :appt_date, 'scheduled', :proc_type, :duration, :notes)
    """)

    with engine.begin() as conn:
        row = conn.execute(owner_sql, {"pet_id": pet_id_bin}).mappings().first()
        if not row:
            raise ValueError(f"Pet not found: {pet_id_str}")
        conn.execute(insert_sql, {
            "id":       appt_id_bin,
            "pet_id":   pet_id_bin,
            "owner_id": row["owner_user_id"],
            "vet_id":   vet_id_bin,
            "room_id":  room_id,
            "appt_date": appointment_dt_str,
            "proc_type": procedure_type or "wellness",
            "duration":  duration_mins  or 30,
            "notes":     notes,
        })

    return {"id": str(appt_id)}


def get_clinic_resources(engine: Engine) -> dict:
    """Return all active vets and clinic rooms for the scheduler."""
    vets_sql = text("""
        SELECT u.id, u.first_name, u.last_name, u.user_name
        FROM   users u
        JOIN   user_role_assignments ura ON ura.user_id = u.id
        JOIN   user_roles ur            ON ur.id = ura.role_id AND ur.code = 'vet'
        ORDER  BY u.first_name
    """)
    rooms_sql = text("""
        SELECT id, name, room_type
        FROM   clinic_rooms
        WHERE  is_active = TRUE
        ORDER  BY id
    """)
    with engine.begin() as conn:
        vets  = conn.execute(vets_sql).mappings().all()
        rooms = conn.execute(rooms_sql).mappings().all()
    return {
        "vets": [{"id": bin_to_uuid(v["id"]), "first_name": v["first_name"],
                  "last_name": v["last_name"], "user_name": v["user_name"]} for v in vets],
        "rooms": [{"id": r["id"], "name": r["name"], "room_type": r["room_type"]} for r in rooms],
    }


def get_appointments_for_day(engine: Engine, date_str: str) -> list[dict]:
    """All appointments for a given date (YYYY-MM-DD) with full relational detail."""
    sql = text("""
        SELECT
            va.id               AS va_id,
            va.appointment_date,
            va.status,
            va.notes,
            va.summary,
            va.procedure_type,
            va.duration_mins,
            va.room_id,
            p.id                AS pet_id,
            p.name              AS pet_name,
            pt.code             AS pet_type_code,
            u_owner.first_name  AS owner_first,
            u_owner.last_name   AS owner_last,
            u_vet.id            AS vet_id,
            u_vet.first_name    AS vet_first,
            u_vet.last_name     AS vet_last,
            cr.name             AS room_name,
            cr.room_type
        FROM   vet_appointments va
        JOIN   pets p          ON p.id  = va.pet_id
        JOIN   pet_types pt    ON pt.id = p.pet_type_id
        JOIN   users u_owner   ON u_owner.id = va.owner_user_id
        LEFT JOIN users u_vet  ON u_vet.id   = va.vet_user_id
        LEFT JOIN clinic_rooms cr ON cr.id   = va.room_id
        WHERE  DATE(va.appointment_date) = :date
        AND    va.status != 'cancelled'
        ORDER  BY va.appointment_date ASC
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql, {"date": date_str}).mappings().all()

    return [
        {
            "id":               bin_to_uuid(r["va_id"]),
            "appointment_date": str(r["appointment_date"]),
            "status":           r["status"],
            "notes":            r["notes"],
            "procedure_type":   r["procedure_type"] or "wellness",
            "duration_mins":    r["duration_mins"]  or 30,
            "pet": {
                "id":        bin_to_uuid(r["pet_id"]),
                "name":      r["pet_name"],
                "type_code": r["pet_type_code"],
            },
            "owner": {
                "first_name": r["owner_first"],
                "last_name":  r["owner_last"],
            },
            "vet_id":   bin_to_uuid(r["vet_id"]) if r["vet_id"] else None,
            "vet_name": f"Dr. {r['vet_first']} {r['vet_last']}" if r["vet_first"] else None,
            "room_id":   r["room_id"],
            "room_name": r["room_name"],
        }
        for r in rows
    ]


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


DEFAULT_WIDGET_ORDER = ["checkin", "hospitalized", "reminders", "whosin"]

def get_dashboard_layout(engine: Engine, user_name: str) -> list[str]:
    sql = text("""
        SELECT udl.widget_order
        FROM user_dashboard_layouts udl
        JOIN users u ON u.id = udl.user_id
        WHERE u.user_name = :user_name
    """)
    with engine.begin() as conn:
        row = conn.execute(sql, {"user_name": user_name}).mappings().first()
    if not row:
        return DEFAULT_WIDGET_ORDER
    import json
    val = row["widget_order"]
    return json.loads(val) if isinstance(val, str) else val


def save_dashboard_layout(engine: Engine, user_name: str, widget_order: list) -> None:
    import json
    user_sql   = text("SELECT id FROM users WHERE user_name = :user_name")
    upsert_sql = text("""
        INSERT INTO user_dashboard_layouts (user_id, widget_order)
        VALUES (:user_id, :widget_order)
        ON DUPLICATE KEY UPDATE widget_order = :widget_order
    """)
    with engine.begin() as conn:
        row = conn.execute(user_sql, {"user_name": user_name}).mappings().first()
        if not row:
            raise ValueError(f"User '{user_name}' not found")
        conn.execute(upsert_sql, {
            "user_id":      row["id"],
            "widget_order": json.dumps(widget_order),
        })


def get_todays_shift_checkins(engine: Engine) -> list[dict]:
    """All staff who have checked in today, with their check-out time if set."""
    sql = text("""
        SELECT
            sc.id, sc.checked_in_at, sc.checked_out_at,
            u.user_name, u.first_name, u.last_name,
            GROUP_CONCAT(ur.code ORDER BY ur.code SEPARATOR ',') AS roles
        FROM shift_checkins sc
        JOIN users u ON u.id = sc.user_id
        LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
        LEFT JOIN user_roles ur ON ur.id = ura.role_id
        WHERE DATE(sc.checked_in_at) = CURDATE()
        GROUP BY sc.id, sc.checked_in_at, sc.checked_out_at,
                 u.user_name, u.first_name, u.last_name
        ORDER BY sc.checked_in_at ASC
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()
    return [
        {
            "id":              bin_to_uuid(r["id"]),
            "user_name":       r["user_name"],
            "first_name":      r["first_name"],
            "last_name":       r["last_name"],
            "roles":           r["roles"].split(",") if r["roles"] else [],
            "checked_in_at":   str(r["checked_in_at"]),
            "checked_out_at":  str(r["checked_out_at"]) if r["checked_out_at"] else None,
        }
        for r in rows
    ]


def get_my_shift_status(engine: Engine, user_name: str) -> dict | None:
    """Return the most recent open shift for this user today, or None."""
    sql = text("""
        SELECT sc.id, sc.checked_in_at, sc.checked_out_at
        FROM shift_checkins sc
        JOIN users u ON u.id = sc.user_id
        WHERE u.user_name = :user_name
          AND DATE(sc.checked_in_at) = CURDATE()
          AND sc.checked_out_at IS NULL
        ORDER BY sc.checked_in_at DESC
        LIMIT 1
    """)
    with engine.begin() as conn:
        row = conn.execute(sql, {"user_name": user_name}).mappings().first()
    if not row:
        return None
    return {
        "id":            bin_to_uuid(row["id"]),
        "checked_in_at": str(row["checked_in_at"]),
    }


def shift_checkin(engine: Engine, user_name: str) -> dict:
    """Check a user in to their shift. Returns the new checkin record."""
    user_sql = text("SELECT id FROM users WHERE user_name = :user_name")
    ins_sql  = text("""
        INSERT INTO shift_checkins (id, user_id, checked_in_at)
        VALUES (:id, :user_id, NOW())
    """)
    checkin_id = uuid.uuid4()
    with engine.begin() as conn:
        row = conn.execute(user_sql, {"user_name": user_name}).mappings().first()
        if not row:
            raise ValueError(f"User '{user_name}' not found")
        conn.execute(ins_sql, {"id": uuid_to_bin(checkin_id), "user_id": row["id"]})
    return {"id": str(checkin_id)}


def shift_checkout(engine: Engine, user_name: str) -> bool:
    """Check the user out of their open shift today. Returns True if updated."""
    sql = text("""
        UPDATE shift_checkins sc
        JOIN users u ON u.id = sc.user_id
        SET sc.checked_out_at = NOW()
        WHERE u.user_name = :user_name
          AND DATE(sc.checked_in_at) = CURDATE()
          AND sc.checked_out_at IS NULL
    """)
    with engine.begin() as conn:
        result = conn.execute(sql, {"user_name": user_name})
    return result.rowcount > 0


def get_active_reminders(engine: Engine) -> list[dict]:
    """Active (not done) reminders ordered by priority then due_date."""
    sql = text("""
        SELECT
            r.id, r.type, r.note, r.priority, r.due_date,
            p.name        AS pet_name,
            u.first_name  AS owner_first,
            u.last_name   AS owner_last
        FROM reminders r
        LEFT JOIN pets p  ON p.id = r.pet_id
        LEFT JOIN users u ON u.id = p.owner_user_id
        WHERE r.is_done = FALSE
        ORDER BY
            FIELD(r.priority, 'overdue', 'today', 'soon'),
            r.due_date ASC
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()
    return [
        {
            "id":       bin_to_uuid(r["id"]),
            "type":     r["type"],
            "note":     r["note"],
            "priority": r["priority"],
            "due_date": str(r["due_date"]) if r["due_date"] else None,
            "pet_name": r["pet_name"],
            "owner":    f"{r['owner_first']} {r['owner_last']}" if r["owner_first"] else None,
        }
        for r in rows
    ]


def get_current_hospitalizations(engine: Engine) -> list[dict]:
    """All currently hospitalized patients (not yet discharged)."""
    sql = text("""
        SELECT
            h.id, h.reason, h.status, h.admitted_at, h.notes,
            p.name        AS pet_name,
            pt.code       AS pet_type_code,
            b.name        AS breed,
            u_owner.first_name AS owner_first, u_owner.last_name AS owner_last,
            cr.name       AS room_name, cr.room_type,
            u_vet.first_name AS vet_first, u_vet.last_name AS vet_last
        FROM hospitalizations h
        JOIN  pets p            ON p.id  = h.pet_id
        JOIN  pet_types pt      ON pt.id = p.pet_type_id
        LEFT JOIN breeds b      ON b.id  = p.breed_id
        JOIN  users u_owner     ON u_owner.id = p.owner_user_id
        LEFT JOIN clinic_rooms cr ON cr.id = h.room_id
        LEFT JOIN users u_vet   ON u_vet.id = h.caretaker_id
        WHERE h.discharged_at IS NULL
        ORDER BY h.admitted_at ASC
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()
    return [
        {
            "id":          bin_to_uuid(r["id"]),
            "pet_name":    r["pet_name"],
            "pet_type":    r["pet_type_code"],
            "breed":       r["breed"],
            "owner":       f"{r['owner_first']} {r['owner_last']}",
            "reason":      r["reason"],
            "status":      r["status"],
            "room":        r["room_name"] or "—",
            "caretaker":   f"Dr. {r['vet_first']} {r['vet_last']}" if r["vet_first"] else "—",
            "admitted_at": str(r["admitted_at"]),
            "notes":       r["notes"],
        }
        for r in rows
    ]


def get_user_roles(engine: Engine, user_name: str) -> list[str]:
    """Return list of role codes for a user."""
    sql = text("""
        SELECT ur.code
        FROM user_roles ur
        JOIN user_role_assignments ura ON ura.role_id = ur.id
        JOIN users u ON u.id = ura.user_id
        WHERE u.user_name = :user_name
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql, {"user_name": user_name}).mappings().all()
    return [r["code"] for r in rows]


def get_all_users_with_roles(engine: Engine) -> list[dict]:
    """All users with their roles — for admin user management."""
    sql = text("""
        SELECT
            u.id, u.user_name, u.first_name, u.last_name,
            u.gender, u.city, u.telephone, u.created_at,
            GROUP_CONCAT(ur.code ORDER BY ur.code SEPARATOR ',') AS roles
        FROM users u
        LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
        LEFT JOIN user_roles ur ON ur.id = ura.role_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """)
    with engine.begin() as conn:
        rows = conn.execute(sql).mappings().all()
    return [
        {
            "id":         bin_to_uuid(r["id"]),
            "user_name":  r["user_name"],
            "first_name": r["first_name"],
            "last_name":  r["last_name"],
            "gender":     r["gender"],
            "city":       r["city"],
            "telephone":  r["telephone"],
            "created_at": str(r["created_at"]),
            "roles":      r["roles"].split(",") if r["roles"] else [],
        }
        for r in rows
    ]


def add_user_with_role(engine: Engine, user_name: str, first_name: str, last_name: str,
                       gender: int, city: str, telephone: str,
                       password_hash: str, role_code: str = "customer") -> dict:
    """Add a new user and assign a specific role."""
    user_id = uuid.uuid4()
    user_id_bin = uuid_to_bin(user_id)

    insert_sql = text("""
        INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash)
        VALUES (:id, :user_name, :first_name, :last_name, :gender, :city, :telephone, :password_hash)
    """)
    role_sql  = text("SELECT id FROM user_roles WHERE code = :code LIMIT 1")
    assign_sql = text("INSERT INTO user_role_assignments (user_id, role_id) VALUES (:user_id, :role_id)")

    try:
        with engine.begin() as conn:
            conn.execute(insert_sql, {
                "id": user_id_bin, "user_name": user_name, "first_name": first_name,
                "last_name": last_name, "gender": gender, "city": city,
                "telephone": telephone, "password_hash": password_hash,
            })
            role_row = conn.execute(role_sql, {"code": role_code}).mappings().first()
            if role_row:
                conn.execute(assign_sql, {"user_id": user_id_bin, "role_id": role_row["id"]})
        return {"id": str(user_id), "user_name": user_name,
                "first_name": first_name, "last_name": last_name}
    except Exception as e:
        raise Exception(f"Failed to create user: {str(e)}")


def update_user_role(engine: Engine, user_name: str, new_role_code: str) -> None:
    """Replace all roles for a user with a single new role."""
    get_user_sql  = text("SELECT id FROM users WHERE user_name = :user_name")
    get_role_sql  = text("SELECT id FROM user_roles WHERE code = :code LIMIT 1")
    del_roles_sql = text("DELETE FROM user_role_assignments WHERE user_id = :user_id")
    assign_sql    = text("INSERT INTO user_role_assignments (user_id, role_id) VALUES (:user_id, :role_id)")

    with engine.begin() as conn:
        user_row = conn.execute(get_user_sql, {"user_name": user_name}).mappings().first()
        if not user_row:
            raise ValueError(f"User '{user_name}' not found")
        role_row = conn.execute(get_role_sql, {"code": new_role_code}).mappings().first()
        if not role_row:
            raise ValueError(f"Role '{new_role_code}' not found")
        conn.execute(del_roles_sql, {"user_id": user_row["id"]})
        conn.execute(assign_sql, {"user_id": user_row["id"], "role_id": role_row["id"]})


def create_visit(engine: Engine, appointment_id_str: str, pet_id_str: str,
                 vet_user_id_str: str | None, chief_complaint: str | None,
                 exam_notes: str | None, assessment: str | None, plan: str | None) -> dict:
    """Create a visit record linked to an appointment."""
    visit_id     = uuid.uuid4()
    visit_id_bin = uuid_to_bin(visit_id)
    appt_id_bin  = uuid_to_bin(uuid.UUID(appointment_id_str))
    pet_id_bin   = uuid_to_bin(uuid.UUID(pet_id_str))
    vet_id_bin   = uuid_to_bin(uuid.UUID(vet_user_id_str)) if vet_user_id_str else None

    sql = text("""
        INSERT INTO visits (id, appointment_id, pet_id, vet_user_id,
                            chief_complaint, exam_notes, assessment, plan)
        VALUES (:id, :appointment_id, :pet_id, :vet_user_id,
                :chief_complaint, :exam_notes, :assessment, :plan)
    """)
    with engine.begin() as conn:
        conn.execute(sql, {
            "id": visit_id_bin, "appointment_id": appt_id_bin, "pet_id": pet_id_bin,
            "vet_user_id": vet_id_bin, "chief_complaint": chief_complaint,
            "exam_notes": exam_notes, "assessment": assessment, "plan": plan,
        })
    return {"id": str(visit_id)}


def _build_visit(row, prescs) -> dict:
    return {
        "id":               bin_to_uuid(row["id"]),
        "appointment_id":   bin_to_uuid(row["appointment_id"]),
        "chief_complaint":  row["chief_complaint"],
        "exam_notes":       row["exam_notes"],
        "assessment":       row["assessment"],
        "plan":             row["plan"],
        "created_at":       str(row["created_at"]),
        "updated_at":       str(row["updated_at"]),
        "vet_name":         f"Dr. {row['vet_first']} {row['vet_last']}" if row["vet_first"] else None,
        "pet_name":         row["pet_name"],
        "prescriptions": [
            {
                "id":            p["id"],
                "drug_name":     p["drug_name"],
                "dosage":        p["dosage"],
                "frequency":     p["frequency"],
                "duration_days": p["duration_days"],
                "notes":         p["notes"],
            }
            for p in prescs
        ],
    }


def get_visit(engine: Engine, visit_id_str: str) -> dict:
    """Full visit with prescriptions."""
    visit_id_bin = uuid_to_bin(uuid.UUID(visit_id_str))

    visit_sql = text("""
        SELECT v.id, v.appointment_id, v.chief_complaint, v.exam_notes,
               v.assessment, v.plan, v.created_at, v.updated_at,
               u.first_name AS vet_first, u.last_name AS vet_last,
               p.name AS pet_name
        FROM   visits v
        LEFT JOIN users u ON u.id = v.vet_user_id
        JOIN   pets p     ON p.id = v.pet_id
        WHERE  v.id = :visit_id
    """)
    presc_sql = text("""
        SELECT id, drug_name, dosage, frequency, duration_days, notes
        FROM   prescriptions
        WHERE  visit_id = :visit_id
        ORDER  BY id ASC
    """)
    with engine.begin() as conn:
        row = conn.execute(visit_sql, {"visit_id": visit_id_bin}).mappings().first()
        if not row:
            return {}
        prescs = conn.execute(presc_sql, {"visit_id": visit_id_bin}).mappings().all()
    return _build_visit(row, prescs)


def get_visit_by_appointment(engine: Engine, appointment_id_str: str) -> dict:
    """Get visit (with prescriptions) linked to a given appointment, or {}."""
    appt_id_bin = uuid_to_bin(uuid.UUID(appointment_id_str))

    sql = text("SELECT id FROM visits WHERE appointment_id = :appt_id LIMIT 1")
    with engine.begin() as conn:
        row = conn.execute(sql, {"appt_id": appt_id_bin}).mappings().first()
    if not row:
        return {}
    return get_visit(engine, bin_to_uuid(row["id"]))


def update_visit(engine: Engine, visit_id_str: str, updates: dict) -> None:
    visit_id_bin = uuid_to_bin(uuid.UUID(visit_id_str))
    allowed = {"chief_complaint", "exam_notes", "assessment", "plan"}
    set_parts, params = [], {"visit_id": visit_id_bin}
    for field, value in updates.items():
        if field not in allowed:
            continue
        params[field] = value
        set_parts.append(f"{field} = :{field}")
    if not set_parts:
        return
    sql = text(f"UPDATE visits SET {', '.join(set_parts)} WHERE id = :visit_id")
    with engine.begin() as conn:
        conn.execute(sql, params)


def set_prescriptions(engine: Engine, visit_id_str: str, prescriptions: list) -> None:
    """Replace all prescriptions for a visit."""
    visit_id_bin = uuid_to_bin(uuid.UUID(visit_id_str))
    del_sql = text("DELETE FROM prescriptions WHERE visit_id = :visit_id")
    ins_sql = text("""
        INSERT INTO prescriptions (visit_id, drug_name, dosage, frequency, duration_days, notes)
        VALUES (:visit_id, :drug_name, :dosage, :frequency, :duration_days, :notes)
    """)
    with engine.begin() as conn:
        conn.execute(del_sql, {"visit_id": visit_id_bin})
        for p in prescriptions:
            if not p.get("drug_name"):
                continue
            conn.execute(ins_sql, {
                "visit_id":     visit_id_bin,
                "drug_name":    p.get("drug_name", ""),
                "dosage":       p.get("dosage"),
                "frequency":    p.get("frequency"),
                "duration_days": p.get("duration_days"),
                "notes":        p.get("notes"),
            })
