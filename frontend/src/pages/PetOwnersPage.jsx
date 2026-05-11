import React, { useState, useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components -- helper intentionally co-located
export function formatDateLong(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeDate(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff/7)}wk ago`;
  if (diff < 365) return `${Math.floor(diff/30)}mo ago`;
  return `${Math.floor(diff/365)}yr ago`;
}

// Derive a status from what the API gives us (no dedicated status field in DB).
function deriveStatus(lastAppointment, createdAt) {
  if (lastAppointment) {
    const days = Math.floor((Date.now() - new Date(lastAppointment)) / 86400000);
    return days <= 90 ? "active" : "overdue";
  }
  const daysSinceJoined = Math.floor((Date.now() - new Date(createdAt)) / 86400000);
  return daysSinceJoined <= 30 ? "new" : "active";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    active:  { bg: "color-mix(in oklch, oklch(0.75 0.13 150) 22%, transparent)", color: "oklch(0.4 0.13 150)",  label: "Active"  },
    overdue: { bg: "color-mix(in oklch, oklch(0.75 0.16 30)  22%, transparent)", color: "oklch(0.45 0.16 30)",  label: "Overdue" },
    new:     { bg: "color-mix(in oklch, var(--primary) 18%, transparent)",        color: "var(--primary)",       label: "New"     },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, padding:"3px 9px", borderRadius:999, background:s.bg, color:s.color }}>
      <span style={{ width:6, height:6, borderRadius:3, background:"currentColor" }} />
      {s.label}
    </span>
  );
}

function Avatar({ firstName, lastName }) {
  const hash = [...(firstName+lastName)].reduce((a,c) => a+c.charCodeAt(0), 0);
  return (
    <div style={{ width:38, height:38, borderRadius:"50%", background:`oklch(0.85 0.07 ${50+(hash%60)-30})`, color:"oklch(0.32 0.08 30)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, flexShrink:0 }}>
      {(firstName[0]+lastName[0]).toUpperCase()}
    </div>
  );
}

function PetCountBadge({ count }) {
  if (count === 0) return <span style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>None</span>;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"color-mix(in oklch, var(--accent) 50%, var(--surface))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🐾</div>
      <span style={{ fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:500, color:"var(--ink)" }}>{count} {count === 1 ? "pet" : "pets"}</span>
    </div>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, height:40, padding:"0 14px", background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:12, minWidth:280 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search by name, phone, city…" style={{ flex:1, border:"none", outline:"none", background:"transparent", fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)" }} />
    </div>
  );
}

function FilterPill({ label, active, count, onClick }) {
  return (
    <button onClick={onClick} style={{ height:40, padding:"0 14px", borderRadius:12, border:`1.5px solid ${active?"var(--primary)":"var(--border)"}`, background:active?"color-mix(in oklch, var(--primary) 14%, var(--surface))":"var(--surface)", color:active?"var(--primary)":"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:active?600:500, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all 140ms ease" }}>
      {label}
      {typeof count === "number" && (
        <span style={{ fontSize:11, padding:"1px 7px", borderRadius:10, background:active?"var(--primary)":"color-mix(in oklch, var(--ink) 8%, transparent)", color:active?"white":"var(--muted)", fontWeight:600 }}>{count}</span>
      )}
    </button>
  );
}

function TH({ children, sortKey, sortBy, dir, onSort }) {
  const sorted = sortBy === sortKey;
  return (
    <th onClick={() => onSort && onSort(sortKey)} style={{ textAlign:"left", padding:"14px 16px", fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid var(--border)", background:"color-mix(in oklch, var(--ink) 2%, var(--surface))", cursor:onSort?"pointer":"default", userSelect:"none", whiteSpace:"nowrap" }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, color:sorted?"var(--ink)":undefined }}>
        {children}
        {onSort && <span style={{ opacity:sorted?1:0.35, fontSize:10 }}>{sorted?(dir==="asc"?"▲":"▼"):"▼"}</span>}
      </span>
    </th>
  );
}

function StatCard({ label, value, hint, tone="primary" }) {
  const bar = { primary:"var(--primary)", green:"oklch(0.65 0.13 150)", accent:"var(--accent)", warn:"oklch(0.7 0.16 30)" }[tone] || "var(--primary)";
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", display:"flex", flexDirection:"column", gap:6, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:bar }} />
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:32, fontWeight:500, color:"var(--ink)", lineHeight:1, letterSpacing:"-0.01em" }}>{value}</div>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)" }}>{hint}</div>
    </div>
  );
}

function SkeletonRow() {
  const cell = (w) => (
    <div style={{ height:14, borderRadius:7, background:"color-mix(in oklch, var(--ink) 7%, transparent)", width:w, animation:"lc-fade 1.4s ease infinite alternate" }} />
  );
  return (
    <tr style={{ borderBottom:"1px solid var(--border)" }}>
      <td style={{ padding:"18px 16px" }}><div style={{ display:"flex", gap:12, alignItems:"center" }}><div style={{ width:38, height:38, borderRadius:"50%", background:"color-mix(in oklch, var(--ink) 8%, transparent)" }}/>{cell("120px")}</div></td>
      <td style={{ padding:"18px 16px" }}>{cell("100px")}</td>
      <td style={{ padding:"18px 16px" }}>{cell("60px")}</td>
      <td style={{ padding:"18px 16px" }}>{cell("80px")}</td>
      <td style={{ padding:"18px 16px" }}>{cell("55px")}</td>
      <td style={{ padding:"18px 16px", textAlign:"right" }}>{cell("80px")}</td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PetOwnersPage({ owners = [], loading = false, error = null, onView, onAddOwner }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [dir, setDir]       = useState("desc");
  const [hovered, setHovered] = useState(null);

  // Enrich each owner with derived status
  const enriched = useMemo(() =>
    owners.map(o => ({ ...o, status: deriveStatus(o.last_appointment, o.created_at) })),
    [owners]
  );

  const counts = useMemo(() => ({
    all:     enriched.length,
    active:  enriched.filter(o => o.status === "active").length,
    new:     enriched.filter(o => o.status === "new").length,
    overdue: enriched.filter(o => o.status === "overdue").length,
  }), [enriched]);

  const rows = useMemo(() => {
    let list = enriched.slice();
    if (filter !== "all") list = list.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
        (o.telephone || "").includes(q) ||
        (o.city || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = sortBy === "name" ? `${a.first_name} ${a.last_name}` : sortBy === "pets" ? a.pet_count : (a[sortBy] ?? "");
      const bv = sortBy === "name" ? `${b.first_name} ${b.last_name}` : sortBy === "pets" ? b.pet_count : (b[sortBy] ?? "");
      return (av < bv ? -1 : av > bv ? 1 : 0) * (dir === "asc" ? 1 : -1);
    });
    return list;
  }, [enriched, search, filter, sortBy, dir]);

  const onSort = key => { if (sortBy === key) setDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(key); setDir("desc"); } };

  const ghostBtn = { height:32, padding:"0 14px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:12.5, fontWeight:600, cursor:"pointer" };
  const iconBtn  = { width:32, height:32, borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--muted)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };

  return (
    <div style={{ padding:"32px 28px 80px", maxWidth:1440, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Clinic › People</div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:38, fontWeight:500, color:"var(--ink)", margin:0, letterSpacing:"-0.015em", lineHeight:1.05 }}>Pet Owners</h1>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:14.5, color:"var(--muted)", margin:"8px 0 0", lineHeight:1.5 }}>Everyone who's brought a furry, feathered, or scaly friend through our doors.</p>
        </div>
        <button onClick={onAddOwner} style={{ height:44, padding:"0 18px", borderRadius:12, background:"var(--primary)", color:"white", border:"none", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 22px -10px var(--primary)", whiteSpace:"nowrap", flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Owner
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, background:"oklch(0.96 0.03 30)", border:"1px solid oklch(0.88 0.06 30)", color:"oklch(0.45 0.16 30)", fontFamily:"Inter, sans-serif", fontSize:14 }}>
          Could not load owners: {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:22 }}>
        <StatCard label="Total owners"      value={loading ? "—" : counts.all}     hint="registered in the system"    tone="primary" />
        <StatCard label="Active"            value={loading ? "—" : counts.active}  hint="visited within 90 days"      tone="green"   />
        <StatCard label="New this month"    value={loading ? "—" : counts.new}     hint="recently joined"             tone="accent"  />
        <StatCard label="Overdue checkups"  value={loading ? "—" : counts.overdue} hint="no visit in over 90 days"    tone="warn"    />
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <SearchInput value={search} onChange={setSearch} />
        <div style={{ display:"flex", gap:6 }}>
          <FilterPill label="All"     count={counts.all}     active={filter==="all"}     onClick={()=>setFilter("all")}     />
          <FilterPill label="Active"  count={counts.active}  active={filter==="active"}  onClick={()=>setFilter("active")}  />
          <FilterPill label="New"     count={counts.new}     active={filter==="new"}     onClick={()=>setFilter("new")}     />
          <FilterPill label="Overdue" count={counts.overdue} active={filter==="overdue"} onClick={()=>setFilter("overdue")} />
        </div>
        <div style={{ flex:1 }} />
        <span style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>
          {loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "owner" : "owners"}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ background:"var(--surface)", borderRadius:18, border:"1px solid var(--border)", overflow:"hidden", boxShadow:"0 8px 24px -16px oklch(0.3 0.08 40 / 0.2)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <TH sortKey="name"             sortBy={sortBy} dir={dir} onSort={onSort}>Owner</TH>
              <TH>Contact</TH>
              <TH sortKey="pets"             sortBy={sortBy} dir={dir} onSort={onSort}>Pets</TH>
              <TH sortKey="last_appointment" sortBy={sortBy} dir={dir} onSort={onSort}>Last visit</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {loading && [0,1,2,3,4].map(i => <SkeletonRow key={i} />)}

            {!loading && rows.map(o => (
              <tr key={o.id}
                onMouseEnter={() => setHovered(o.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ background: hovered===o.id ? "color-mix(in oklch, var(--primary) 5%, transparent)" : "transparent", transition:"background 120ms ease", borderBottom:"1px solid var(--border)" }}
              >
                <td style={{ padding:"14px 16px", minWidth:200 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <Avatar firstName={o.first_name} lastName={o.last_name} />
                    <div style={{ lineHeight:1.3 }}>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, color:"var(--ink)", whiteSpace:"nowrap" }}>{o.first_name} {o.last_name}</div>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)", marginTop:2 }}>@{o.user_name}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)" }}>{o.telephone || "—"}</div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--muted)", marginTop:2 }}>{o.city || "—"}</div>
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <PetCountBadge count={o.pet_count} />
                </td>
                <td style={{ padding:"14px 16px" }}>
                  {o.last_appointment ? (
                    <>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)", fontWeight:500 }}>{relativeDate(o.last_appointment)}</div>
                      <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--muted)", marginTop:2 }}>{formatDateLong(o.last_appointment)}</div>
                    </>
                  ) : (
                    <span style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)", fontStyle:"italic" }}>No visits yet</span>
                  )}
                </td>
                <td style={{ padding:"14px 16px" }}>
                  <StatusBadge status={o.status} />
                </td>
                <td style={{ padding:"14px 16px", textAlign:"right" }}>
                  <div style={{ display:"inline-flex", gap:6 }}>
                    <button onClick={() => onView(o)} style={ghostBtn}>View</button>
                    <button style={iconBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan={6} style={{ padding:"48px 16px", textAlign:"center", fontFamily:"Inter, sans-serif", color:"var(--muted)" }}>
                No owners match your search.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
