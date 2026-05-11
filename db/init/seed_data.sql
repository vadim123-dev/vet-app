-- ============================================================
-- TeyaVet seed data
-- Safe to re-run: all inserts use ON DUPLICATE KEY UPDATE.
-- Appointment dates are relative to CURDATE() so they always
-- land on realistic days regardless of when the DB is seeded.
-- ============================================================

-- ── Lookup tables ─────────────────────────────────────────────────────────────

INSERT INTO pet_types (code, name) VALUES
('dog',    'Dog'),
('cat',    'Cat'),
('rabbit', 'Rabbit'),
('parrot', 'Parrot')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO user_roles (code, name) VALUES
('customer',     'Customer'),
('vet',          'Veterinarian'),
('office_staff', 'Office Staff'),
('admin',        'Administrator'),
('coordinator',  'Coordinator')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO breeds (code, name, pet_type_id, origin) VALUES
('labrador_retriever', 'Labrador Retriever', 1, 'Canada'),
('german_shepherd',    'German Shepherd',    1, 'Germany'),
('border_collie',      'Border Collie',      1, 'United Kingdom'),
('bengal',             'Bengal',             2, 'United States'),
('siamese',            'Siamese',            2, 'Thailand'),
('persian',            'Persian',            2, 'Iran'),
('holland_lop',        'Holland Lop',        3, 'Netherlands'),
('african_grey',       'African Grey',       4, 'Africa')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ── Clinic rooms ──────────────────────────────────────────────────────────────

INSERT INTO clinic_rooms (id, name, room_type) VALUES
(1, 'Exam Room A',   'exam'),
(2, 'Exam Room B',   'exam'),
(3, 'Lab',           'lab'),
(4, 'Surgery Room',  'surgery')
ON DUPLICATE KEY UPDATE name=VALUES(name), room_type=VALUES(room_type);

-- ── Users ─────────────────────────────────────────────────────────────────────

-- passwords: vad=Vadim123, everyone else=Admin
-- Coordinator
INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash) VALUES
(UNHEX('112233445566778899AABBCC00000001'), 'vad', 'Vadim', 'Hasmenik', 1, 'Beit Dagan', '0523434834',
 'scrypt:32768:8:1$inZncNhNajsCKLj0$02d5fe3dc01c39abc8d7c1321eb0281e56e19825f45bf24d1143e1dc1e0210f12295ca21e028611dd07e61816771597a404ccb20030474f6d3ebdf8353e1c757')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash);

-- Customers
INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash) VALUES
(UNHEX('112233445566778899AABBCC00000002'), 'alex',  'Alex',  'Cohen',     1, 'Tel Aviv',      '0501234567', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b'),
(UNHEX('112233445566778899AABBCC00000003'), 'maria', 'Maria', 'Levi',      2, 'Haifa',         '0529876543', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b'),
(UNHEX('112233445566778899AABBCC00000004'), 'dan',   'Dan',   'Rosen',     1, 'Rishon LeZion', '0541122334', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b'),
(UNHEX('112233445566778899AABBCC00000005'), 'sarah', 'Sarah', 'Goldman',   2, 'Netanya',       '0534455667', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b'),
(UNHEX('112233445566778899AABBCC00000006'), 'yossi', 'Yossi', 'Ben-David', 1, 'Ashdod',        '0509988776', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b')
ON DUPLICATE KEY UPDATE id=id;

-- Vets
INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash) VALUES
(UNHEX('112233445566778899AABBCC10000001'), 'dr_amy',   'Amy',   'Stone',   2, 'Tel Aviv',  '0553334444', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b'),
(UNHEX('112233445566778899AABBCC10000002'), 'dr_david', 'David', 'Hoffman', 1, 'Jerusalem', '0552221111', 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b')
ON DUPLICATE KEY UPDATE id=id;

-- Office staff / Coordinator
INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash) VALUES
(UNHEX('112233445566778899AABBCC20000001'), 'office_01', 'Lisa', 'Brown', 2, 'Tel Aviv', '0559999999',
 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b')
ON DUPLICATE KEY UPDATE id=id;

-- Admin
INSERT INTO users (id, user_name, first_name, last_name, gender, city, telephone, password_hash) VALUES
(UNHEX('AAAAAAAAAAAAAAAAAAAAAAAAAA000001'), 'Admin', 'Admin', 'User', 1, 'Tel Aviv', '0500000000',
 'scrypt:32768:8:1$bcpWr4D4AgFG12ZP$6c6e971fece6392925fe5c0e3c9d4ab3d9bb8ecb0739e1909140d65a6df02b3b9627e7bdcbb42d0bb13f846b1dbcdab0f812e26ecab6d73eca1daa8d6e31078b')
ON DUPLICATE KEY UPDATE id=id;

-- ── Role assignments ──────────────────────────────────────────────────────────

-- Use subqueries so role IDs don't need to be hardcoded
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000001'), id FROM user_roles WHERE code='coordinator'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000002'), id FROM user_roles WHERE code='customer'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000003'), id FROM user_roles WHERE code='customer'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000004'), id FROM user_roles WHERE code='customer'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000005'), id FROM user_roles WHERE code='customer'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC00000006'), id FROM user_roles WHERE code='customer'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC10000001'), id FROM user_roles WHERE code='vet'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC10000002'), id FROM user_roles WHERE code='vet'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('112233445566778899AABBCC20000001'), id FROM user_roles WHERE code='coordinator'
ON DUPLICATE KEY UPDATE user_id=user_id;
INSERT INTO user_role_assignments (user_id, role_id)
SELECT UNHEX('AAAAAAAAAAAAAAAAAAAAAAAAAA000001'), id FROM user_roles WHERE code='admin'
ON DUPLICATE KEY UPDATE user_id=user_id;

-- ── Pets ──────────────────────────────────────────────────────────────────────

INSERT INTO pets (id, owner_user_id, name, pet_type_id, breed_id, birth_date, birth_date_is_estimated) VALUES
(UNHEX('223344556677889900AABBCC00000001'), UNHEX('112233445566778899AABBCC00000001'), 'Mitsi', 2, 4, '2020-03-15', 0), -- Bengal cat  / vad
(UNHEX('223344556677889900AABBCC00000002'), UNHEX('112233445566778899AABBCC00000002'), 'Buddy', 1, 1, '2018-07-22', 0), -- Labrador    / alex
(UNHEX('223344556677889900AABBCC00000003'), UNHEX('112233445566778899AABBCC00000003'), 'Luna',  2, 5, '2021-01-10', 0), -- Siamese cat / maria
(UNHEX('223344556677889900AABBCC00000004'), UNHEX('112233445566778899AABBCC00000004'), 'Kiwi',  4, 8, '2019-06-05', 1), -- African Grey parrot / dan
(UNHEX('223344556677889900AABBCC00000005'), UNHEX('112233445566778899AABBCC00000005'), 'Sky',   1, 3, '2022-02-14', 0), -- Border Collie / sarah
(UNHEX('223344556677889900AABBCC00000006'), UNHEX('112233445566778899AABBCC00000006'), 'Snow',  3, 7, '2020-11-30', 0)  -- Holland Lop rabbit / yossi
ON DUPLICATE KEY UPDATE id=id;

-- ── Pet measurements ──────────────────────────────────────────────────────────

INSERT INTO pet_measurements (id, pet_id, measured_at, weight_kg, height_cm, temperature_celsius, notes) VALUES
(UNHEX('334455667788990000AABBCC00000001'), UNHEX('223344556677889900AABBCC00000001'), NOW(), 4.2,  NULL, 38.5, 'Regular checkup - healthy weight'),
(UNHEX('334455667788990000AABBCC00000002'), UNHEX('223344556677889900AABBCC00000002'), NOW(), 32.5, 60,   38.1, 'Good condition, active'),
(UNHEX('334455667788990000AABBCC00000003'), UNHEX('223344556677889900AABBCC00000003'), NOW(), 3.8,  NULL, 38.3, 'Healthy'),
(UNHEX('334455667788990000AABBCC00000005'), UNHEX('223344556677889900AABBCC00000005'), NOW(), 28.0, 55,   38.0, 'Excellent shape'),
(UNHEX('334455667788990000AABBCC00000006'), UNHEX('223344556677889900AABBCC00000006'), NOW(), 2.5,  25,   38.2, 'Good weight for rabbit')
ON DUPLICATE KEY UPDATE id=id;

-- ── Reminders ─────────────────────────────────────────────────────────────────

INSERT INTO reminders (id, pet_id, type, note, priority, due_date) VALUES
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000001'), UNHEX('223344556677889900AABBCC00000002'), 'vaccine',  'Rabies booster overdue',               'overdue', DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000002'), UNHEX('223344556677889900AABBCC00000003'), 'vaccine',  'FVRCP vaccine overdue',                'overdue', DATE_SUB(CURDATE(), INTERVAL 15 DAY)),
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000003'), UNHEX('223344556677889900AABBCC00000004'), 'call',     'Annual wellness exam due - call owner', 'overdue', DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000004'), UNHEX('223344556677889900AABBCC00000006'), 'call',     'Discharge ready - notify owner',       'today',   CURDATE()),
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000005'), UNHEX('223344556677889900AABBCC00000001'), 'followup', 'Post-visit follow-up call',            'today',   CURDATE()),
(UNHEX('CCCCCCCCCCCCCCCCCCCCCCCC00000006'), UNHEX('223344556677889900AABBCC00000005'), 'vaccine',  'Bordetella booster due in 6 days',     'soon',    DATE_ADD(CURDATE(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE id=id;

-- ── Hospitalizations ──────────────────────────────────────────────────────────

INSERT INTO hospitalizations (id, pet_id, room_id, reason, status, caretaker_id, admitted_at, notes) VALUES
(UNHEX('BBBBBBBBBBBBBBBBBBBBBBBB00000001'),
 UNHEX('223344556677889900AABBCC00000002'), 4,
 'Post-op observation — spleen surgery', 'stable',
 UNHEX('112233445566778899AABBCC10000001'),
 DATE_SUB(NOW(), INTERVAL 1 DAY),
 'Vitals stable. Keep NPO until tomorrow morning.')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO hospitalizations (id, pet_id, room_id, reason, status, caretaker_id, admitted_at, notes) VALUES
(UNHEX('BBBBBBBBBBBBBBBBBBBBBBBB00000002'),
 UNHEX('223344556677889900AABBCC00000003'), 2,
 'IV fluids — acute kidney injury', 'monitoring',
 UNHEX('112233445566778899AABBCC10000002'),
 DATE_SUB(NOW(), INTERVAL 2 DAY),
 'Creatinine trending down. Recheck labs in 6 hours.')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO hospitalizations (id, pet_id, room_id, reason, status, caretaker_id, admitted_at, notes) VALUES
(UNHEX('BBBBBBBBBBBBBBBBBBBBBBBB00000003'),
 UNHEX('223344556677889900AABBCC00000006'), 1,
 'GI stasis — recovery', 'ready',
 UNHEX('112233445566778899AABBCC10000001'),
 DATE_SUB(NOW(), INTERVAL 3 DAY),
 'Eating and moving well. Ready for discharge this afternoon.')
ON DUPLICATE KEY UPDATE id=id;

-- ── Vet schedules ─────────────────────────────────────────────────────────────

INSERT INTO vet_schedules (id, vet_user_id, day_of_week, start_time, end_time, is_available) VALUES
-- Dr. Amy Stone
(UNHEX('445566778899001100AABBCC10000001'), UNHEX('112233445566778899AABBCC10000001'), 0, '09:00:00', '17:00:00', 1),
(UNHEX('445566778899001100AABBCC10000002'), UNHEX('112233445566778899AABBCC10000001'), 1, '08:00:00', '18:00:00', 1),
(UNHEX('445566778899001100AABBCC10000003'), UNHEX('112233445566778899AABBCC10000001'), 2, '08:00:00', '18:00:00', 1),
(UNHEX('445566778899001100AABBCC10000004'), UNHEX('112233445566778899AABBCC10000001'), 3, '08:00:00', '18:00:00', 1),
(UNHEX('445566778899001100AABBCC10000005'), UNHEX('112233445566778899AABBCC10000001'), 4, '08:00:00', '18:00:00', 1),
(UNHEX('445566778899001100AABBCC10000006'), UNHEX('112233445566778899AABBCC10000001'), 5, '08:00:00', '16:00:00', 1),
(UNHEX('445566778899001100AABBCC10000007'), UNHEX('112233445566778899AABBCC10000001'), 6, '09:00:00', '13:00:00', 1),
-- Dr. David Hoffman
(UNHEX('445566778899001100AABBCC20000001'), UNHEX('112233445566778899AABBCC10000002'), 1, '09:00:00', '17:00:00', 1),
(UNHEX('445566778899001100AABBCC20000002'), UNHEX('112233445566778899AABBCC10000002'), 2, '09:00:00', '17:00:00', 1),
(UNHEX('445566778899001100AABBCC20000003'), UNHEX('112233445566778899AABBCC10000002'), 3, '09:00:00', '17:00:00', 1),
(UNHEX('445566778899001100AABBCC20000004'), UNHEX('112233445566778899AABBCC10000002'), 4, '09:00:00', '17:00:00', 1),
(UNHEX('445566778899001100AABBCC20000005'), UNHEX('112233445566778899AABBCC10000002'), 5, '09:00:00', '17:00:00', 1)
ON DUPLICATE KEY UPDATE id=id;

-- ── Appointments ──────────────────────────────────────────────────────────────
-- Columns: id, pet_id, owner_user_id, vet_user_id, room_id,
--          appointment_date, status, procedure_type, duration_mins, notes

-- Past / future baseline appointments (dates relative to seed time)
INSERT INTO vet_appointments
  (id, pet_id, owner_user_id, vet_user_id, room_id, appointment_date, status, procedure_type, duration_mins, notes)
VALUES
(UNHEX('556677889900112200AABBCC00000001'),
 UNHEX('223344556677889900AABBCC00000001'), UNHEX('112233445566778899AABBCC00000001'),
 UNHEX('112233445566778899AABBCC10000001'), 1,
 DATE_ADD(NOW(), INTERVAL 3 DAY), 'scheduled', 'wellness', 30, 'Routine checkup for Mitsi'),

(UNHEX('556677889900112200AABBCC00000002'),
 UNHEX('223344556677889900AABBCC00000002'), UNHEX('112233445566778899AABBCC00000002'),
 UNHEX('112233445566778899AABBCC10000002'), 1,
 DATE_ADD(NOW(), INTERVAL 5 DAY), 'scheduled', 'dental', 60, 'Vaccination and teeth cleaning for Buddy'),

(UNHEX('556677889900112200AABBCC00000003'),
 UNHEX('223344556677889900AABBCC00000005'), UNHEX('112233445566778899AABBCC00000005'),
 UNHEX('112233445566778899AABBCC10000001'), NULL,
 DATE_ADD(NOW(), INTERVAL -1 DAY), 'completed', 'wellness', 30, 'Checkup for Sky')
ON DUPLICATE KEY UPDATE id=id;

-- Today's full clinic schedule (13 appointments across vets and rooms)
INSERT INTO vet_appointments
  (id, pet_id, owner_user_id, vet_user_id, room_id, appointment_date, status, procedure_type, duration_mins, notes)
VALUES
(UNHEX('AABBCC001122334400000000000000A1'),
 UNHEX('223344556677889900AABBCC00000003'), UNHEX('112233445566778899AABBCC00000003'),
 UNHEX('112233445566778899AABBCC10000001'), 1,
 CONCAT(CURDATE(),' 08:30:00'), 'scheduled', 'wellness', 30, 'Annual wellness exam'),

(UNHEX('AABBCC001122334400000000000000A2'),
 UNHEX('223344556677889900AABBCC00000006'), UNHEX('112233445566778899AABBCC00000006'),
 NULL, 3,
 CONCAT(CURDATE(),' 08:30:00'), 'scheduled', 'bloodwork', 25, 'Bloodwork panel'),

(UNHEX('AABBCC001122334400000000000000A3'),
 UNHEX('223344556677889900AABBCC00000002'), UNHEX('112233445566778899AABBCC00000002'),
 UNHEX('112233445566778899AABBCC10000002'), NULL,
 CONCAT(CURDATE(),' 09:00:00'), 'scheduled', 'vaccine', 20, 'Rabies booster'),

(UNHEX('AABBCC001122334400000000000000A4'),
 UNHEX('223344556677889900AABBCC00000004'), UNHEX('112233445566778899AABBCC00000004'),
 UNHEX('112233445566778899AABBCC10000001'), 2,
 CONCAT(CURDATE(),' 09:30:00'), 'scheduled', 'wellness', 30, 'Annual wellness – first time with Dr Stone'),

(UNHEX('AABBCC001122334400000000000000A5'),
 UNHEX('223344556677889900AABBCC00000003'), UNHEX('112233445566778899AABBCC00000003'),
 UNHEX('112233445566778899AABBCC10000002'), 1,
 CONCAT(CURDATE(),' 10:00:00'), 'scheduled', 'dental', 60, 'Dental cleaning and scale'),

(UNHEX('AABBCC001122334400000000000000A6'),
 UNHEX('223344556677889900AABBCC00000001'), UNHEX('112233445566778899AABBCC00000001'),
 NULL, 3,
 CONCAT(CURDATE(),' 10:30:00'), 'scheduled', 'bloodwork', 25, 'Pre-op bloodwork'),

(UNHEX('AABBCC001122334400000000000000A7'),
 UNHEX('223344556677889900AABBCC00000001'), UNHEX('112233445566778899AABBCC00000001'),
 UNHEX('112233445566778899AABBCC10000001'), 1,
 CONCAT(CURDATE(),' 11:00:00'), 'scheduled', 'wellness', 30, 'Routine checkup for Mitsi'),

(UNHEX('AABBCC001122334400000000000000A8'),
 UNHEX('223344556677889900AABBCC00000006'), UNHEX('112233445566778899AABBCC00000006'),
 UNHEX('112233445566778899AABBCC10000002'), NULL,
 CONCAT(CURDATE(),' 11:30:00'), 'scheduled', 'followup', 20, 'Follow-up after bloodwork'),

(UNHEX('AABBCC001122334400000000000000A9'),
 UNHEX('223344556677889900AABBCC00000005'), UNHEX('112233445566778899AABBCC00000005'),
 UNHEX('112233445566778899AABBCC10000001'), 1,
 CONCAT(CURDATE(),' 13:00:00'), 'scheduled', 'surgery', 90, 'Spay procedure'),

(UNHEX('AABBCC001122334400000000000000AA'),
 UNHEX('223344556677889900AABBCC00000002'), UNHEX('112233445566778899AABBCC00000002'),
 UNHEX('112233445566778899AABBCC10000002'), NULL,
 CONCAT(CURDATE(),' 14:30:00'), 'scheduled', 'followup', 20, 'Post-dental follow-up'),

(UNHEX('AABBCC001122334400000000000000AB'),
 UNHEX('223344556677889900AABBCC00000004'), UNHEX('112233445566778899AABBCC00000004'),
 NULL, 3,
 CONCAT(CURDATE(),' 15:00:00'), 'scheduled', 'bloodwork', 25, 'Routine blood panel'),

(UNHEX('AABBCC001122334400000000000000AC'),
 UNHEX('223344556677889900AABBCC00000003'), UNHEX('112233445566778899AABBCC00000003'),
 UNHEX('112233445566778899AABBCC10000001'), NULL,
 CONCAT(CURDATE(),' 15:30:00'), 'scheduled', 'vaccine', 20, 'FVRCP booster'),

(UNHEX('AABBCC001122334400000000000000AD'),
 UNHEX('223344556677889900AABBCC00000006'), UNHEX('112233445566778899AABBCC00000006'),
 UNHEX('112233445566778899AABBCC10000002'), 2,
 CONCAT(CURDATE(),' 16:00:00'), 'scheduled', 'dental', 60, 'Dental scaling')
ON DUPLICATE KEY UPDATE id=id;
