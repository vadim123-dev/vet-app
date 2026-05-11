-- ============================================================
-- TeyaVet database schema
-- Keep this file in sync with any ALTER TABLE migrations.
-- Init scripts only run on a fresh (empty) volume.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id            BINARY(16)   PRIMARY KEY,
    user_name     VARCHAR(50)  NOT NULL UNIQUE,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    gender        TINYINT,
    city          VARCHAR(100),
    telephone     VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_name (user_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    id         INT          PRIMARY KEY AUTO_INCREMENT,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id          INT       PRIMARY KEY AUTO_INCREMENT,
    user_id     BINARY(16) NOT NULL,
    role_id     INT        NOT NULL,
    assigned_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pet_types (
    id         TINYINT      PRIMARY KEY AUTO_INCREMENT,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS breeds (
    id         INT          PRIMARY KEY AUTO_INCREMENT,
    code       VARCHAR(50)  UNIQUE,
    name       VARCHAR(100) NOT NULL,
    pet_type_id TINYINT     NOT NULL,
    origin     VARCHAR(100),
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_type_id) REFERENCES pet_types(id) ON DELETE CASCADE,
    INDEX idx_pet_type (pet_type_id),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pets (
    id                      BINARY(16)  PRIMARY KEY,
    owner_user_id           BINARY(16)  NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    pet_type_id             TINYINT     NOT NULL,
    breed_id                INT,
    birth_date              DATE,
    birth_date_is_estimated BOOLEAN     DEFAULT FALSE,
    created_at              TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_type_id)   REFERENCES pet_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (breed_id)      REFERENCES breeds(id) ON DELETE SET NULL,
    INDEX idx_owner    (owner_user_id),
    INDEX idx_pet_type (pet_type_id),
    INDEX idx_breed    (breed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pet_measurements (
    id                  BINARY(16) PRIMARY KEY,
    pet_id              BINARY(16) NOT NULL,
    measured_at         TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight_kg           DECIMAL(5,2),
    height_cm           DECIMAL(5,2),
    temperature_celsius DECIMAL(4,2),
    notes               TEXT,
    created_at          TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    INDEX idx_pet         (pet_id),
    INDEX idx_measured_at (measured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clinic rooms (exam rooms, lab, surgery suites, etc.)
CREATE TABLE IF NOT EXISTS clinic_rooms (
    id         INT          PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    room_type  VARCHAR(50)  NOT NULL DEFAULT 'exam',  -- exam | lab | surgery
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vet_appointments (
    id               BINARY(16)  PRIMARY KEY,
    pet_id           BINARY(16)  NOT NULL,
    owner_user_id    BINARY(16)  NOT NULL,
    vet_user_id      BINARY(16),
    room_id          INT,                              -- which clinic room (nullable)
    appointment_date DATETIME    NOT NULL,
    status           VARCHAR(20) DEFAULT 'scheduled', -- scheduled | completed | cancelled
    procedure_type   VARCHAR(50) DEFAULT 'wellness',  -- wellness | vaccine | surgery | dental | bloodwork | followup | grooming
    duration_mins    INT         DEFAULT 30,
    notes            TEXT,
    summary          TEXT,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id)        REFERENCES pets(id)         ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (vet_user_id)   REFERENCES users(id)        ON DELETE SET NULL,
    FOREIGN KEY (room_id)       REFERENCES clinic_rooms(id) ON DELETE SET NULL,
    INDEX idx_pet              (pet_id),
    INDEX idx_owner            (owner_user_id),
    INDEX idx_appointment_date (appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visits (
    id               BINARY(16)  PRIMARY KEY,
    appointment_id   BINARY(16)  NOT NULL UNIQUE,
    pet_id           BINARY(16)  NOT NULL,
    vet_user_id      BINARY(16),
    chief_complaint  TEXT,
    exam_notes       TEXT,
    assessment       TEXT,
    plan             TEXT,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES vet_appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id)         REFERENCES pets(id)             ON DELETE CASCADE,
    FOREIGN KEY (vet_user_id)    REFERENCES users(id)            ON DELETE SET NULL,
    INDEX idx_appointment (appointment_id),
    INDEX idx_pet         (pet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prescriptions (
    id            INT          PRIMARY KEY AUTO_INCREMENT,
    visit_id      BINARY(16)   NOT NULL,
    drug_name     VARCHAR(200) NOT NULL,
    dosage        VARCHAR(100),
    frequency     VARCHAR(100),
    duration_days INT,
    notes         TEXT,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    INDEX idx_visit (visit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
    user_id     BINARY(16) PRIMARY KEY,
    widget_order JSON NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shift_checkins (
    id              BINARY(16)  PRIMARY KEY,
    user_id         BINARY(16)  NOT NULL,
    checked_in_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_out_at  TIMESTAMP   NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user       (user_id),
    INDEX idx_checked_in (checked_in_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminders (
    id          BINARY(16)   PRIMARY KEY,
    pet_id      BINARY(16),
    type        VARCHAR(20)  NOT NULL DEFAULT 'general', -- vaccine | call | followup | general
    note        VARCHAR(500) NOT NULL,
    priority    VARCHAR(20)  NOT NULL DEFAULT 'soon',    -- overdue | today | soon
    due_date    DATE,
    is_done     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    INDEX idx_done     (is_done),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hospitalizations (
    id               BINARY(16)   PRIMARY KEY,
    pet_id           BINARY(16)   NOT NULL,
    room_id          INT,
    reason           VARCHAR(255) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'stable', -- stable | monitoring | critical | ready
    caretaker_id     BINARY(16),
    admitted_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharged_at    TIMESTAMP    NULL,
    notes            TEXT,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id)       REFERENCES pets(id)         ON DELETE CASCADE,
    FOREIGN KEY (room_id)      REFERENCES clinic_rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (caretaker_id) REFERENCES users(id)        ON DELETE SET NULL,
    INDEX idx_pet          (pet_id),
    INDEX idx_discharged   (discharged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vet_schedules (
    id           BINARY(16) PRIMARY KEY,
    vet_user_id  BINARY(16) NOT NULL,
    day_of_week  TINYINT,   -- 0=Sun … 6=Sat
    start_time   TIME       NOT NULL,
    end_time     TIME       NOT NULL,
    is_available BOOLEAN    DEFAULT TRUE,
    created_at   TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vet_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vet (vet_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
