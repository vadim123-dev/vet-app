import React, { useState, useEffect, useRef, useMemo } from "react";
import { apiFetch } from "../api";

// ─── Procedure catalogue (mirrors AppointmentsPage) ──────────────────────────

const PROCEDURES = [
  { id: "wellness",  label: "Wellness exam",    icon: "❤️",  mins: 30,  tone: "oklch(0.85 0.07 150)" },
  { id: "vaccine",   label: "Vaccination",      icon: "💉",  mins: 20,  tone: "oklch(0.86 0.08 60)"  },
  { id: "surgery",   label: "Surgery",          icon: "🩺",  mins: 90,  tone: "oklch(0.82 0.10 30)"  },
  { id: "dental",    label: "Dental cleaning",  icon: "🦷",  mins: 60,  tone: "oklch(0.85 0.08 280)" },
  { id: "bloodwork", label: "Bloodwork / Lab",  icon: "🧪",  mins: 25,  tone: "oklch(0.85 0.07 220)" },
  { id: "followup",  label: "Follow-up",        icon: "📋",  mins: 20,  tone: "oklch(0.88 0.05 90)"  },
  { id: "grooming",  label: "Drop-off + groom", icon: "✂️",  mins: 45,  tone: "oklch(0.88 0.06 330)" },
  { id: "emergency", label: "Emergency",        icon: "🚨",  mins: 30,  tone: "oklch(0.80 0.20 25)"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function minsToTimeStr(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function apptStartMins(dtStr) {
  const tp = (dtStr || "").replace("T", " ").split(" ")[1] || "";
  const [h, m] = tp.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatConflictErrors(conflicts) {
  return conflicts.map(c => {
    const tp = (c.appointment_date || "").replace("T", " ").split(" ")[1] || "";
    const [h, m] = tp.split(":").map(Number);
    const start = (h || 0) * 60 + (m || 0);
    const range = `${fmtTime(start)}–${fmtTime(start + (c.duration_mins || 30))}`;
    if (c.conflict_on === "vet") {
      return `${c.vet_name || "The vet"} is busy at this time — seeing ${c.pet_name} (${range})`;
    }
    return `${c.room_name || "The room"} is unavailable at this time — booked for ${c.pet_name} (${range})`;
  }).join("\n");
}

function computeMaxDuration(dayAppts, time, vetId, roomId, excludeId = null) {
  if (!time || (!vetId && !roomId)) return 240;
  const [h, m] = time.split(":").map(Number);
  const startMins = h * 60 + m;
  let minNext = Infinity;
  for (const a of dayAppts) {
    if (excludeId && a.id === excludeId) continue;
    const sameVet  = vetId  && a.vet_id  === vetId;
    const sameRoom = roomId && a.room_id === parseInt(roomId, 10);
    if (!sameVet && !sameRoom) continue;
    const aStart = apptStartMins(a.appointment_date);
    if (aStart > startMins) minNext = Math.min(minNext, aStart);
  }
  return minNext === Infinity ? 240 : minNext - startMins;
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

function Field({ label, required, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}{required && <span style={{ color: "var(--primary)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}

const inputStyle = {
  height: 46, padding: "0 14px",
  border: "1.5px solid var(--border)", borderRadius: 12,
  background: "var(--field-bg)", color: "var(--ink)",
  fontFamily: "Inter, sans-serif", fontSize: 14,
  outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};
const selectStyle = { ...inputStyle, cursor: "pointer" };
const textareaStyle = {
  ...inputStyle, height: "auto", padding: "12px 14px",
  resize: "vertical", minHeight: 72, lineHeight: 1.5,
};

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...style, borderColor: focused ? "var(--primary)" : "var(--border)", boxShadow: focused ? "0 0 0 4px color-mix(in oklch, var(--primary) 15%, transparent)" : "none" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}
function FocusSelect({ style, children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{ ...style, borderColor: focused ? "var(--primary)" : "var(--border)", boxShadow: focused ? "0 0 0 4px color-mix(in oklch, var(--primary) 15%, transparent)" : "none" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}
function FocusTextarea({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{ ...style, borderColor: focused ? "var(--primary)" : "var(--border)", boxShadow: focused ? "0 0 0 4px color-mix(in oklch, var(--primary) 15%, transparent)" : "none" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─── Pet search dropdown ──────────────────────────────────────────────────────

function PetSelect({ value, onChange, pets, loading }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  const selected = pets.find(p => p.id === value);
  const filtered = query.trim()
    ? pets.filter(p => `${p.name} ${p.owner_first_name} ${p.owner_last_name}`.toLowerCase().includes(query.toLowerCase()))
    : pets;

  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => { setOpen(o => !o); setQuery(""); }}
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderColor: open ? "var(--primary)" : "var(--border)", boxShadow: open ? "0 0 0 4px color-mix(in oklch, var(--primary) 15%, transparent)" : "none" }}
      >
        {loading
          ? <span style={{ color: "var(--muted)" }}>Loading pets…</span>
          : selected
          ? <span style={{ fontWeight: 500 }}>{selected.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {selected.owner_first_name} {selected.owner_last_name}</span></span>
          : <span style={{ color: "var(--muted)" }}>Search for a patient…</span>
        }
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease", flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 16px 40px -12px oklch(0.3 0.08 40 / 0.25)", zIndex: 20, overflow: "hidden", maxHeight: 280, display: "flex", flexDirection: "column" }}>
          {/* Search input */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type name or owner…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--ink)" }}
            />
          </div>
          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0
              ? <div style={{ padding: "16px 14px", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>No patients found</div>
              : filtered.map(p => (
                <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: p.id === value ? "color-mix(in oklch, var(--primary) 10%, transparent)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid color-mix(in oklch, var(--border) 60%, transparent)" }}
                  onMouseEnter={e => { if (p.id !== value) e.currentTarget.style.background = "color-mix(in oklch, var(--ink) 4%, transparent)"; }}
                  onMouseLeave={e => { if (p.id !== value) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `oklch(0.88 0.05 ${(p.name.charCodeAt(0) * 37) % 360})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {p.type_code === "dog" ? "🐕" : p.type_code === "cat" ? "🐱" : p.type_code === "rabbit" ? "🐰" : p.type_code === "parrot" ? "🦜" : "🐾"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{p.type_name} · {p.owner_first_name} {p.owner_last_name}</div>
                  </div>
                  {p.id === value && (
                    <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12.5l5 5 11-11"/></svg>
                  )}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function NewAppointmentModal({ open, prefill, resources, patients = [], onClose, onCreated }) {
  const [pets,        setPets]       = useState([]);
  const [petsLoading, setPetsLoading]= useState(false);

  // Form state
  const [petId,       setPetId]      = useState("");
  const [procedureType, setProc]     = useState("wellness");
  const [durationMins,  setDuration] = useState(30);
  const [date,        setDate]       = useState("");
  const [time,        setTime]       = useState("09:00");
  const [vetId,       setVetId]      = useState("");
  const [roomId,      setRoomId]     = useState("");
  const [notes,       setNotes]      = useState("");
  const [submitting,  setSubmitting] = useState(false);
  const [error,       setError]      = useState("");

  const vets  = resources.filter(r => r.role === "vet");
  const _rooms = resources.filter(r => r.role !== "vet");

  // Appointments for the selected date — used to derive max duration
  const [dayAppts, setDayAppts] = useState([]);
  useEffect(() => {
    if (!date) { setDayAppts([]); return; }
    apiFetch(`/appointments/?date=${date}`)
      .then(d => setDayAppts(Array.isArray(d) ? d : []))
      .catch(() => setDayAppts([]));
  }, [date]);

  const startMins = useMemo(() => {
    const [h, m] = (time || "09:00").split(":").map(Number);
    return h * 60 + m;
  }, [time]);

  const maxDuration = useMemo(
    () => computeMaxDuration(dayAppts, time, vetId, roomId),
    [dayAppts, time, vetId, roomId]
  );

  // Auto-cap duration if a resource/time change tightens the window
  useEffect(() => {
    if (durationMins > maxDuration) setDuration(maxDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- react to constraint changes only; adding durationMins would fire on every keystroke
  }, [maxDuration]);

  // Derive room automatically: surgery proc → surgery room; else → vet's exam room
  const derivedRoom = useMemo(() => {
    if (procedureType === "surgery") {
      const r = resources.find(r => r.role === "surgery");
      return r ? { id: r._roomId, name: r.name } : null;
    }
    if (vetId) {
      const r = resources.find(r => r._vetId === vetId);
      return r?._examRoomId ? { id: r._examRoomId, name: r._examRoomName } : null;
    }
    return null;
  }, [procedureType, vetId, resources]);

  // Keep roomId in sync with derivedRoom for the API call
  useEffect(() => {
    setRoomId(derivedRoom ? String(derivedRoom.id) : "");
  }, [derivedRoom]);

  // Use patients passed from parent, fall back to fetching if not provided
  useEffect(() => {
    if (patients.length > 0) { setPets(patients); return; }
    if (!open || pets.length > 0) return;
    setPetsLoading(true);
    apiFetch("/pets/all")
      .then(d => setPets(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setPetsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pets.length is a guard to avoid refetch; adding it as dep would cause a fetch loop
  }, [open, patients]);

  // Pre-fill from slot click whenever prefill changes
  useEffect(() => {
    if (!prefill) return;
    if (prefill.date)      setDate(isoDate(prefill.date));
    if (prefill.time != null) setTime(minsToTimeStr(prefill.time));
    if (prefill.vetId)     setVetId(prefill.vetId);
    if (prefill.procedure) handleProcChange(prefill.procedure);
  }, [prefill]);

  // Auto-fill duration from procedure
  const handleProcChange = (proc) => {
    setProc(proc);
    const p = PROCEDURES.find(x => x.id === proc);
    if (p) setDuration(p.mins);
  };

  const reset = () => {
    setPetId(""); setProc("wellness"); setDuration(30);
    setDate(""); setTime("09:00"); setVetId(""); setRoomId("");
    setNotes(""); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!petId) { setError("Please select a patient."); return; }
    if (!date)  { setError("Please select a date."); return; }

    if (date === isoDate(new Date())) {
      const [h, m] = time.split(":").map(Number);
      const d = new Date();
      if (h * 60 + m < d.getHours() * 60 + d.getMinutes()) {
        setError("Cannot schedule an appointment for a time that has already passed.");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const appointmentDate = `${date} ${time}:00`;
    const body = {
      pet_id:           petId,
      appointment_date: appointmentDate,
      procedure_type:   procedureType,
      duration_mins:    durationMins,
      vet_user_id:      vetId   || null,
      room_id:          roomId  ? parseInt(roomId, 10) : null,
      notes:            notes   || null,
    };

    try {
      await apiFetch("/appointments/", { method: "POST", body });
      reset();
      onCreated();
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.responseData?.conflicts)) {
        setError(formatConflictErrors(err.responseData.conflicts));
      } else {
        setError(err.message || "Failed to book appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const proc = PROCEDURES.find(p => p.id === procedureType);

  return (
    <div onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.25 0.025 50 / 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "modal-fade 160ms ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, background: "var(--surface)", borderRadius: 22, border: "1px solid var(--border)", boxShadow: "0 40px 80px -24px oklch(0.3 0.08 40 / 0.4)", animation: "modal-pop 220ms cubic-bezier(.2,1,.4,1) both", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Clinic › Schedule</div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 500, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>New Appointment</h2>
          </div>
          <button onClick={handleClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1, padding: "20px 26px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Patient */}
          <Field label="Patient" required>
            <PetSelect value={petId} onChange={setPetId} pets={pets} loading={petsLoading}/>
          </Field>

          {/* Procedure + Duration side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <Field label="Procedure" required>
              <FocusSelect value={procedureType} onChange={e => handleProcChange(e.target.value)} style={selectStyle}>
                {PROCEDURES.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                ))}
              </FocusSelect>
            </Field>
            <Field label="Duration" hint={maxDuration < 240 ? `Max ${maxDuration} min — next appt at ${fmtTime(startMins + maxDuration)}` : "minutes"}>
              <FocusInput
                type="number" min={5} max={maxDuration} step={5}
                value={durationMins}
                onChange={e => setDuration(Math.min(Number(e.target.value), maxDuration))}
                style={{ ...inputStyle, borderColor: durationMins >= maxDuration && maxDuration < 240 ? "oklch(0.75 0.13 55)" : undefined }}
              />
            </Field>
          </div>

          {/* Procedure preview chip */}
          {proc && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: proc.tone || "color-mix(in oklch, var(--primary) 12%, var(--surface))", fontFamily: "Inter, sans-serif", fontSize: 13, color: "oklch(0.3 0.05 40)", alignSelf: "flex-start" }}>
              <span>{proc.icon}</span>
              <span style={{ fontWeight: 600 }}>{proc.label}</span>
              <span style={{ opacity: 0.7 }}>· {durationMins} min</span>
            </div>
          )}

          {/* Date + Time side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date" required>
              <FocusInput type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} required/>
            </Field>
            <Field label="Time" required>
              <FocusInput type="time" step={1800} value={time} onChange={e => setTime(e.target.value)} style={inputStyle} required/>
            </Field>
          </div>

          {/* Vet + Room side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Attending Vet" hint="Optional">
              <FocusSelect value={vetId} onChange={e => setVetId(e.target.value)} style={selectStyle}>
                <option value="">— Unassigned —</option>
                {vets.map(v => (
                  <option key={v._vetId} value={v._vetId}>{v.name}</option>
                ))}
              </FocusSelect>
            </Field>
            <Field label="Room" hint={procedureType === "surgery" ? "Auto — surgery" : vetId ? "Auto — vet's room" : "Select a vet first"}>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: derivedRoom ? "var(--ink)" : "var(--muted)", background: "color-mix(in oklch, var(--ink) 2%, var(--field-bg))", cursor: "default" }}>
                {derivedRoom ? derivedRoom.name : "—"}
              </div>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <FocusTextarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for visit, special instructions…"
              style={textareaStyle}
              rows={3}
            />
          </Field>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 30)", border: "1px solid oklch(0.88 0.06 30)", color: "oklch(0.45 0.16 30)", fontFamily: "Inter, sans-serif", fontSize: 13.5, animation: "lc-fade 200ms ease both", whiteSpace: "pre-line" }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "16px 26px 22px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button type="button" onClick={handleClose} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            type="submit"
            form="new-appt-form"
            disabled={submitting || !petId || !date}
            onClick={handleSubmit}
            style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: submitting || !petId || !date ? "color-mix(in oklch, var(--primary) 50%, var(--surface))" : "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: submitting || !petId || !date ? "not-allowed" : "pointer", boxShadow: !petId || !date ? "none" : "0 8px 22px -10px var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 160ms ease" }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "lc-spin 0.9s linear infinite" }}><path d="M12 3a9 9 0 1 0 9 9"/></svg>
                Booking…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                Book appointment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
