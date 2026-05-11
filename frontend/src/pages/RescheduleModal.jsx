import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../api";

const PROCEDURES = [
  { id: "wellness",  label: "Wellness exam",    icon: "❤️",  mins: 30 },
  { id: "vaccine",   label: "Vaccination",      icon: "💉",  mins: 20 },
  { id: "surgery",   label: "Surgery",          icon: "🩺",  mins: 90 },
  { id: "dental",    label: "Dental cleaning",  icon: "🦷",  mins: 60 },
  { id: "bloodwork", label: "Bloodwork / Lab",  icon: "🧪",  mins: 25 },
  { id: "followup",  label: "Follow-up",        icon: "📋",  mins: 20 },
  { id: "grooming",  label: "Drop-off + groom", icon: "✂️",  mins: 45 },
];

function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`;
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

function parseApptDatetime(dtStr) {
  if (!dtStr) return { date: "", time: "09:00" };
  const clean = dtStr.replace("T", " ");
  const [datePart, timePart = "09:00:00"] = clean.split(" ");
  const [h, m] = timePart.split(":");
  return { date: datePart, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

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
const textareaStyle = { ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical", minHeight: 72, lineHeight: 1.5 };

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

export default function RescheduleModal({ open, appt, resources, onClose, onRescheduled }) {
  const [date,         setDate]      = useState("");
  const [time,         setTime]      = useState("09:00");
  const [vetId,        setVetId]     = useState("");
  const [roomId,       setRoomId]    = useState("");
  const [durationMins, setDuration]  = useState(30);
  const [notes,        setNotes]     = useState("");
  const [submitting,   setSubmitting]= useState(false);
  const [error,        setError]     = useState("");

  const vets  = (resources || []).filter(r => r.role === "vet");
  const rooms = (resources || []).filter(r => r.role !== "vet");

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
    () => computeMaxDuration(dayAppts, time, vetId, roomId, appt?.id),
    [dayAppts, time, vetId, roomId, appt]
  );

  useEffect(() => {
    if (durationMins > maxDuration) setDuration(maxDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- react to constraint changes only; adding durationMins would fire on every keystroke
  }, [maxDuration]);

  useEffect(() => {
    if (!appt) return;
    const { date: d, time: t } = parseApptDatetime(appt.appointment_date);
    setDate(d);
    setTime(t);
    setVetId(appt.vet_id || "");
    setRoomId(appt.room_id != null ? String(appt.room_id) : "");
    setDuration(appt.duration_mins || 30);
    setNotes(appt.notes || "");
    setError("");
  }, [appt]);

  const handleClose = () => { setError(""); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) { setError("Please select a date."); return; }
    setSubmitting(true);
    setError("");

    const body = {
      appointment_date: `${date} ${time}:00`,
      duration_mins:    durationMins,
      vet_user_id:      vetId  || null,
      room_id:          roomId ? parseInt(roomId, 10) : null,
      notes:            notes  || null,
    };

    try {
      await apiFetch(`/appointments/${appt.id}`, { method: "PATCH", body });
      onRescheduled();
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.responseData?.conflicts)) {
        setError(formatConflictErrors(err.responseData.conflicts));
      } else {
        setError(err.message || "Failed to reschedule.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !appt) return null;

  const proc = PROCEDURES.find(p => p.id === appt.procedure_type) || PROCEDURES[0];

  return (
    <div onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "oklch(0.25 0.025 50 / 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "modal-fade 160ms ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: 22, border: "1px solid var(--border)", boxShadow: "0 40px 80px -24px oklch(0.3 0.08 40 / 0.4)", animation: "modal-pop 220ms cubic-bezier(.2,1,.4,1) both", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Clinic › Reschedule</div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 500, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>Reschedule Appointment</h2>
          </div>
          <button onClick={handleClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Patient summary (read-only) */}
        <div style={{ padding: "16px 26px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "color-mix(in oklch, var(--ink) 3%, transparent)" }}>
            <span style={{ fontSize: 22 }}>{proc.icon}</span>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{appt.pet?.name}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>
                {proc.label} · {appt.owner?.first_name} {appt.owner?.last_name}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1, padding: "16px 26px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="New date" required>
              <FocusInput type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} required/>
            </Field>
            <Field label="New time" required>
              <FocusInput type="time" step={1800} value={time} onChange={e => setTime(e.target.value)} style={inputStyle} required/>
            </Field>
          </div>

          <Field label="Duration" hint={maxDuration < 240 ? `Max ${maxDuration} min — next appt at ${fmtTime(startMins + maxDuration)}` : "minutes"}>
            <FocusInput
              type="number" min={5} max={maxDuration} step={5}
              value={durationMins}
              onChange={e => setDuration(Math.min(Number(e.target.value), maxDuration))}
              style={{ ...inputStyle, borderColor: durationMins >= maxDuration && maxDuration < 240 ? "oklch(0.75 0.13 55)" : undefined }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Attending Vet" hint="Optional">
              <FocusSelect value={vetId} onChange={e => setVetId(e.target.value)} style={selectStyle}>
                <option value="">— Unassigned —</option>
                {vets.map(v => (
                  <option key={v._vetId} value={v._vetId}>{v.name}</option>
                ))}
              </FocusSelect>
            </Field>
            <Field label="Room" hint="Optional">
              <FocusSelect value={roomId} onChange={e => setRoomId(e.target.value)} style={selectStyle}>
                <option value="">— Unassigned —</option>
                {rooms.map(r => (
                  <option key={r._roomId} value={r._roomId}>{r.name}</option>
                ))}
              </FocusSelect>
            </Field>
          </div>

          <Field label="Notes">
            <FocusTextarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Special instructions…"
              style={textareaStyle}
              rows={3}
            />
          </Field>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 30)", border: "1px solid oklch(0.88 0.06 30)", color: "oklch(0.45 0.16 30)", fontFamily: "Inter, sans-serif", fontSize: 13.5, animation: "lc-fade 200ms ease both", whiteSpace: "pre-line" }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "16px 26px 22px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button type="button" onClick={handleClose} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Discard
          </button>
          <button
            type="button"
            disabled={submitting || !date}
            onClick={handleSubmit}
            style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: submitting || !date ? "color-mix(in oklch, var(--primary) 50%, var(--surface))" : "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: submitting || !date ? "not-allowed" : "pointer", boxShadow: !date ? "none" : "0 8px 22px -10px var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 160ms ease" }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "lc-spin 0.9s linear infinite" }}><path d="M12 3a9 9 0 1 0 9 9"/></svg>
                Saving…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                Confirm reschedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
