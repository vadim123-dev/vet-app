import React, { useState, useRef, useEffect } from "react";
import { TeyaLogo } from "./TeyaLogo";

const ALL_TABS = [
  { id: "dashboard",    label: "Dashboard22",          icon: "home",     roles: ["admin", "vet", "coordinator"] },
  { id: "owners",       label: "Pet Owners",        icon: "user",     roles: ["admin", "vet", "coordinator"] },
  { id: "patients",     label: "Patients",          icon: "paw",      roles: ["admin", "vet", "coordinator"] },
  { id: "appointments", label: "Appointments",      icon: "calendar", roles: ["admin", "coordinator"] },
  { id: "billing",      label: "Billing",           icon: "money",    roles: ["admin", "coordinator"] },
  { id: "users",        label: "User Management",   icon: "users",    roles: ["admin"] },
];

// eslint-disable-next-line react-refresh/only-export-components -- tab config intentionally co-located
export function getTabsForRole(roles = []) {
  return ALL_TABS.filter(t => t.roles.some(r => roles.includes(r)));
}

export const NAV_TABS = ALL_TABS;

function NavIcon({ name, size = 18, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home":
      return <svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></svg>;
    case "user":
      return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "users":
      return <svg {...p}><circle cx="9" cy="7" r="3"/><path d="M3 21c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="7" r="3"/><path d="M21 21c0-3.5-2-5.5-4-6"/></svg>;
    case "paw":
      return <svg {...p}><ellipse cx="12" cy="16" rx="4.5" ry="3.5"/><ellipse cx="6" cy="11" rx="1.7" ry="2.3"/><ellipse cx="18" cy="11" rx="1.7" ry="2.3"/><ellipse cx="9" cy="6.5" rx="1.5" ry="2"/><ellipse cx="15" cy="6.5" rx="1.5" ry="2"/></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "pill":
      return <svg {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)"/><path d="M9 7l6 10"/></svg>;
    case "money":
      return <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M5 9.5h.01M19 15.5h.01"/></svg>;
    case "gear":
      return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    default: return null;
  }
}

export { NavIcon };

const ROLE_LABELS = {
  admin:       "Administrator",
  vet:         "Veterinarian",
  coordinator: "Coordinator",
  customer:    "Customer",
};

function roleLabel(roles = []) {
  for (const r of ["admin", "vet", "coordinator"]) {
    if (roles.includes(r)) return ROLE_LABELS[r];
  }
  return "Staff";
}

export default function TopNav({ active, onChange, onLogout, user, shiftCheckedIn, onShiftToggle }) {
  const roles     = user?.roles || [];
  const staffName = user ? `${user.first_name} ${user.last_name}` : "Staff";
  const staffRole = roleLabel(roles);
  const tabs      = getTabsForRole(roles);
  const initials  = staffName.split(" ").map(p => p[0]).join("").slice(0, 2);

  const [menuOpen, setMenuOpen] = useState(false);
  const chipRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!chipRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 10,
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 28px",
      display: "flex", alignItems: "center", gap: 24,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <TeyaLogo size={40} primary="#b85c2e" accent="#e8a87c" ink="#3a2418" surface="#fff8f0" />
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            Teya<span style={{ color: "var(--primary)" }}>Vet</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>
            Clinic dashboard
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center" }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 12,
                border: "none", cursor: "pointer",
                background: isActive ? "color-mix(in oklch, var(--primary) 14%, transparent)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--ink)",
                fontFamily: "Inter, sans-serif", fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: "nowrap",
                transition: "background 140ms ease, color 140ms ease",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "color-mix(in oklch, var(--ink) 5%, transparent)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <NavIcon name={t.icon} size={17} color={isActive ? "var(--primary)" : "var(--ink)"} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Staff chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button aria-label="Notifications" style={{
          width: 38, height: 38, borderRadius: 11,
          background: "color-mix(in oklch, var(--ink) 4%, transparent)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)", position: "relative",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/>
            <path d="M10.3 21a2 2 0 0 0 3.4 0"/>
          </svg>
          <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, background: "var(--primary)", border: "2px solid var(--surface)" }} />
        </button>

        <button aria-label="Settings" style={{
          width: 38, height: 38, borderRadius: 11,
          background: "color-mix(in oklch, var(--ink) 4%, transparent)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)",
        }}>
          <NavIcon name="gear" size={17} />
        </button>

        <div ref={chipRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 4px 4px", borderRadius: 12, background: menuOpen ? "color-mix(in oklch, var(--ink) 8%, transparent)" : "color-mix(in oklch, var(--ink) 4%, transparent)", border: "none", cursor: "pointer", transition: "background 140ms ease" }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "color-mix(in oklch, var(--primary) 70%, var(--accent))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600 }}>
              {initials}
            </div>
            <div style={{ lineHeight: 1.2, whiteSpace: "nowrap", textAlign: "left" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{staffName}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>{staffRole}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 160ms ease", transform: menuOpen ? "rotate(180deg)" : "none" }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 180, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 12px 32px -10px oklch(0.3 0.08 40 / 0.25)", padding: "6px", zIndex: 50, animation: "lc-fade 140ms ease both" }}>
              <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{staffName}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{staffRole}</div>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onShiftToggle?.(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: "none", cursor: "pointer", color: shiftCheckedIn ? "oklch(0.40 0.13 150)" : "oklch(0.35 0.12 240)", fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500, textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = shiftCheckedIn ? "oklch(0.95 0.04 150)" : "oklch(0.95 0.03 240)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {shiftCheckedIn ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    Check out of shift
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    Check in to shift
                  </>
                )}
              </button>
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <button
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: "none", cursor: "pointer", color: "oklch(0.45 0.16 30)", fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500, textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "oklch(0.96 0.03 30)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
