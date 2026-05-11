import React, { useState, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐰", parrot: "🦜", reptile: "🦎", other: "🐾" };
const TYPE_COLOR = {
  dog:     { bg: "oklch(0.92 0.05 250)", color: "oklch(0.35 0.1 250)" },
  cat:     { bg: "oklch(0.92 0.05 320)", color: "oklch(0.38 0.1 320)" },
  rabbit:  { bg: "oklch(0.92 0.05 160)", color: "oklch(0.35 0.1 160)" },
  parrot:  { bg: "oklch(0.92 0.06 140)", color: "oklch(0.35 0.12 140)" },
  reptile: { bg: "oklch(0.92 0.05 110)", color: "oklch(0.38 0.1 110)" },
  other:   { bg: "oklch(0.92 0.02 60)",  color: "oklch(0.4 0.05 60)"  },
};

// Default palette per species (no coat-color data from DB yet)
const SPECIES_PALETTE = {
  dog:     { body: "oklch(0.72 0.07 70)",  belly: "oklch(0.88 0.03 80)",  accent: "oklch(0.50 0.08 55)" },
  cat:     { body: "oklch(0.65 0.07 70)",  belly: "oklch(0.85 0.04 80)",  accent: "oklch(0.40 0.06 60)" },
  rabbit:  { body: "oklch(0.82 0.04 70)",  belly: "oklch(0.93 0.02 80)",  accent: "oklch(0.55 0.10 20)" },
  parrot:  { body: "oklch(0.70 0.14 145)", belly: "oklch(0.82 0.10 130)", accent: "oklch(0.55 0.18 25)" },
  reptile: { body: "oklch(0.72 0.07 130)", belly: "oklch(0.85 0.04 110)", accent: "oklch(0.50 0.10 100)"},
  other:   { body: "oklch(0.70 0.05 70)",  belly: "oklch(0.88 0.03 75)",  accent: "oklch(0.40 0.05 50)" },
};

// ─── Stylised pet avatar SVG ──────────────────────────────────────────────────

function PetAvatarSVG({ species, size = 44 }) {
  const p = SPECIES_PALETTE[species] || SPECIES_PALETTE.other;
  const bgFill = `color-mix(in oklch, ${p.body} 22%, oklch(0.97 0.012 70))`;
  const vb = { width: size, height: size, viewBox: "0 0 48 48", style: { display: "block" } };
  const Bg = () => <circle cx="24" cy="24" r="23" fill={bgFill} />;

  if (species === "dog") return (
    <svg {...vb}>
      <Bg />
      <path d="M12 16 Q9 22 14 26 Z" fill={p.accent} />
      <path d="M36 16 Q39 22 34 26 Z" fill={p.accent} />
      <ellipse cx="24" cy="27" rx="13" ry="11" fill={p.body} />
      <ellipse cx="24" cy="31" rx="7" ry="5" fill={p.belly} />
      <ellipse cx="24" cy="29.5" rx="1.6" ry="1.1" fill="oklch(0.2 0.01 60)" />
      <path d="M22 32 Q24 34 26 32" stroke="oklch(0.2 0.01 60)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="19" cy="24" r="1.3" fill="oklch(0.18 0.01 60)" />
      <circle cx="29" cy="24" r="1.3" fill="oklch(0.18 0.01 60)" />
      <circle cx="19.4" cy="23.6" r="0.4" fill="white" />
      <circle cx="29.4" cy="23.6" r="0.4" fill="white" />
    </svg>
  );
  if (species === "cat") return (
    <svg {...vb}>
      <Bg />
      <path d="M13 14 L17 22 L20 18 Z" fill={p.body} />
      <path d="M35 14 L31 22 L28 18 Z" fill={p.body} />
      <path d="M14 16 L17 20 L19 18 Z" fill={p.accent} opacity="0.7" />
      <path d="M34 16 L31 20 L29 18 Z" fill={p.accent} opacity="0.7" />
      <ellipse cx="24" cy="26" rx="11" ry="10" fill={p.body} />
      <path d="M19 18 L20 21 M24 17 L24 20 M29 18 L28 21" stroke={p.accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="24" cy="29.5" rx="5.5" ry="4" fill={p.belly} />
      <path d="M23 28 L25 28 L24 29.5 Z" fill="oklch(0.55 0.13 25)" />
      <ellipse cx="20" cy="25" rx="1.6" ry="1.9" fill="oklch(0.5 0.15 130)" />
      <ellipse cx="28" cy="25" rx="1.6" ry="1.9" fill="oklch(0.5 0.15 130)" />
      <rect x="19.6" y="24" width="0.7" height="2" fill="oklch(0.18 0.01 60)" />
      <rect x="27.6" y="24" width="0.7" height="2" fill="oklch(0.18 0.01 60)" />
      <path d="M14 30 L19 30 M14 32 L19 31 M34 30 L29 30 M34 32 L29 31" stroke="oklch(0.4 0.01 60)" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
  if (species === "rabbit") return (
    <svg {...vb}>
      <Bg />
      <ellipse cx="19" cy="13" rx="2.5" ry="7" fill={p.body} />
      <ellipse cx="29" cy="13" rx="2.5" ry="7" fill={p.body} />
      <ellipse cx="19" cy="14" rx="1" ry="5" fill={p.belly} />
      <ellipse cx="29" cy="14" rx="1" ry="5" fill={p.belly} />
      <circle cx="24" cy="27" r="11" fill={p.body} />
      <ellipse cx="20" cy="31" rx="3.5" ry="2.5" fill={p.belly} />
      <ellipse cx="28" cy="31" rx="3.5" ry="2.5" fill={p.belly} />
      <path d="M23 30 L25 30 L24 31.5 Z" fill="oklch(0.55 0.10 20)" />
      <circle cx="20" cy="25" r="1.2" fill="oklch(0.18 0.01 60)" />
      <circle cx="28" cy="25" r="1.2" fill="oklch(0.18 0.01 60)" />
    </svg>
  );
  if (species === "parrot") return (
    <svg {...vb}>
      <Bg />
      <ellipse cx="24" cy="28" rx="9" ry="11" fill={p.body} />
      <ellipse cx="20" cy="29" rx="4" ry="7" fill={p.accent} opacity="0.7" />
      <circle cx="24" cy="18" r="6.5" fill={p.body} />
      <path d="M24 19 L29 21 L24 22 Z" fill="oklch(0.55 0.12 60)" />
      <circle cx="22" cy="17" r="1.2" fill="oklch(0.18 0.01 60)" />
      <circle cx="22.3" cy="16.7" r="0.4" fill="white" />
      <path d="M21 12 L23 9 L25 12 Z" fill={p.accent} />
    </svg>
  );
  // reptile / other fallback
  return (
    <svg {...vb}>
      <Bg />
      <ellipse cx="24" cy="28" rx="13" ry="9" fill={p.body} />
      <path d="M14 22 L13 19 L16 22 M19 20 L18 17 L21 20 M24 19 L23 16 L26 19 M29 20 L28 17 L31 20 M34 22 L33 19 L36 22" stroke={p.accent} strokeWidth="1" fill={p.accent} />
      <ellipse cx="24" cy="32" rx="9" ry="3.5" fill={p.belly} />
      <circle cx="17" cy="27" r="1.3" fill="oklch(0.18 0.01 60)" />
      <circle cx="17.3" cy="26.7" r="0.4" fill="white" />
      <path d="M11 30 Q14 32 18 31" stroke="oklch(0.3 0.02 60)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Normal rectal temperature ranges (°C)
const TEMP_NORMAL = { dog: [37.5, 39.5], cat: [37.5, 39.5], rabbit: [38.0, 40.0], parrot: [40.0, 42.0], default: [37.5, 40.0] };

// ─── Derivation helpers ────────────────────────────────────────────────────────

function deriveHealthStatus(pet) {
  const m = pet.latest_measurement;
  if (!m || m.temperature_celsius == null) return "needs_attention";
  const temp = m.temperature_celsius;
  const [lo, hi] = TEMP_NORMAL[pet.type_code] || TEMP_NORMAL.default;
  if (temp < lo || temp > hi) return "critical";
  return "healthy";
}

function deriveNextVaccine(pet) {
  const m = pet.latest_measurement;
  if (!m) return { status: "not_scheduled" };
  const lastCheck = new Date(m.measured_at);
  const nextDue   = new Date(lastCheck);
  nextDue.setFullYear(nextDue.getFullYear() + 1);
  const days = Math.floor((nextDue - Date.now()) / 86400000);
  if (days < 0)  return { status: "overdue",  days: Math.abs(days) };
  if (days <= 30) return { status: "soon",    days };
  return { status: "ok", days };
}

function calcAge(birthDate, isEstimated) {
  if (!birthDate) return "—";
  const d = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  const label = years > 0
    ? `${years}y${rem > 0 ? ` ${rem}m` : ""}`
    : `${months}mo`;
  return isEstimated ? `~${label}` : label;
}

function fmtDate(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relDays(isoStr) {
  if (!isoStr) return null;
  const diff = Math.floor((new Date(isoStr) - Date.now()) / 86400000);
  if (diff < -365) return `${Math.floor(Math.abs(diff)/365)}yr ago`;
  if (diff < -30)  return `${Math.floor(Math.abs(diff)/30)}mo ago`;
  if (diff < -1)   return `${Math.abs(diff)}d ago`;
  if (diff === -1)  return "Yesterday";
  if (diff === 0)   return "Today";
  if (diff === 1)   return "Tomorrow";
  if (diff <= 7)    return `in ${diff}d`;
  if (diff <= 30)   return `in ${Math.floor(diff/7)}wk`;
  return `in ${Math.floor(diff/30)}mo`;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function HealthBadge({ status }) {
  const map = {
    healthy:         { bg: "color-mix(in oklch, oklch(0.75 0.13 150) 18%, transparent)", color: "oklch(0.40 0.13 150)", dot: "🟢", label: "Healthy"         },
    needs_attention: { bg: "color-mix(in oklch, oklch(0.85 0.16 90)  22%, transparent)", color: "oklch(0.45 0.13 80)",  dot: "🟡", label: "Needs attention" },
    critical:        { bg: "color-mix(in oklch, oklch(0.70 0.18 25)  22%, transparent)", color: "oklch(0.45 0.18 25)",  dot: "🔴", label: "Critical"         },
  };
  const s = map[status] || map.needs_attention;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:999, background:s.bg, color:s.color, fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, whiteSpace:"nowrap" }}>
      <span style={{ fontSize:9 }}>{s.dot}</span>
      {s.label}
    </span>
  );
}

function VaccineBadge({ vaccine }) {
  if (vaccine.status === "not_scheduled") {
    return <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)", fontStyle:"italic" }}>Not scheduled</span>;
  }
  if (vaccine.status === "overdue") {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:999, background:"color-mix(in oklch, oklch(0.65 0.18 25) 18%, transparent)", color:"oklch(0.45 0.18 25)", fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600 }}>
        ⚠️ {vaccine.days}d overdue
      </span>
    );
  }
  if (vaccine.status === "soon") {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:999, background:"color-mix(in oklch, oklch(0.78 0.15 70) 18%, transparent)", color:"oklch(0.42 0.14 65)", fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600 }}>
        in {vaccine.days}d
      </span>
    );
  }
  return (
    <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)" }}>
      in {vaccine.days}d
    </span>
  );
}

// ─── Table header cell ────────────────────────────────────────────────────────

function TH({ children, sortKey, sortBy, dir, onSort, align = "left" }) {
  const sorted = sortKey && sortBy === sortKey;
  return (
    <th
      onClick={() => sortKey && onSort(sortKey)}
      style={{ textAlign: align, padding:"12px 14px", fontFamily:"Inter, sans-serif", fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid var(--border)", background:"color-mix(in oklch, var(--ink) 2%, var(--surface))", cursor: sortKey ? "pointer" : "default", userSelect:"none", whiteSpace:"nowrap" }}
    >
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, color: sorted ? "var(--ink)" : undefined }}>
        {children}
        {sortKey && <span style={{ opacity: sorted ? 1 : 0.3, fontSize:9 }}>{sorted ? (dir==="asc"?"▲":"▼") : "▼"}</span>}
      </span>
    </th>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, hint, bar }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", display:"flex", flexDirection:"column", gap:6, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:bar }} />
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:30, fontWeight:500, color:"var(--ink)", lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)" }}>{hint}</div>
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function Pill({ label, active, count, onClick }) {
  return (
    <button onClick={onClick} style={{ height:38, padding:"0 13px", borderRadius:10, border:`1.5px solid ${active?"var(--primary)":"var(--border)"}`, background: active?"color-mix(in oklch, var(--primary) 14%, var(--surface))":"var(--surface)", color: active?"var(--primary)":"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight: active?600:500, cursor:"pointer", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap", transition:"all 140ms ease" }}>
      {label}
      {typeof count === "number" && (
        <span style={{ fontSize:10.5, padding:"1px 6px", borderRadius:8, background: active?"var(--primary)":"color-mix(in oklch, var(--ink) 8%, transparent)", color: active?"white":"var(--muted)", fontWeight:600 }}>{count}</span>
      )}
    </button>
  );
}

function SkeletonRow() {
  const c = (w) => <div style={{ height:13, borderRadius:6, background:"color-mix(in oklch, var(--ink) 7%, transparent)", width:w }} />;
  return (
    <tr style={{ borderBottom:"1px solid var(--border)" }}>
      {[56,100,90,50,80,90,90,80,90].map((w,i) => (
        <td key={i} style={{ padding:"16px 14px" }}>{c(`${w}px`)}</td>
      ))}
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientsPage({ patients = [], loading = false, error = null, onViewOwner, onViewPet, onAddPatient }) {
  const [search,      setSearch]      = useState("");
  const [specFilter,  setSpecFilter]  = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [sortBy,      setSortBy]      = useState("name");
  const [dir,         setDir]         = useState("asc");
  const [hovered,     setHovered]     = useState(null);

  // Enrich with derived fields
  const enriched = useMemo(() =>
    patients.map(p => ({
      ...p,
      healthStatus: deriveHealthStatus(p),
      vaccine:      deriveNextVaccine(p),
      age:          calcAge(p.birth_date, p.birth_date_is_estimated),
    })),
    [patients]
  );

  const specCounts = useMemo(() => {
    const counts = { all: enriched.length };
    enriched.forEach(p => { counts[p.type_code] = (counts[p.type_code] || 0) + 1; });
    return counts;
  }, [enriched]);

  const healthCounts = useMemo(() => ({
    all:             enriched.length,
    healthy:         enriched.filter(p => p.healthStatus === "healthy").length,
    needs_attention: enriched.filter(p => p.healthStatus === "needs_attention").length,
    critical:        enriched.filter(p => p.healthStatus === "critical").length,
  }), [enriched]);

  const rows = useMemo(() => {
    let list = enriched.slice();
    if (specFilter !== "all")   list = list.filter(p => p.type_code === specFilter);
    if (healthFilter !== "all") list = list.filter(p => p.healthStatus === healthFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        `${p.owner_first_name} ${p.owner_last_name}`.toLowerCase().includes(q) ||
        (p.breed || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = sortBy === "owner" ? `${a.owner_first_name} ${a.owner_last_name}` : (a[sortBy] ?? "");
      const bv = sortBy === "owner" ? `${b.owner_first_name} ${b.owner_last_name}` : (b[sortBy] ?? "");
      return (String(av).localeCompare(String(bv))) * (dir === "asc" ? 1 : -1);
    });
    return list;
  }, [enriched, search, specFilter, healthFilter, sortBy, dir]);

  const onSort = key => { if (sortBy === key) setDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(key); setDir("asc"); } };

  const ghostBtn = { height:30, padding:"0 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" };
  const iconBtn  = { width:30, height:30, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--muted)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };

  // Unique species present in data
  const speciesInData = [...new Set(patients.map(p => p.type_code))];

  return (
    <div style={{ padding:"32px 28px 80px", maxWidth:1440, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Clinic › Animals</div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:38, fontWeight:500, color:"var(--ink)", margin:0, letterSpacing:"-0.015em", lineHeight:1.05 }}>Patients</h1>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:14.5, color:"var(--muted)", margin:"8px 0 0", lineHeight:1.5 }}>Every furry, feathered, and scaly patient in our care.</p>
        </div>
        <button onClick={onAddPatient} style={{ height:44, padding:"0 18px", borderRadius:12, background:"var(--primary)", color:"white", border:"none", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 22px -10px var(--primary)", whiteSpace:"nowrap", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Patient
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, background:"oklch(0.96 0.03 30)", border:"1px solid oklch(0.88 0.06 30)", color:"oklch(0.45 0.16 30)", fontFamily:"Inter, sans-serif", fontSize:14 }}>
          Could not load patients: {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:22 }}>
        <StatCard label="Total patients"   value={loading?"—":enriched.length}                bar="var(--primary)"          hint="registered animals" />
        <StatCard label="Healthy"          value={loading?"—":healthCounts.healthy}            bar="oklch(0.65 0.13 150)"    hint="all vitals normal" />
        <StatCard label="Needs attention"  value={loading?"—":healthCounts.needs_attention}    bar="oklch(0.72 0.14 75)"     hint="follow-up required" />
        <StatCard label="Critical"         value={loading?"—":healthCounts.critical}           bar="oklch(0.6 0.18 25)"      hint="immediate care needed" />
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {/* Row 1: search + count */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, height:40, padding:"0 14px", background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:12, flex:1, maxWidth:360 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, breed, owner…" style={{ flex:1, border:"none", outline:"none", background:"transparent", fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)" }} />
          </div>
          <div style={{ flex:1 }} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>
            {loading ? "Loading…" : `${rows.length} patient${rows.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Row 2: species + health filters */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:2 }}>Species</span>
          <Pill label="All"     count={specCounts.all}              active={specFilter==="all"}     onClick={()=>setSpecFilter("all")} />
          {speciesInData.map(sp => (
            <Pill key={sp} label={`${TYPE_EMOJI[sp]||"🐾"} ${sp.charAt(0).toUpperCase()+sp.slice(1)}s`} count={specCounts[sp]} active={specFilter===sp} onClick={()=>setSpecFilter(sp)} />
          ))}
          <div style={{ width:1, height:24, background:"var(--border)", margin:"0 6px" }} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:2 }}>Health</span>
          <Pill label="All"              count={healthCounts.all}             active={healthFilter==="all"}             onClick={()=>setHealthFilter("all")} />
          <Pill label="🟢 Healthy"       count={healthCounts.healthy}         active={healthFilter==="healthy"}         onClick={()=>setHealthFilter("healthy")} />
          <Pill label="🟡 Needs Attention" count={healthCounts.needs_attention} active={healthFilter==="needs_attention"} onClick={()=>setHealthFilter("needs_attention")} />
          <Pill label="🔴 Critical"      count={healthCounts.critical}        active={healthFilter==="critical"}        onClick={()=>setHealthFilter("critical")} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background:"var(--surface)", borderRadius:18, border:"1px solid var(--border)", overflow:"hidden", boxShadow:"0 8px 24px -16px oklch(0.3 0.08 40 / 0.2)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <TH sortKey="name"            sortBy={sortBy} dir={dir} onSort={onSort}>Patient</TH>
              <TH>Species & Breed</TH>
              <TH sortKey="birth_date"      sortBy={sortBy} dir={dir} onSort={onSort}>Age</TH>
              <TH sortKey="owner"           sortBy={sortBy} dir={dir} onSort={onSort}>Owner</TH>
              <TH sortKey="healthStatus"    sortBy={sortBy} dir={dir} onSort={onSort}>Health</TH>
              <TH>Next Vaccine</TH>
              <TH sortKey="last_appointment" sortBy={sortBy} dir={dir} onSort={onSort}>Last Visit</TH>
              <TH sortKey="next_appointment" sortBy={sortBy} dir={dir} onSort={onSort}>Next Appt</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {loading && [0,1,2,3].map(i => <SkeletonRow key={i} />)}

            {!loading && rows.map(p => {
              const _tc = TYPE_COLOR[p.type_code] || TYPE_COLOR.other;
              return (
                <tr key={p.id}
                  onMouseEnter={()=>setHovered(p.id)}
                  onMouseLeave={()=>setHovered(null)}
                  style={{ background: hovered===p.id ? "color-mix(in oklch, var(--primary) 5%, transparent)" : "transparent", transition:"background 120ms ease", borderBottom:"1px solid var(--border)" }}
                >
                  {/* Patient name + SVG avatar */}
                  <td style={{ padding:"14px 14px", minWidth:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <PetAvatarSVG species={p.type_code} size={44} />
                        <div style={{ position:"absolute", bottom:-2, right:-2, width:18, height:18, borderRadius:"50%", background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, border:"2px solid var(--surface)", boxShadow:"0 1px 3px oklch(0.3 0.08 40 / 0.25)" }}>
                          {TYPE_EMOJI[p.type_code]||"🐾"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, color:"var(--ink)", whiteSpace:"nowrap" }}>{p.name}</div>
                        {p.latest_measurement?.weight_kg && (
                          <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"var(--muted)", marginTop:1 }}>{p.latest_measurement.weight_kg}kg</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Species & breed */}
                  <td style={{ padding:"14px 14px" }}>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)", fontWeight:500 }}>{p.type_name}</div>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)", marginTop:2 }}>{p.breed || "Mixed / Unknown"}</div>
                  </td>

                  {/* Age */}
                  <td style={{ padding:"14px 14px" }}>
                    <span style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)", fontWeight:500 }}>{p.age}</span>
                    {p.birth_date_is_estimated && (
                      <span title="Estimated birth date" style={{ marginLeft:4, fontSize:11, color:"var(--muted)" }}>est.</span>
                    )}
                  </td>

                  {/* Owner — clickable */}
                  <td style={{ padding:"14px 14px" }}>
                    <button
                      onClick={() => onViewOwner?.(p.owner_user_name)}
                      style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--primary)", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0, textDecoration:"none" }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
                      onMouseLeave={e => e.currentTarget.style.textDecoration="none"}
                    >
                      {p.owner_first_name} {p.owner_last_name}
                    </button>
                  </td>

                  {/* Health status */}
                  <td style={{ padding:"14px 14px" }}>
                    <HealthBadge status={p.healthStatus} />
                  </td>

                  {/* Next vaccine */}
                  <td style={{ padding:"14px 14px" }}>
                    <VaccineBadge vaccine={p.vaccine} />
                  </td>

                  {/* Last visit */}
                  <td style={{ padding:"14px 14px" }}>
                    {p.last_appointment ? (
                      <>
                        <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--ink)", fontWeight:500 }}>{relDays(p.last_appointment)}</div>
                        <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"var(--muted)", marginTop:1 }}>{fmtDate(p.last_appointment)}</div>
                      </>
                    ) : (
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)", fontStyle:"italic" }}>No visits</span>
                    )}
                  </td>

                  {/* Next appointment */}
                  <td style={{ padding:"14px 14px" }}>
                    {p.next_appointment ? (
                      <>
                        <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--ink)", fontWeight:500 }}>{relDays(p.next_appointment)}</div>
                        <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"var(--muted)", marginTop:1 }}>{fmtDate(p.next_appointment)}</div>
                      </>
                    ) : (
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)", fontStyle:"italic" }}>None</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding:"14px 14px", textAlign:"right" }}>
                    <div style={{ display:"inline-flex", gap:5 }}>
                      <button onClick={() => onViewPet?.(p)} style={ghostBtn}>View</button>
                      <button style={iconBtn} title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      <button style={{ ...iconBtn, color:"var(--primary)", borderColor:"color-mix(in oklch, var(--primary) 40%, var(--border))" }} title="Book Appointment">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan={9} style={{ padding:"48px 16px", textAlign:"center", fontFamily:"Inter, sans-serif", color:"var(--muted)" }}>
                No patients match your search or filter.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
