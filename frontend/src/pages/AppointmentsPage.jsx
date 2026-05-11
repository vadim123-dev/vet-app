import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../api";
import NewAppointmentModal from "./NewAppointmentModal";
import RescheduleModal from "./RescheduleModal";

// ─── Procedure catalogue (durations come from the API; this provides labels/colours) ─

const PROCEDURES = {
  wellness:  { label: "Wellness exam",    tone: "oklch(0.85 0.07 150)", icon: "❤️" },
  vaccine:   { label: "Vaccination",      tone: "oklch(0.86 0.08 60)",  icon: "💉" },
  surgery:   { label: "Surgery",          tone: "oklch(0.82 0.10 30)",  icon: "🩺" },
  dental:    { label: "Dental cleaning",  tone: "oklch(0.85 0.08 280)", icon: "🦷" },
  bloodwork: { label: "Bloodwork / Lab",  tone: "oklch(0.85 0.07 220)", icon: "🧪" },
  followup:  { label: "Follow-up",        tone: "oklch(0.88 0.05 90)",  icon: "📋" },
  grooming:  { label: "Drop-off + groom", tone: "oklch(0.88 0.06 330)", icon: "✂️" },
  emergency: { label: "Emergency",        tone: "oklch(0.80 0.20 25)",  icon: "🚨" },
};

// Colours assigned per resource index
const VET_COLORS  = ["oklch(0.6 0.14 38)", "oklch(0.55 0.13 220)", "oklch(0.58 0.12 280)"];
const ROOM_COLORS = {
  exam: ["oklch(0.65 0.10 150)", "oklch(0.65 0.10 180)"],
  lab:  ["oklch(0.65 0.13 290)"],
};

// ─── Scheduler constants ──────────────────────────────────────────────────────

const DAY_START  = 8 * 60;   // 08:00
const DAY_END    = 23 * 60;  // 23:00
const SLOT_MINS  = 30;
const PX_PER_MIN = 1.6;      // 30 min = 48 px

function minsOfDay(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function nowMins() {
  // Use Intl to read the browser's configured local timezone rather than the
  // OS default, which on Linux is often UTC regardless of physical location.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === "hour")?.value  ?? "0", 10) % 24;
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}


function isoDate(d) {
  // d is a Date object; returns "YYYY-MM-DD" in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`;
}
function fmtDateLong(d) {
  return d.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
}
function fmtDateMed(d) {
  return d.toLocaleDateString("en-US", { month:"long", day:"numeric" });
}

// ─── Build resource list from API response ─────────────────────────────────────
// Layout: one column per vet, then one column per lab room. Exam/surgery rooms
// are NOT separate columns — they are shown as a subtitle inside the vet column.

function buildResources(vets, rooms) {
  const examRooms    = rooms.filter(r => r.room_type === "exam");
  const surgeryRooms = rooms.filter(r => r.room_type === "surgery");
  const labRooms     = rooms.filter(r => r.room_type === "lab");

  const resources = [];

  // One column per vet, paired with one exam room by index
  vets.forEach((v, i) => {
    const examRoom = examRooms[i] || null;
    resources.push({
      id:            `v-${v.id}`,
      name:          `Dr. ${v.first_name} ${v.last_name}`,
      role:          "vet",
      subtitle:      examRoom ? examRoom.name : "Exam room",
      color:         VET_COLORS[i % VET_COLORS.length],
      _vetId:        v.id,
      _roomId:       null,
      _examRoomId:   examRoom?.id   ?? null,
      _examRoomName: examRoom?.name ?? null,
    });
  });

  // Surgery column
  surgeryRooms.forEach(r => resources.push({
    id: `r-${r.id}`, name: r.name, role: "surgery", subtitle: null,
    color: "oklch(0.82 0.10 30)", _vetId: null, _roomId: r.id,
    _examRoomId: null, _examRoomName: null,
  }));

  // Lab column
  labRooms.forEach((r, i) => {
    const palette = ROOM_COLORS.lab || ROOM_COLORS.exam;
    resources.push({
      id: `r-${r.id}`, name: r.name, role: "lab", subtitle: null,
      color: palette[i % palette.length], _vetId: null, _roomId: r.id,
      _examRoomId: null, _examRoomName: null,
    });
  });

  return resources;
}

// Each appointment produces exactly ONE block:
// vet assigned → vet's column (room shown inside block)
// no vet but lab room → lab column
function apptToBlocks(appt) {
  const start = minsOfDay(appt.appointment_date);
  const base = {
    apptId:      appt.id,
    linked:      null,
    start,
    durationMins: appt.duration_mins,
    proc:        appt.procedure_type,
    patient:     appt.pet.name,
    owner:       appt.owner.last_name,
    roomName:    appt.room_name || null,
    status:      appt.status,
    raw:         appt,
  };
  if (appt.vet_id) {
    return [{ ...base, id: `${appt.id}-vet`, resourceId: `v-${appt.vet_id}` }];
  }
  if (appt.room_id != null) {
    return [{ ...base, id: `${appt.id}-room`, resourceId: `r-${appt.room_id}` }];
  }
  return [{ ...base, id: `${appt.id}-unassigned`, resourceId: null }];
}

// ─── Overlapping block layout ─────────────────────────────────────────────────
// Assigns each block a lane (sub-column) so simultaneous appointments sit side-by-side.

function assignLanes(blocks) {
  if (blocks.length <= 1) return blocks.map(b => ({ ...b, laneIndex: 0, laneCount: 1 }));
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const laneEnds = []; // laneEnds[i] = when lane i next becomes free
  const withLane = sorted.map(b => {
    const bEnd = b.start + b.durationMins;
    let lane = laneEnds.findIndex(end => end <= b.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(bEnd); }
    else laneEnds[lane] = bEnd;
    return { ...b, laneIndex: lane, _bEnd: bEnd };
  });
  // laneCount = max simultaneous overlaps for each block's time window
  return withLane.map(b => ({
    ...b,
    laneCount: withLane.filter(o => o.start < b._bEnd && o._bEnd > b.start).length,
  }));
}

// Find the best vet for a walk-in emergency:
// Priority 1 — completely free right now
// Priority 2 — busy but not in surgery
// Priority 3 — any vet
function findBestVetForEmergency(appts, resources, nowMin) {
  const vets = resources.filter(r => r.role === "vet");
  const ongoingAppts = appts.filter(a => {
    const s = minsOfDay(a.appointment_date);
    return a.status !== "cancelled" && s <= nowMin && s + (a.duration_mins || 30) > nowMin;
  });
  const busyVetIds    = new Set(ongoingAppts.map(a => a.vet_id).filter(Boolean));
  const surgeryVetIds = new Set(ongoingAppts.filter(a => a.procedure_type === "surgery").map(a => a.vet_id).filter(Boolean));
  return (
    vets.find(v => !busyVetIds.has(v._vetId)) ||
    vets.find(v => !surgeryVetIds.has(v._vetId)) ||
    vets[0] || null
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotCell({ mins, onClick, isPast }) {
  const [hovered, setHovered] = useState(false);
  const borderTop = mins % 60 === 0
    ? "1px solid var(--border)"
    : "1px dashed color-mix(in oklch,var(--border) 55%,transparent)";

  if (isPast) {
    return (
      <div style={{
        height: SLOT_MINS * PX_PER_MIN,
        borderTop,
        background: "color-mix(in oklch, var(--ink) 3.5%, transparent)",
        cursor: "default",
      }}/>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Book at ${fmtTime(mins)}`}
      style={{
        height: SLOT_MINS * PX_PER_MIN,
        borderTop,
        cursor: "cell",
        background: hovered ? "color-mix(in oklch, var(--primary) 6%, transparent)" : "transparent",
        transition: "background 100ms ease",
        position: "relative",
      }}
    >
      {hovered && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--primary)", pointerEvents: "none", whiteSpace: "nowrap", background: "color-mix(in oklch, var(--primary) 12%, var(--surface))", padding: "2px 8px", borderRadius: 6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          {fmtTime(mins)}
        </div>
      )}
    </div>
  );
}

function ApptBlock({ block, onClick, isHighlighted, laneIndex = 0, laneCount = 1 }) {
  const proc = PROCEDURES[block.proc] || PROCEDURES.wellness;
  const top    = (block.start - DAY_START) * PX_PER_MIN;
  const height = block.durationMins * PX_PER_MIN - 4;
  const isPast    = block.status === "completed";
  const isWaiting = block.status === "waiting";
  const isEmergency = block.proc === "emergency";
  const pct  = 100 / laneCount;
  const posStyle = laneCount === 1
    ? { left: 4, right: 4 }
    : { left: `calc(${laneIndex * pct}% + 3px)`, right: `calc(${(laneCount - laneIndex - 1) * pct}% + 3px)` };
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(block); }}
      style={{
        position: "absolute", top, height,
        ...posStyle,
        background: isPast ? `color-mix(in oklch, ${proc.tone} 60%, var(--surface))` : proc.tone,
        color: "oklch(0.25 0.05 40)",
        borderRadius: 10,
        border: isEmergency
          ? "2px solid oklch(0.55 0.22 25)"
          : `1.5px solid ${isHighlighted ? "var(--primary)" : "color-mix(in oklch, var(--ink) 10%, transparent)"}`,
        boxShadow: isEmergency
          ? "0 0 0 3px color-mix(in oklch, oklch(0.55 0.22 25) 25%, transparent)"
          : isHighlighted ? "0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent)" : "0 1px 0 color-mix(in oklch, var(--ink) 8%, transparent) inset",
        padding: "5px 8px", textAlign: "left", cursor: "pointer",
        fontFamily: "Inter, sans-serif", overflow: "hidden",
        display: "flex", flexDirection: "column", gap: 2,
        opacity: isPast ? 0.75 : 1,
        transition: "box-shadow 140ms ease, transform 140ms ease",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.015)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600 }}>
        <span>{proc.icon}</span>
        <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{proc.label}</span>
        {isPast    && <span style={{ marginLeft:"auto", fontSize:9, opacity:0.7 }}>done</span>}
        {isWaiting && <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:"oklch(0.38 0.13 150)", background:"color-mix(in oklch, oklch(0.75 0.13 150) 22%, transparent)", padding:"1px 5px", borderRadius:5 }}>✓ in</span>}
      </div>
      <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
        {block.patient} <span style={{ fontWeight:400, opacity:0.7 }}>· {block.owner}</span>
      </div>
      {block.roomName && (
        <div style={{ fontSize:10.5, opacity:0.6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {block.roomName}
        </div>
      )}
      <div style={{ fontSize:11, opacity:0.65, marginTop:"auto" }}>
        {fmtTime(block.start)}–{fmtTime(block.start + block.durationMins)}
      </div>
    </button>
  );
}

function NowLine({ now }) {
  if (now < DAY_START || now > DAY_END) return null;
  const top = (now - DAY_START) * PX_PER_MIN;
  return (
    <div style={{ position:"absolute", top, left:0, right:0, zIndex:3, pointerEvents:"none" }}>
      {/* Time label inside the 60px label column */}
      <div style={{ position:"absolute", left:0, width:56, top:-9, textAlign:"right", paddingRight:5, fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:700, color:"var(--primary)", letterSpacing:"0.02em" }}>
        {fmtTime(now)}
      </div>
      {/* Dot at the column boundary */}
      <div style={{ position:"absolute", left:55, top:-5, width:10, height:10, borderRadius:5, background:"var(--primary)", boxShadow:"0 0 0 3px color-mix(in oklch, var(--primary) 28%, transparent)" }}/>
      {/* Red line across all resource columns */}
      <div style={{ position:"absolute", left:60, right:0, top:-1, borderTop:"2px solid var(--primary)" }}/>
    </div>
  );
}

function ApptDetailPopover({ block, resources, onClose, onReschedule, onCancelled }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState("");

  // Reset confirmation state whenever the block changes
  useEffect(() => { setConfirmCancel(false); setCancelling(false); setCancelError(""); }, [block]);

  if (!block) return null;
  const proc = PROCEDURES[block.proc] || PROCEDURES.wellness;
  const appt = block.raw;

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      await apiFetch(`/appointments/${appt.id}`, { method: "PATCH", body: { status: "cancelled" } });
      onCancelled();
    } catch (err) {
      setCancelError(err.message || "Could not cancel.");
      setCancelling(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100, background:"oklch(0.25 0.025 50 / 0.35)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"modal-fade 160ms ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"var(--surface)", borderRadius:22, border:"1px solid var(--border)", padding:28, boxShadow:"0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", animation:"modal-pop 220ms cubic-bezier(.2,1,.4,1) both" }}>

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div>
            <span style={{ display:"inline-block", padding:"4px 10px", borderRadius:8, background:proc.tone, fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"oklch(0.3 0.05 40)" }}>{proc.icon} {proc.label}</span>
            <h2 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:26, fontWeight:500, color:"var(--ink)", margin:"10px 0 0", letterSpacing:"-0.01em" }}>{appt.pet.name}</h2>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--muted)", marginTop:2 }}>Owner: {appt.owner.first_name} {appt.owner.last_name}</div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", color:"var(--ink)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ marginTop:20, fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:8 }}>Schedule</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {appt.vet_id && (() => {
            const r = resources.find(x => x._vetId === appt.vet_id);
            return r ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"color-mix(in oklch, var(--ink) 3%, transparent)" }}>
                <div style={{ width:8, height:28, borderRadius:3, background:r.color, flexShrink:0 }}/>
                <div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, color:"var(--ink)" }}>{r.name}</div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)" }}>{fmtTime(minsOfDay(appt.appointment_date))} – {fmtTime(minsOfDay(appt.appointment_date) + appt.duration_mins)} ({appt.duration_mins} min)</div>
                </div>
              </div>
            ) : null;
          })()}
          {appt.room_id != null && (() => {
            const r = resources.find(x => x._roomId === appt.room_id);
            return r ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"color-mix(in oklch, var(--ink) 3%, transparent)" }}>
                <div style={{ width:8, height:28, borderRadius:3, background:r.color, flexShrink:0 }}/>
                <div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, color:"var(--ink)" }}>{r.name}</div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)" }}>{fmtTime(minsOfDay(appt.appointment_date))} – {fmtTime(minsOfDay(appt.appointment_date) + appt.duration_mins)}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {appt.notes && (
          <div style={{ marginTop:16, padding:"10px 12px", borderRadius:10, background:"color-mix(in oklch, var(--ink) 3%, transparent)", fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--ink)", lineHeight:1.5, fontStyle:"italic" }}>
            "{appt.notes}"
          </div>
        )}

        {/* Cancel confirmation banner */}
        {confirmCancel && (
          <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:"oklch(0.96 0.03 30)", border:"1px solid oklch(0.88 0.06 30)", fontFamily:"Inter, sans-serif", fontSize:13.5 }}>
            <div style={{ color:"oklch(0.38 0.13 30)", fontWeight:600, marginBottom:8 }}>Cancel this appointment?</div>
            {cancelError && <div style={{ color:"oklch(0.45 0.16 30)", marginBottom:8 }}>{cancelError}</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{ height:36, padding:"0 16px", borderRadius:9, border:"none", background:"oklch(0.5 0.16 25)", color:"white", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, cursor:cancelling?"not-allowed":"pointer", opacity:cancelling?0.7:1, display:"flex", alignItems:"center", gap:6 }}
              >
                {cancelling && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" style={{ animation:"lc-spin 0.9s linear infinite" }}><path d="M12 3a9 9 0 1 0 9 9"/></svg>}
                Yes, cancel it
              </button>
              <button onClick={() => { setConfirmCancel(false); setCancelError(""); }} style={{ height:36, padding:"0 16px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, cursor:"pointer" }}>
                Go back
              </button>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:22 }}>
          <button style={{ flex:1, height:40, borderRadius:11, border:"none", background:"var(--primary)", color:"white", fontFamily:"Inter, sans-serif", fontSize:13.5, fontWeight:600, cursor:"pointer" }}>Open patient record</button>
          <button
            onClick={() => { onReschedule(appt); }}
            style={{ height:40, padding:"0 14px", borderRadius:11, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, cursor:"pointer" }}
          >Reschedule</button>
          {!confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              style={{ height:40, padding:"0 14px", borderRadius:11, border:"1px solid var(--border)", background:"var(--surface)", color:"oklch(0.5 0.16 25)", fontFamily:"Inter, sans-serif", fontSize:13, cursor:"pointer" }}
            >Cancel Appointment</button>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div style={{ padding:"10px 12px", borderRadius:10, background:"color-mix(in oklch, var(--ink) 3%, transparent)" }}>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:10.5, color:"var(--muted)", fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:22, fontWeight:500, color:tone === "primary" ? "var(--primary)" : "var(--ink)", lineHeight:1.1, marginTop:2 }}>{value}</div>
    </div>
  );
}

function SkeletonGrid({ numCols }) {
  const slots = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT_MINS) slots.push(m);
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden", opacity:0.5 }}>
      <div style={{ display:"grid", gridTemplateColumns:`60px repeat(${numCols||2}, minmax(140px,1fr))`, borderBottom:"1px solid var(--border)", padding:"14px 0" }}>
        <div/>
        {Array.from({length:numCols||2}).map((_,i)=>(
          <div key={i} style={{ borderLeft:"1px solid var(--border)", padding:"0 10px" }}>
            <div style={{ height:14, borderRadius:7, background:"color-mix(in oklch,var(--ink) 8%,transparent)", width:80, animation:"lc-fade 1.2s ease infinite alternate" }}/>
          </div>
        ))}
      </div>
      <div style={{ height: (DAY_END-DAY_START)*PX_PER_MIN }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage({ walkIn = false, onWalkInHandled, onWalkInDismissed, patients = [] }) {
  const [view,         setView]         = useState("day");
  const [selectedBlock,setSelectedBlock]= useState(null);
  const [_hoveredGroup, _setHoveredGroup] = useState(null);
  const [, setTick]    = useState(0);
  const now = nowMins();
  const [bookingOpen,    setBookingOpen]    = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const isWalkInBooking = useRef(false);

  const openBooking = (prefill = null) => {
    setBookingPrefill(prefill);
    setBookingOpen(true);
  };

  // Resources (vets + rooms) — fetched once
  const [resources,    setResources]    = useState([]);
  const [resLoading,   setResLoading]   = useState(true);

  // Appointments for the selected date
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [appts,        setAppts]        = useState([]);
  const [apptLoading,  setApptLoading]  = useState(true);
  const [apptError,    setApptError]    = useState(null);

  // Derived: one block per appointment
  const blocks = appts.flatMap(apptToBlocks);

  // Force re-render every 30 s so now-line and past-slot shading stay current
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch resources once
  useEffect(() => {
    apiFetch("/appointments/resources")
      .then(d => setResources(buildResources(d.vets, d.rooms)))
      .catch(() => {})
      .finally(() => setResLoading(false));
  }, []);

  // Fetch appointments whenever date changes
  const fetchAppts = useCallback((date) => {
    setApptLoading(true);
    setApptError(null);
    apiFetch(`/appointments/?date=${isoDate(date)}`)
      .then(d => setAppts(Array.isArray(d) ? d : []))
      .catch(e => setApptError(e.message))
      .finally(() => setApptLoading(false));
  }, []);

  useEffect(() => { fetchAppts(selectedDate); }, [selectedDate, fetchAppts]);

  // Walk-in: auto-open emergency booking once today's data is ready
  useEffect(() => {
    if (!walkIn || resLoading || apptLoading) return;
    const now = nowMins();
    const best = findBestVetForEmergency(appts, resources, now);
    isWalkInBooking.current = true;
    openBooking({
      date:      new Date(),
      time:      now,
      vetId:     best?._vetId,
      procedure: "emergency",
    });
    onWalkInHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fire once when loading clears, not on every appts/resources update
  }, [walkIn, resLoading, apptLoading]);

  const goDay = (delta) => setSelectedDate(d => {
    const next = new Date(d);
    next.setDate(next.getDate() + delta);
    return next;
  });

  const slots = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT_MINS) slots.push(m);

  const completed  = appts.filter(a => a.status === "completed").length;
  const upcoming   = appts.filter(a => a.status === "scheduled").length;
  const isToday    = isoDate(selectedDate) === isoDate(new Date());

  const iconBtn = { width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontSize:18, lineHeight:1, cursor:"pointer", fontFamily:"Inter, sans-serif", display:"flex", alignItems:"center", justifyContent:"center" };

  return (
    <div style={{ padding:"32px 28px 80px", maxWidth:1600, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Clinic › Schedule</div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:38, fontWeight:500, color:"var(--ink)", margin:0, letterSpacing:"-0.015em", lineHeight:1.05 }}>Appointments</h1>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:14.5, color:"var(--muted)", margin:"8px 0 0" }}>
            {fmtDateLong(selectedDate)} · {resources.filter(r=>r.role==="vet").length} vets on shift · {appts.length} appointment{appts.length!==1?"s":""} {isToday?"today":"this day"}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", border:"1.5px solid var(--border)", borderRadius:12, overflow:"hidden", background:"var(--surface)" }}>
            {["day","week","list"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ height:40, padding:"0 16px", border:"none", background:view===v ? "color-mix(in oklch,var(--primary) 14%,var(--surface))" : "transparent", color:view===v ? "var(--primary)" : "var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:view===v?600:500, cursor:"pointer", textTransform:"capitalize" }}>{v}</button>
            ))}
          </div>
          <button onClick={() => openBooking({ date: selectedDate })} style={{ height:44, padding:"0 18px", borderRadius:12, background:"var(--primary)", color:"white", border:"none", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 22px -10px var(--primary)", whiteSpace:"nowrap" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New appointment
          </button>
        </div>
      </div>

      {/* Date strip */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, padding:"10px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14 }}>
        <button onClick={() => goDay(-1)} style={iconBtn}>‹</button>
        <button onClick={() => setSelectedDate(new Date())} style={{ height:32, padding:"0 14px", borderRadius:8, border:"1px solid var(--border)", background:isToday?"color-mix(in oklch,var(--primary) 12%,var(--surface))":  "var(--surface)", color:isToday?"var(--primary)":"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>Today</button>
        <button onClick={() => goDay(1)} style={iconBtn}>›</button>
        <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:20, fontWeight:500, color:"var(--ink)", letterSpacing:"-0.01em" }}>{fmtDateMed(selectedDate)}</div>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>{selectedDate.getFullYear()}</div>
        <div style={{ flex:1 }}/>
        {apptLoading
          ? <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)" }}>Loading…</span>
          : <div style={{ display:"flex", gap:14, fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)" }}>
              <span>📅 {appts.length} booked</span>
              <span>✅ {completed} done</span>
              <span>🕐 {upcoming} upcoming</span>
            </div>
        }
      </div>

      {apptError && (
        <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:12, background:"oklch(0.96 0.03 30)", border:"1px solid oklch(0.88 0.06 30)", color:"oklch(0.45 0.16 30)", fontFamily:"Inter, sans-serif", fontSize:14 }}>
          Could not load appointments: {apptError}
        </div>
      )}

      {view === "day" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 280px", gap:18, alignItems:"flex-start" }}>

          {/* ── Scheduler grid ── */}
          {resLoading || apptLoading
            ? <SkeletonGrid numCols={resources.length}/>
            : (
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"auto", boxShadow:"0 8px 24px -16px oklch(0.3 0.08 40 / 0.2)" }}>
              {/* Resource header */}
              <div style={{ display:"grid", gridTemplateColumns:`60px repeat(${resources.length},minmax(140px,1fr))`, borderBottom:"1px solid var(--border)", background:"color-mix(in oklch,var(--ink) 2%,var(--surface))", position:"sticky", top:0, zIndex:4 }}>
                <div/>
                {resources.map(r => (
                  <div key={r.id} style={{ padding:"12px 10px", borderLeft:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:4, background:r.color, flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, fontWeight:600, color:"var(--ink)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</div>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:10, color:"var(--muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {r.subtitle || r.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div style={{ display:"grid", gridTemplateColumns:`60px repeat(${resources.length},minmax(140px,1fr))`, position:"relative" }}>
                {/* Time labels */}
                <div>
                  {slots.map(m => (
                    <div key={m} style={{ height:SLOT_MINS*PX_PER_MIN, position:"relative", fontFamily:"Inter, sans-serif", fontSize:10.5, color:"var(--muted)", paddingRight:8, textAlign:"right", borderTop:m%60===0?"1px solid var(--border)":"1px dashed color-mix(in oklch,var(--border) 55%,transparent)" }}>
                      {m%60===0 && <span style={{ position:"absolute", top: m===DAY_START ? 3 : -7, right:8, background:"var(--surface)", padding:"0 4px" }}>{fmtTime(m)}</span>}
                    </div>
                  ))}
                </div>

                {/* Resource columns */}
                {resources.map(r => (
                  <div key={r.id} style={{ position:"relative", borderLeft:"1px solid var(--border)" }}>
                    {slots.map(m => (
                      <SlotCell key={m} mins={m} isPast={isToday && m < now} onClick={() => openBooking({
                        date:      selectedDate,
                        time:      m,
                        vetId:     r.role === "vet" ? r._vetId       : undefined,
                        roomId:    r.role === "vet" ? r._examRoomId  : r._roomId,
                        procedure: r.role === "surgery" ? "surgery"
                                 : r.role === "lab"     ? "bloodwork"
                                 : undefined,
                      })}/>
                    ))}
                    {assignLanes(blocks.filter(b => b.resourceId === r.id)).map(b => (
                      <ApptBlock
                        key={b.id}
                        block={b}
                        onClick={setSelectedBlock}
                        isHighlighted={false}
                        laneIndex={b.laneIndex}
                        laneCount={b.laneCount}
                      />
                    ))}
                  </div>
                ))}

                {/* Now-line overlay */}
                {isToday && (
                  <div style={{ position:"absolute", left:0, right:0, top:0, bottom:0, pointerEvents:"none" }}>
                    <NowLine now={now}/>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Side rail ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14, position:"sticky", top:84 }}>
            {/* Stats */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:16 }}>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>
                {isToday ? "Today at a glance" : fmtDateMed(selectedDate)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <MiniStat label="Booked"     value={appts.length} />
                <MiniStat label="Completed"  value={completed} />
                <MiniStat label="Upcoming"   value={upcoming}  tone="primary" />
                <MiniStat label="Vets on"    value={resources.filter(r=>r.role==="vet").length} />
              </div>
            </div>

            {/* Procedure legend */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:16 }}>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Procedure types</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {Object.entries(PROCEDURES).map(([k,p]) => (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", borderRadius:7, background:p.tone, fontFamily:"Inter, sans-serif", fontSize:11, color:"oklch(0.3 0.05 40)" }}>
                    <span>{p.icon}</span>
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1 }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource key */}
            {resources.length > 0 && (
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:16 }}>
                <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Resources</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {resources.map(r => (
                    <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:4, background:r.color, flexShrink:0 }}/>
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--ink)" }}>{r.name}</span>
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"var(--muted)", marginLeft:"auto", textTransform:"capitalize" }}>{r.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "week" && (
        <div style={{ background:"var(--surface)", border:"1px dashed var(--border)", borderRadius:18, padding:"80px 32px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:24, fontWeight:500, color:"var(--ink)" }}>Week view</div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--muted)", marginTop:6 }}>Column-per-resource layout compressed across 7 days — coming soon.</div>
        </div>
      )}
      {view === "list" && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:700, color:"var(--ink)", textTransform:"uppercase", letterSpacing:"0.03em" }}>
            {fmtDateLong(selectedDate)} — {appts.length} appointment{appts.length!==1?"s":""}
          </div>
          {appts.length === 0
            ? <div style={{ padding:"40px", textAlign:"center", fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--muted)", fontStyle:"italic" }}>No appointments for this day.</div>
            : appts.map((a,i) => {
              const proc = PROCEDURES[a.procedure_type] || PROCEDURES.wellness;
              const start = minsOfDay(a.appointment_date);
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", borderBottom:i<appts.length-1?"1px solid var(--border)":"none", background:a.status==="completed"?"color-mix(in oklch,var(--ink) 2%,transparent)":"transparent" }}>
                  <div style={{ width:44, textAlign:"right", fontFamily:"'Fraunces', Georgia, serif", fontSize:15, fontWeight:500, color:"var(--muted)", flexShrink:0 }}>{fmtTime(start)}</div>
                  <div style={{ width:4, height:40, borderRadius:2, background:proc.tone, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, color:"var(--ink)" }}>{a.pet.name} <span style={{ fontWeight:400, color:"var(--muted)" }}>· {a.owner.first_name} {a.owner.last_name}</span></div>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)", marginTop:2 }}>{proc.icon} {proc.label} · {a.duration_mins} min{a.vet_name ? ` · ${a.vet_name}` : ""}{ a.room_name ? ` · ${a.room_name}` : ""}</div>
                  </div>
                  <span style={{ padding:"3px 10px", borderRadius:8, background:a.status==="completed"?"color-mix(in oklch,oklch(0.75 0.13 150) 20%,transparent)":"color-mix(in oklch,var(--primary) 14%,transparent)", color:a.status==="completed"?"oklch(0.38 0.13 150)":"var(--primary)", fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, flexShrink:0 }}>
                    {a.status === "completed" ? "Done" : "Scheduled"}
                  </span>
                </div>
              );
            })
          }
        </div>
      )}

      <ApptDetailPopover
        block={selectedBlock}
        resources={resources}
        onClose={() => setSelectedBlock(null)}
        onReschedule={(appt) => { setSelectedBlock(null); setRescheduleAppt(appt); }}
        onCancelled={() => { setSelectedBlock(null); fetchAppts(selectedDate); }}
      />

      <NewAppointmentModal
        open={bookingOpen}
        prefill={bookingPrefill}
        resources={resources}
        patients={patients}
        onClose={() => {
          setBookingOpen(false);
          if (isWalkInBooking.current) {
            isWalkInBooking.current = false;
            onWalkInDismissed?.();
          }
        }}
        onCreated={() => {
          isWalkInBooking.current = false;
          setBookingOpen(false);
          fetchAppts(selectedDate);
        }}
      />

      <RescheduleModal
        open={rescheduleAppt !== null}
        appt={rescheduleAppt}
        resources={resources}
        onClose={() => setRescheduleAppt(null)}
        onRescheduled={() => { setRescheduleAppt(null); fetchAppts(selectedDate); }}
      />
    </div>
  );
}
