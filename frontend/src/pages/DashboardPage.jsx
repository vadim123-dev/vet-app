import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../api";

// ─── Procedure catalogue ─────────────────────────────────────────────────────

const PROCEDURES = {
  wellness:  { label: "Wellness",    tone: "oklch(0.85 0.07 150)", icon: "❤️"  },
  vaccine:   { label: "Vaccination", tone: "oklch(0.86 0.08 60)",  icon: "💉"  },
  surgery:   { label: "Surgery",     tone: "oklch(0.82 0.10 30)",  icon: "🩺"  },
  dental:    { label: "Dental",      tone: "oklch(0.85 0.08 280)", icon: "🦷"  },
  bloodwork: { label: "Bloodwork",   tone: "oklch(0.85 0.07 220)", icon: "🧪"  },
  followup:  { label: "Follow-up",   tone: "oklch(0.88 0.05 90)",  icon: "📋"  },
  grooming:  { label: "Grooming",    tone: "oklch(0.88 0.06 330)", icon: "✂️"  },
};

// ─── Static mock data (modules not yet backed by API) ────────────────────────

const DASH_BOARDERS = [
  { id: "b1", name: "Tank",     emoji: "🐕", room: "Ward 1",     reason: "Post-op observation", caretaker: "Tech: Lila",   status: "stable"     },
  { id: "b2", name: "Pepper",   emoji: "🐱", room: "ICU",        reason: "IV fluids — kidney",  caretaker: "Dr. Reyes",   status: "monitoring" },
  { id: "b3", name: "Cinnamon", emoji: "🐱", room: "Ward 2",     reason: "Dental recovery",     caretaker: "Tech: Marco", status: "ready-soon" },
  { id: "b4", name: "Buddy",    emoji: "🐕", room: "Boarding A", reason: "5-night boarding",    caretaker: "Tech: Lila",  status: "stable"     },
];

const DASH_STAFF = [
  { id: "s1", name: "Dr. Sam Reyes",  role: "Veterinarian",   initials: "SR", shift: "8a–4p",      color: "oklch(0.6 0.14 38)",  status: "in-room"      },
  { id: "s2", name: "Dr. Diane Park", role: "Veterinarian",   initials: "DP", shift: "10a–6p",     color: "oklch(0.55 0.13 220)", status: "available"    },
  { id: "s3", name: "Lila Okonkwo",   role: "Vet technician", initials: "LO", shift: "8a–4p",      color: "oklch(0.65 0.1 150)", status: "with-boarder" },
  { id: "s4", name: "Marco Greene",   role: "Vet technician", initials: "MG", shift: "10a–6p",     color: "oklch(0.65 0.1 180)", status: "available"    },
  { id: "s5", name: "Jess Tanaka",    role: "Front desk",     initials: "JT", shift: "7:30a–4p",   color: "oklch(0.65 0.13 290)", status: "available"   },
  { id: "s6", name: "Priya Mehta",    role: "Front desk",     initials: "PM", shift: "back 12:30p", color: "oklch(0.7 0.05 60)",  status: "off"          },
];

const DASH_REMINDERS = [
  { id: "rm1", icon: "💉", note: "Rabies booster — 10 days overdue", patient: "Cinnamon", owner: "Rossi",     priority: "overdue" },
  { id: "rm2", icon: "💉", note: "DHPP vaccine — 15 days overdue",   patient: "Pepper",   owner: "Iyer",      priority: "overdue" },
  { id: "rm3", icon: "📞", note: "Lyme titer recheck due",           patient: "Buddy",    owner: "Park",      priority: "overdue" },
  { id: "rm4", icon: "📞", note: "Call re: Kiwi diet plan",          patient: "Kiwi",     owner: "Müller",    priority: "today"   },
  { id: "rm5", icon: "📞", note: "Share lab results with owner",     patient: "Lemon",    owner: "Fernandez", priority: "today"   },
  { id: "rm6", icon: "💉", note: "Bordetella — due in 6 days",       patient: "Biscuit",  owner: "Hernandez", priority: "soon"    },
];

const DASH_INVENTORY = [
  { id: "i1", item: "Rabies vaccine (1ml)",  onHand: 3,  par: 12, status: "low",      eta: "Tomorrow"  },
  { id: "i2", item: "Carprofen 75mg",        onHand: 1,  par: 4,  status: "low",      eta: "Apr 28"    },
  { id: "i3", item: "IV catheter 22g",       onHand: 0,  par: 20, status: "out",      eta: "Today 3pm" },
  { id: "i4", item: "Surgical gloves M",     onHand: 8,  par: 24, status: "low",      eta: "On order"  },
  { id: "i5", item: "Tramadol 50mg",         onHand: 12, par: 20, status: "expiring", eta: "Exp May 3" },
];

const DASH_ACTIVITY = [
  { id: "ac1", at: "11:18", who: "Jess",         verb: "checked in",     what: "Mochi",    detail: "Dr. Park · 11:30"          },
  { id: "ac2", at: "10:52", who: "Dr. Park",     verb: "completed",      what: "Wellness", detail: "Cinnamon Rossi"             },
  { id: "ac3", at: "10:40", who: "Lila",         verb: "logged vitals",  what: "Pepper",   detail: "ICU"                        },
  { id: "ac4", at: "10:12", who: "Owner portal", verb: "requested",      what: "Vaccine",  detail: "Biscuit · Hernandez"        },
  { id: "ac5", at: "9:45",  who: "Dr. Reyes",    verb: "discharged",     what: "Tank",     detail: "Post-op instructions sent"  },
  { id: "ac6", at: "9:22",  who: "Marco",        verb: "started labs",   what: "Roo",      detail: "Lab"                        },
  { id: "ac7", at: "9:00",  who: "Jess",         verb: "checked in",     what: "Olive",    detail: "Dr. Reyes · 9:00"           },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function nowMins() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function apptStartMins(appt) {
  const tp = (appt.appointment_date || "").replace("T", " ").split(" ")[1] || "";
  const [h, m] = tp.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmtTimeMins(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`;
}

function fmtDateLong(d) {
  return d.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buildLanes(vets, rooms) {
  const VET_COLORS  = ["oklch(0.6 0.14 38)", "oklch(0.55 0.13 220)", "oklch(0.58 0.12 280)"];
  const ROOM_COLORS = ["oklch(0.65 0.10 150)", "oklch(0.65 0.10 180)", "oklch(0.65 0.13 290)"];
  const lanes = [];
  vets.forEach((v, i) => lanes.push({
    id: `v-${v.id}`, label: `Dr. ${v.first_name} ${v.last_name}`,
    vetId: v.id, roomId: null, color: VET_COLORS[i % VET_COLORS.length],
  }));
  rooms.forEach((r, i) => lanes.push({
    id: `r-${r.id}`, label: r.name,
    vetId: null, roomId: r.id, color: ROOM_COLORS[i % ROOM_COLORS.length],
  }));
  return lanes;
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function DashCard({ title, eyebrow, action, children, accent, padding = 20 }) {
  return (
    <section style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 18, padding,
      boxShadow: "0 8px 24px -20px oklch(0.3 0.08 40 / 0.25)",
      display: "flex", flexDirection: "column", gap: 14,
      position: "relative", overflow: "hidden",
    }}>
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />}
      {(title || action) && (
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingTop: accent ? 6 : 0 }}>
          <div>
            {eyebrow && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 500, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>
                {title}
              </h3>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function DashSeeAll({ label = "See all", onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", padding: 0, cursor: "pointer",
      fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600,
      color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      {label}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  );
}

function DashPill({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "color-mix(in oklch, var(--ink) 6%, transparent)",            fg: "var(--muted)"        },
    primary: { bg: "color-mix(in oklch, var(--primary) 14%, transparent)",       fg: "var(--primary)"      },
    green:   { bg: "color-mix(in oklch, oklch(0.65 0.13 150) 18%, transparent)", fg: "oklch(0.4 0.13 150)" },
    amber:   { bg: "color-mix(in oklch, oklch(0.85 0.16 90) 22%, transparent)",  fg: "oklch(0.45 0.13 80)" },
    red:     { bg: "color-mix(in oklch, oklch(0.7 0.18 25) 22%, transparent)",   fg: "oklch(0.45 0.18 25)" },
  };
  const t = map[tone] || map.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600,
      padding: "3px 9px", borderRadius: 999,
      background: t.bg, color: t.fg, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function HeroTile({ label, value, hint, tone = "neutral" }) {
  const colorMap = {
    neutral: "var(--ink)", primary: "var(--primary)",
    green: "oklch(0.4 0.13 150)", amber: "oklch(0.45 0.13 80)", red: "oklch(0.45 0.18 25)",
  };
  return (
    <div style={{
      flex: "1 1 130px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 500, color: colorMap[tone] || colorMap.neutral, lineHeight: 1.05, letterSpacing: "-0.01em" }}>{value}</div>
      {hint && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", lineHeight: 1.3 }}>{hint}</div>}
    </div>
  );
}

// ─── Next 4-hour timeline ─────────────────────────────────────────────────────

function NextUpTimeline({ appts, lanes, rooms, now }) {
  const PX      = 3.5;
  const LABEL_W = 148;
  const start   = Math.floor(now / 60) * 60;
  const end     = start + 4 * 60;
  const W       = (end - start) * PX;
  const nowX    = (now - start) * PX;

  const vetLanes = lanes.filter(l => l.vetId !== null);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ minWidth: W + LABEL_W + 16 }}>
        {/* Hour labels */}
        <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px ${W}px`, marginBottom: 8 }}>
          <div />
          <div style={{ position: "relative", height: 18 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: i * 60 * PX, fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                {fmtTimeMins(start + i * 60)}
              </div>
            ))}
          </div>
        </div>

        {vetLanes.map(lane => {
          const blocks = appts.filter(a => {
            const s = apptStartMins(a);
            if (a.status === "cancelled") return false;
            if (s + (a.duration_mins || 30) <= start || s >= end) return false;
            return a.vet_id === lane.vetId;
          });

          const roomIds    = [...new Set(blocks.map(a => a.room_id).filter(Boolean))];
          const roomLabels = roomIds.map(id => rooms.find(r => r.id === id)?.name).filter(Boolean);
          const roomSub    = roomLabels.join(", ") || null;

          return (
            <div key={lane.id} style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px ${W}px`, marginBottom: 6, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: lane.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lane.label}
                  </div>
                  {roomSub && (
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 500, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                      {roomSub}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ position: "relative", height: 38, background: "color-mix(in oklch, var(--ink) 3%, transparent)", borderRadius: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: i * 60 * PX, top: 0, bottom: 0, width: 1, background: "color-mix(in oklch, var(--ink) 7%, transparent)" }} />
                ))}
                {nowX >= 0 && nowX <= W && (
                  <div style={{ position: "absolute", left: nowX, top: -4, bottom: -4, width: 2, background: "var(--primary)", borderRadius: 2, zIndex: 3 }} />
                )}
                {blocks.map(a => {
                  const proc = PROCEDURES[a.procedure_type] || PROCEDURES.wellness;
                  const s    = apptStartMins(a);
                  const left = Math.max(0, (s - start) * PX);
                  const w    = Math.max(100, Math.min(W - left, (a.duration_mins || 30) * PX) - 3);
                  return (
                    <div key={a.id} style={{
                      position: "absolute", left, top: 3, height: 32, width: w,
                      background: proc.tone, borderRadius: 7,
                      padding: "0 8px", display: "flex", alignItems: "center", gap: 5,
                      border: "1px solid color-mix(in oklch, var(--ink) 8%, transparent)",
                    }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>{proc.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "oklch(0.25 0.05 40)", whiteSpace: "nowrap" }}>
                          {a.pet.name}
                        </div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "oklch(0.35 0.04 50)", whiteSpace: "nowrap" }}>
                          {fmtTimeMins(s)} · {a.owner.last_name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Check-in queue ───────────────────────────────────────────────────────────

function CheckinQueue({ appts }) {
  const arrived = [...appts]
    .filter(a => a.status === "waiting")
    .sort((a, b) => apptStartMins(a) - apptStartMins(b));

  if (arrived.length === 0) {
    return (
      <div style={{ padding: "20px 10px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--muted)", textAlign: "center", fontStyle: "italic" }}>
        No patients in the waiting room
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {arrived.map(a => (
        <div key={a.id} style={{
          display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12,
          padding: "10px 10px", borderRadius: 10,
          background: "color-mix(in oklch, oklch(0.75 0.13 150) 10%, transparent)",
          borderLeft: "3px solid oklch(0.65 0.13 150)",
          marginBottom: 2,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {a.pet.name}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {a.owner.first_name} {a.owner.last_name}</span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {a.vet_name || "Unassigned"} · {fmtTimeMins(apptStartMins(a))}
            </div>
          </div>
          <DashPill tone="green">Arrived</DashPill>
        </div>
      ))}
    </div>
  );
}

// ─── Boarders ─────────────────────────────────────────────────────────────────

const TYPE_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐰", parrot: "🦜", reptile: "🦎", other: "🐾" };
const HOSP_STATUS = {
  stable:     ["Stable",      "green"  ],
  monitoring: ["Monitoring",  "amber"  ],
  critical:   ["Critical",    "red"    ],
  ready:      ["Ready",       "primary"],
};

function BoardersList({ boarders, loading }) {
  if (loading) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", padding: "12px 0" }}>Loading…</div>
  );
  if (!boarders.length) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", fontStyle: "italic", padding: "4px 0" }}>No patients currently hospitalized</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {boarders.map(b => {
        const [label, tone] = HOSP_STATUS[b.status] || ["Stable", "neutral"];
        return (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in oklch, var(--accent) 40%, var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {TYPE_EMOJI[b.pet_type] || "🐾"}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                {b.pet_name} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {b.room}</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>{b.reason} · {b.caretaker}</div>
            </div>
            <DashPill tone={tone}>{label}</DashPill>
          </div>
        );
      })}
    </div>
  );
}

// ─── Staff on shift ───────────────────────────────────────────────────────────

const ROLE_AVATAR_COLORS = ["oklch(0.6 0.14 38)", "oklch(0.55 0.13 220)", "oklch(0.58 0.12 280)", "oklch(0.62 0.12 150)", "oklch(0.60 0.13 60)"];
const ROLE_LABEL = { admin: "Administrator", vet: "Veterinarian", coordinator: "Coordinator" };

function roleDisplay(roles = []) {
  for (const r of ["vet", "admin", "coordinator"]) {
    if (roles.includes(r)) return ROLE_LABEL[r] || r;
  }
  return "Staff";
}

function avatarColor(name = "") {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % ROLE_AVATAR_COLORS.length;
  return ROLE_AVATAR_COLORS[idx];
}

function fmtCheckinTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function StaffOnShift({ staff, loading }) {
  if (loading) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", padding: "12px 0" }}>Loading…</div>
  );
  if (!staff.length) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", fontStyle: "italic", padding: "4px 0" }}>No staff checked in yet today</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {staff.map(s => {
        const initials = `${s.first_name[0]}${s.last_name[0]}`;
        const checkedOut = !!s.checked_out_at;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0", opacity: checkedOut ? 0.55 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(s.first_name), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {s.roles.includes("vet") ? `Dr. ${s.first_name} ${s.last_name}` : `${s.first_name} ${s.last_name}`}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>
                {roleDisplay(s.roles)} · in {fmtCheckinTime(s.checked_in_at)}{checkedOut ? ` · out ${fmtCheckinTime(s.checked_out_at)}` : ""}
              </div>
            </div>
            <DashPill tone={checkedOut ? "neutral" : "green"}>{checkedOut ? "Left" : "In"}</DashPill>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reminders ────────────────────────────────────────────────────────────────

const TYPE_ICON = { vaccine: "💉", call: "📞", followup: "📋", general: "🔔" };
const PRIORITY_SM = { overdue: ["Overdue", "red"], today: ["Today", "amber"], soon: ["Soon", "neutral"] };

function RemindersList({ reminders, loading }) {
  if (loading) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", padding: "12px 0" }}>Loading…</div>
  );
  if (!reminders.length) return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", fontStyle: "italic", padding: "4px 0" }}>No pending reminders</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reminders.map(r => {
        const [label, tone] = PRIORITY_SM[r.priority] || ["Soon", "neutral"];
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "color-mix(in oklch, var(--ink) 4%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {TYPE_ICON[r.type] || "🔔"}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{r.note}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                {r.pet_name}{r.owner ? ` · ${r.owner}` : ""}
              </div>
            </div>
            <DashPill tone={tone}>{label}</DashPill>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

function InventoryList() {
  const sm = { out: ["Out", "red", "oklch(0.65 0.18 25)"], low: ["Low", "amber", "oklch(0.75 0.14 70)"], expiring: ["Expiring", "neutral", "oklch(0.65 0.05 80)"] };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {DASH_INVENTORY.map(i => {
        const [label, tone, trackColor] = sm[i.status] || sm.low;
        const pct = Math.min(100, Math.round((i.onHand / i.par) * 100));
        return (
          <div key={i.id} style={{ padding: "2px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 500, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.item}</div>
              <DashPill tone={tone}>{label}</DashPill>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: "color-mix(in oklch, var(--ink) 6%, transparent)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: trackColor, transition: "width 400ms ease" }} />
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{i.onHand}/{i.par} · {i.eta}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

function ActivityFeed({ extra = [] }) {
  const entries = [...extra, ...DASH_ACTIVITY].slice(0, 10);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((a, i) => (
        <div key={a.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid color-mix(in oklch, var(--border) 60%, transparent)" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0, width: 46, paddingTop: 1 }}>{a.at}</div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)" }}>
              <span style={{ fontWeight: 600 }}>{a.who}</span>
              <span style={{ color: "var(--muted)" }}> {a.verb} </span>
              <span style={{ fontWeight: 500 }}>{a.what}</span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "var(--muted)" }}>{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage({ user, onNavigate, onCheckIn, activityFeed = [], refreshKey = 0 }) {
  const roles  = user?.roles || [];
  const isVet  = roles.includes("vet");

  const [, setTick] = useState(0);
  const now = nowMins();
  const [currentUser, setCurrentUser] = useState(user || null);
  const [appts,       setAppts]       = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [vets,        setVets]        = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [boarders,    setBoarders]    = useState([]);
  const [boardersLoading, setBoardersLoading] = useState(true);
  const [reminders,   setReminders]   = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [staff,       setStaff]       = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const DEFAULT_ORDER = ["checkin", "hospitalized", "reminders", "whosin"];
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_ORDER);
  const [dragIdx,     setDragIdx]     = useState(null);
  const [overIdx,     setOverIdx]     = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) {
      apiFetch("/users/current")
        .then(d => setCurrentUser(d?.user || d))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only fetch; re-running on user change would clobber local state
  }, []);

  useEffect(() => {
    apiFetch("/appointments/resources")
      .then(d => { setVets(d.vets || []); setRooms(d.rooms || []); })
      .catch(() => {});
    apiFetch("/appointments/hospitalizations")
      .then(d => setBoarders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setBoardersLoading(false));
    apiFetch("/appointments/reminders")
      .then(d => setReminders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
    apiFetch("/shifts/today")
      .then(d => setStaff(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setStaffLoading(false));
    apiFetch("/dashboard/layout")
      .then(d => { if (Array.isArray(d?.widget_order)) setWidgetOrder(d.widget_order); })
      .catch(() => {});
    setApptLoading(true);
    apiFetch(`/appointments/?date=${isoDateToday()}`)
      .then(d => setAppts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setApptLoading(false));
  }, [refreshKey]);

  const vetResource = useMemo(() => {
    if (!isVet || !vets.length || !user?.user_name) return null;
    return vets.find(v => v.user_name === user.user_name) || null;
  }, [isVet, vets, user]);

  const visibleAppts = useMemo(() => {
    if (!isVet || !vetResource) return appts;
    return appts.filter(a => a.vet_id === vetResource.id);
  }, [appts, isVet, vetResource]);

  const lanes = useMemo(() => buildLanes(vets, rooms), [vets, rooms]);

  const { total, onSite, expected, nextAppt } = useMemo(() => {
    const active = visibleAppts.filter(a => a.status !== "cancelled");
    const total  = active.length;
    const onSite = active.filter(a => {
      if (a.status === "waiting") return true;
      if (a.status !== "scheduled") return false;
      const s = apptStartMins(a);
      return s <= now && s + (a.duration_mins || 30) > now;
    }).length;
    const expected = active.filter(a => a.status === "scheduled" && apptStartMins(a) > now).length;

    const nextAppt = active
      .filter(a => a.status === "scheduled" && apptStartMins(a) > now)
      .sort((a, b) => apptStartMins(a) - apptStartMins(b))[0] || null;
    return { total, onSite, expected, nextAppt };
  }, [visibleAppts, now]);

  const firstName = currentUser?.first_name || currentUser?.user_name || "there";
  const today     = new Date();

  const navBtn = (primary) => ({
    height: 40, padding: "0 16px", borderRadius: 11,
    border: primary ? "none" : "1px solid var(--border)",
    background: primary ? "var(--primary)" : "var(--surface)",
    color: primary ? "white" : "var(--ink)",
    fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
    boxShadow: primary ? "0 8px 22px -10px var(--primary)" : "none", whiteSpace: "nowrap",
    transition: "opacity 120ms ease",
  });

  const nextProc = nextAppt ? (PROCEDURES[nextAppt.procedure_type] || PROCEDURES.wellness) : null;

  const saveOrder = (order) => {
    apiFetch("/dashboard/layout", { method: "PUT", body: { widget_order: order } }).catch(() => {});
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...widgetOrder];
    const [removed] = next.splice(dragIdx, 1);
    next.splice(idx, 0, removed);
    setWidgetOrder(next);
    saveOrder(next);
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const GRIP = (
    <div style={{ cursor: "grab", color: "var(--muted)", display: "flex", alignItems: "center", padding: "2px 0" }} title="Drag to rearrange">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/></svg>
    </div>
  );

  const WIDGET_CONTENT_HEIGHT = 260;

  const renderWidget = (id, idx) => {
    const dragging  = dragIdx === idx;
    const isTarget  = overIdx === idx && dragIdx !== idx;
    const cardStyle = {
      opacity:   dragging ? 0.45 : 1,
      outline:   isTarget ? "2px dashed var(--primary)" : "none",
      outlineOffset: 2,
      transition: "opacity 120ms ease",
    };
    switch (id) {
      case "checkin":
        return (
          <div key={id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd} style={cardStyle}>
            <DashCard eyebrow="Today" title="Check-in queue" action={GRIP}>
              <div style={{ height: WIDGET_CONTENT_HEIGHT, overflowY: "auto", overflowX: "hidden" }}><CheckinQueue appts={visibleAppts} /></div>
            </DashCard>
          </div>
        );
      case "hospitalized":
        return (
          <div key={id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd} style={cardStyle}>
            <DashCard eyebrow="In our care" title="Boarding & hospitalized" action={GRIP}>
              <div style={{ height: WIDGET_CONTENT_HEIGHT, overflowY: "auto" }}><BoardersList boarders={boarders} loading={boardersLoading} /></div>
            </DashCard>
          </div>
        );
      case "reminders":
        return (
          <div key={id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd} style={cardStyle}>
            <DashCard eyebrow="Reminders" title="Follow-ups due" action={GRIP}>
              <div style={{ height: WIDGET_CONTENT_HEIGHT, overflowY: "auto" }}><RemindersList reminders={reminders} loading={remindersLoading} /></div>
            </DashCard>
          </div>
        );
      case "whosin":
        return (
          <div key={id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd} style={cardStyle}>
            <DashCard eyebrow="Today" title="Who's in" action={GRIP}>
              <div style={{ height: WIDGET_CONTENT_HEIGHT, overflowY: "auto" }}><StaffOnShift staff={staff} loading={staffLoading} /></div>
            </DashCard>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ padding: "32px 28px 80px", maxWidth: 1480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          Clinic › Dashboard
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 38, fontWeight: 500, color: "var(--ink)", margin: 0, letterSpacing: "-0.015em", lineHeight: 1.05 }}>
              {getGreeting()}, <span style={{ color: "var(--primary)" }}>{firstName}</span>.
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: "var(--muted)", margin: "8px 0 0" }}>
              {fmtDateLong(today)} · {apptLoading ? "Loading…" : `${total} appointment${total !== 1 ? "s" : ""} today`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={onCheckIn} style={navBtn(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Check in patient
            </button>
            <button onClick={() => onNavigate?.("appointments", { walkIn: true })} style={{ ...navBtn(false), background: "color-mix(in oklch, oklch(0.65 0.15 25) 12%, var(--surface))", border: "1px solid color-mix(in oklch, oklch(0.65 0.15 25) 35%, var(--border))", color: "oklch(0.42 0.13 25)" }}>
              🚨 Emergency Booking
            </button>
          </div>
        </div>
      </div>

      {/* Hero tiles */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <HeroTile
          label="On-site now"
          value={onSite}
          hint={`${total} booked today`}
          tone="primary"
        />
        <HeroTile
          label="Still expected"
          value={expected}
          hint={expected === 0 ? "all seen or done" : "scheduled ahead"}
          tone="neutral"
        />
        <HeroTile
          label="Next up"
          value={nextAppt ? fmtTimeMins(apptStartMins(nextAppt)) : "—"}
          hint={nextAppt ? `${nextAppt.pet.name} · ${nextProc.label}` : "No more today"}
          tone="amber"
        />
        <HeroTile
          label="In our care"
          value={boardersLoading ? "…" : boarders.length}
          hint={boarders.filter(b => b.status === "monitoring" || b.status === "critical").length > 0
            ? `${boarders.filter(b => b.status === "monitoring" || b.status === "critical").length} monitoring`
            : "all stable"}
          tone="neutral"
        />
      </div>

      {/* Next 4-hour timeline */}
      <DashCard
        eyebrow="Next 4 hours"
        title="What's coming"
        action={<DashSeeAll label="Open scheduler" onClick={() => onNavigate?.("appointments")} />}
        accent="var(--primary)"
      >
        {apptLoading ? (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)" }}>Loading…</div>
        ) : lanes.length === 0 ? (
          <div style={{ padding: "24px 0", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--muted)", textAlign: "center", fontStyle: "italic" }}>No resources loaded</div>
        ) : (
          <NextUpTimeline appts={visibleAppts} lanes={lanes} rooms={rooms} now={now} />
        )}
      </DashCard>

      {/* Draggable 2-column widget grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        {widgetOrder.map((id, idx) => renderWidget(id, idx))}
      </div>

      {/* Static widgets below */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <DashCard eyebrow="Inventory" title="Low stock & expiring" action={<DashSeeAll label="Order" />}>
          <InventoryList />
        </DashCard>
        <DashCard eyebrow="Stream" title="Recent activity" action={<DashSeeAll label="Audit log" />}>
          <ActivityFeed extra={activityFeed} />
        </DashCard>
      </div>
    </div>
  );
}
