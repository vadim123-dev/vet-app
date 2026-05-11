import React, { useState, useEffect, useRef, useMemo } from "react";
import { apiFetch } from "../api";

const TYPE_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐰", parrot: "🦜", reptile: "🦎", other: "🐾" };

const PROCEDURES = {
  wellness:  { label: "Wellness",    icon: "❤️",  tone: "oklch(0.85 0.07 150)" },
  vaccine:   { label: "Vaccination", icon: "💉",  tone: "oklch(0.86 0.08 60)"  },
  surgery:   { label: "Surgery",     icon: "🩺",  tone: "oklch(0.82 0.10 30)"  },
  dental:    { label: "Dental",      icon: "🦷",  tone: "oklch(0.85 0.08 280)" },
  bloodwork: { label: "Bloodwork",   icon: "🧪",  tone: "oklch(0.85 0.07 220)" },
  followup:  { label: "Follow-up",   icon: "📋",  tone: "oklch(0.88 0.05 90)"  },
  grooming:  { label: "Grooming",    icon: "✂️",  tone: "oklch(0.88 0.06 330)" },
  emergency: { label: "Emergency",   icon: "🚨",  tone: "oklch(0.80 0.20 25)"  },
};

function fmtApptTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtApptTimeRange(isoStr, durationMins) {
  if (!isoStr) return "—";
  const start = new Date(isoStr);
  const end   = new Date(start.getTime() + durationMins * 60000);
  const fmt   = t => t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ── Pet avatar chip ────────────────────────────────────────────────────────────

function PetChip({ patient, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
        borderRadius: 10, cursor: "pointer",
        border: `1.5px solid ${selected ? "var(--primary)" : "var(--border)"}`,
        background: selected ? "color-mix(in oklch, var(--primary) 10%, var(--surface))" : "var(--surface)",
        transition: "all 120ms ease",
      }}
    >
      <span style={{ fontSize: 18 }}>{TYPE_EMOJI[patient.type_code] || "🐾"}</span>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: selected ? 600 : 500, color: selected ? "var(--primary)" : "var(--ink)" }}>
        {patient.name}
      </span>
    </button>
  );
}

// ── Search result row ──────────────────────────────────────────────────────────

function ResultRow({ patient, todayAppt, onClick }) {
  const proc = todayAppt ? (PROCEDURES[todayAppt.procedure_type] || PROCEDURES.wellness) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer",
        textAlign: "left", transition: "background 80ms",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in oklch, var(--primary) 5%, transparent)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "color-mix(in oklch, var(--accent) 35%, var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {TYPE_EMOJI[patient.type_code] || "🐾"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
          {patient.name}
          <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {patient.owner_first_name} {patient.owner_last_name}</span>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {patient.type_name}{patient.breed ? ` · ${patient.breed}` : ""}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {todayAppt ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>{proc.icon}</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
              {fmtApptTime(todayAppt.appointment_date)}
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", fontStyle: "italic" }}>No appt today</span>
        )}
      </div>
    </button>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function CheckInModal({ open, onClose, patients = [], owners = [], onCheckedIn }) {
  const [todayAppts, setTodayAppts] = useState([]);
  const [query,           setQuery]           = useState("");
  const [selected,        setSelected]        = useState(null); // patient object
  const [activePetId,     setActivePetId]     = useState(null);
  const [checkingIn,      setCheckingIn]      = useState(false);
  const [checkedIn,       setCheckedIn]       = useState(false);
  const inputRef = useRef(null);

  // Reset + fetch today's appointments when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
      setActivePetId(null);
      setCheckingIn(false);
      setCheckedIn(false);
      setTimeout(() => inputRef.current?.focus(), 60);
      apiFetch(`/appointments/?date=${todayIso()}`)
        .then(d => setTodayAppts(Array.isArray(d) ? d : []))
        .catch(() => setTodayAppts([]));
    }
  }, [open]);

  // Live search results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(p => {
      const ownerFull = `${p.owner_first_name} ${p.owner_last_name}`.toLowerCase();
      const ownerObj  = owners.find(o => o.user_name === p.owner_user_name);
      const phone     = (ownerObj?.telephone || "").replace(/\D/g, "");
      return (
        p.name.toLowerCase().includes(q) ||
        ownerFull.includes(q) ||
        phone.includes(q.replace(/\D/g, ""))
      );
    }).slice(0, 8);
  }, [query, patients, owners]);

  // Today's appointment for a given patient
  const apptFor = (patient) =>
    todayAppts.find(a => a.pet.id === patient.id || (a.pet.name === patient.name && a.owner.last_name === patient.owner_last_name)) || null;

  // All pets for the selected patient's owner
  const siblingsFor = (patient) =>
    patients.filter(p => p.owner_user_name === patient.owner_user_name);

  const handleSelect = (patient) => {
    setSelected(patient);
    setActivePetId(patient.id);
  };

  const activePet     = selected && activePetId !== selected.id
    ? patients.find(p => p.id === activePetId) || selected
    : selected;
  const todayAppt     = activePet ? apptFor(activePet) : null;
  const ownerSiblings = activePet ? siblingsFor(activePet) : [];

  const tooEarly = todayAppt && (() => {
    const apptTime = new Date(todayAppt.appointment_date);
    return (apptTime - new Date()) > 15 * 60 * 1000;
  })();

  const handleArrived = async () => {
    if (!todayAppt) return;
    setCheckingIn(true);
    try {
      await apiFetch(`/appointments/${todayAppt.id}`, { method: "PATCH", body: { status: "waiting" } });
      setCheckedIn(true);
      onCheckedIn?.({
        apptId:    todayAppt.id,
        petName:   activePet.name,
        ownerName: `${activePet.owner_first_name} ${activePet.owner_last_name}`,
        vetName:   todayAppt.vet_name,
        time:      fmtApptTime(todayAppt.appointment_date),
      });
    } finally {
      setCheckingIn(false);
    }
  };

  if (!open) return null;

  const proc = todayAppt ? (PROCEDURES[todayAppt.procedure_type] || PROCEDURES.wellness) : null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.25 0.025 50 / 0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, padding: "80px 24px 24px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: 22, border: "1px solid var(--border)", boxShadow: "0 40px 80px -20px oklch(0.3 0.08 40 / 0.35)", overflow: "hidden" }}
      >

        {/* ── State: checked in ── */}
        {checkedIn ? (
          <div style={{ padding: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "color-mix(in oklch, oklch(0.75 0.13 150) 18%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 500, color: "var(--ink)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {activePet.name} has arrived
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--muted)", margin: "0 0 24px" }}>
              {activePet.owner_first_name} {activePet.owner_last_name} · {todayAppt?.vet_name} · {fmtApptTime(todayAppt?.appointment_date)}
            </p>
            <button onClick={onClose} style={{ width: "100%", height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 22px -10px var(--primary)" }}>
              Done
            </button>
          </div>
        ) : selected ? (
          /* ── State 2: Match found ── */
          <div>
            {/* Back + header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 0" }}>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
              </button>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Check-in</span>
              <div style={{ flex: 1 }} />
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
              </button>
            </div>

            {/* Pet picker (multiple pets for owner) */}
            {ownerSiblings.length > 1 && (
              <div style={{ padding: "14px 20px 0" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  {activePet.owner_first_name}'s pets — select who's here
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ownerSiblings.map(p => (
                    <PetChip key={p.id} patient={p} selected={p.id === activePetId} onClick={() => setActivePetId(p.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Pet card */}
            <div style={{ margin: "16px 20px 0", padding: "16px", borderRadius: 16, background: "color-mix(in oklch, var(--accent) 20%, var(--surface))", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "color-mix(in oklch, var(--accent) 40%, var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
                {TYPE_EMOJI[activePet.type_code] || "🐾"}
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{activePet.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                  {activePet.type_name}{activePet.breed ? ` · ${activePet.breed}` : ""}
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginTop: 1 }}>
                  Owner: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{activePet.owner_first_name} {activePet.owner_last_name}</strong>
                </div>
              </div>
            </div>

            {/* Appointment details or no-appt message */}
            <div style={{ margin: "14px 20px 0" }}>
              {todayAppt ? (
                <div style={{ borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: proc.tone, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{proc.icon}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "oklch(0.22 0.04 40)" }}>{proc.label}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "oklch(0.35 0.04 40)", marginLeft: "auto" }}>
                      {fmtApptTimeRange(todayAppt.appointment_date, todayAppt.duration_mins)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {[
                      ["Vet",      todayAppt.vet_name || "Unassigned"],
                      ["Room",     todayAppt.room_name || "TBD"],
                      ["Duration", `${todayAppt.duration_mins} min`],
                      ["Status",   todayAppt.status === "waiting" ? "Waiting" : "Scheduled"],
                    ].map(([label, value], i) => (
                      <div key={label} style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--ink)", marginTop: 3, fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius: 14, border: "1px solid var(--border)", padding: "16px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No appointment today</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)" }}>
                    Proceed as a walk-in or use Emergency Booking to create a slot.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: "16px 20px 20px", display: "flex", gap: 8 }}>
              {todayAppt && todayAppt.status !== "waiting" && tooEarly ? (
                <div style={{ flex: 1, height: 44, borderRadius: 12, background: "color-mix(in oklch, oklch(0.78 0.15 80) 18%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.78 0.15 80) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "oklch(0.42 0.13 75)" }}>
                  ⏰ Appointment not yet due
                </div>
              ) : todayAppt && todayAppt.status !== "waiting" ? (
                <button
                  onClick={handleArrived}
                  disabled={checkingIn}
                  style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: checkingIn ? "wait" : "pointer", opacity: checkingIn ? 0.7 : 1, boxShadow: "0 8px 22px -10px var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {checkingIn ? "Checking in…" : "✓ Patient arrived"}
                </button>
              ) : todayAppt?.status === "waiting" ? (
                <div style={{ flex: 1, height: 44, borderRadius: 12, background: "color-mix(in oklch, oklch(0.75 0.13 150) 18%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.75 0.13 150) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "oklch(0.38 0.12 150)" }}>
                  ✅ Already checked in
                </div>
              ) : (
                <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Close
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── State 1: Search ── */
          <div>
            <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Patient check-in</span>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 52, borderRadius: 14, border: "1.5px solid var(--primary)", background: "color-mix(in oklch, var(--primary) 4%, var(--surface))", boxShadow: "0 0 0 3px color-mix(in oklch, var(--primary) 12%, transparent)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Look up patient or owner…"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "Inter, sans-serif", fontSize: 16, color: "var(--ink)" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div style={{ borderTop: query ? "1px solid var(--border)" : "none", maxHeight: 380, overflowY: "auto" }}>
              {query && results.length === 0 && (
                <div style={{ padding: "24px 20px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--muted)", textAlign: "center", fontStyle: "italic" }}>
                  No patients or owners found for "{query}"
                </div>
              )}
              {results.map(p => (
                <ResultRow
                  key={p.id}
                  patient={p}
                  todayAppt={apptFor(p)}
                  onClick={() => handleSelect(p)}
                />
              ))}
            </div>

            {!query && (() => {
              const now = new Date();
              const sorted = [...todayAppts]
                .filter(a => a.status !== "cancelled" && a.status !== "waiting" && a.status !== "completed")
                .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

              if (sorted.length === 0) return (
                <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 32 }}>📋</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--muted)", textAlign: "center" }}>
                    No appointments scheduled for today
                  </div>
                </div>
              );

              return (
                <div>
                  <div style={{ padding: "8px 20px 6px", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Today's schedule — {sorted.length} appointment{sorted.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", maxHeight: 340, overflowY: "auto" }}>
                    {sorted.map(appt => {
                      const patient = patients.find(p => p.id === appt.pet.id);
                      const proc    = PROCEDURES[appt.procedure_type] || PROCEDURES.wellness;
                      const start   = new Date(appt.appointment_date);
                      const isPast  = start < now;
                      const isNow   = start <= now && new Date(start.getTime() + appt.duration_mins * 60000) > now;

                      return (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={() => patient && handleSelect(patient)}
                          disabled={!patient}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 14,
                            padding: "11px 20px", background: "transparent", border: "none",
                            borderBottom: "1px solid color-mix(in oklch, var(--border) 60%, transparent)",
                            cursor: patient ? "pointer" : "default", textAlign: "left",
                            opacity: isPast && !isNow ? 0.55 : 1,
                            transition: "background 80ms",
                          }}
                          onMouseEnter={e => { if (patient) e.currentTarget.style.background = "color-mix(in oklch, var(--primary) 5%, transparent)"; }}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {/* Time column */}
                          <div style={{ width: 54, flexShrink: 0, textAlign: "right" }}>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: isNow ? "var(--primary)" : "var(--ink)" }}>
                              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                            </div>
                            {isNow && (
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Now</div>
                            )}
                          </div>

                          {/* Procedure icon */}
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: proc.tone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            {proc.icon}
                          </div>

                          {/* Patient info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {appt.pet.name}
                              <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {appt.owner.first_name} {appt.owner.last_name}</span>
                            </div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                              {proc.label} · {appt.vet_name || "Unassigned"}{appt.room_name ? ` · ${appt.room_name}` : ""}
                            </div>
                          </div>

                          {/* Status badge */}
                          <div style={{ flexShrink: 0 }}>
                            {appt.status === "waiting" ? (
                              <span style={{ padding: "3px 9px", borderRadius: 20, background: "color-mix(in oklch, oklch(0.75 0.13 150) 18%, transparent)", color: "oklch(0.38 0.12 150)", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600 }}>
                                Waiting
                              </span>
                            ) : appt.status === "completed" ? (
                              <span style={{ padding: "3px 9px", borderRadius: 20, background: "color-mix(in oklch, var(--ink) 8%, transparent)", color: "var(--muted)", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600 }}>
                                Done
                              </span>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
