import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";

const ROLES = ["admin", "vet", "coordinator"];
const ROLE_LABELS = { admin: "Administrator", vet: "Veterinarian", coordinator: "Coordinator", customer: "Customer" };
const ROLE_COLORS = {
  admin:       { bg: "oklch(0.94 0.05 30)",  color: "oklch(0.45 0.18 30)" },
  vet:         { bg: "oklch(0.93 0.06 260)", color: "oklch(0.40 0.18 260)" },
  coordinator: { bg: "oklch(0.93 0.05 145)", color: "oklch(0.40 0.16 145)" },
  customer:    { bg: "oklch(0.94 0.02 240)", color: "oklch(0.45 0.08 240)" },
};

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || { bg: "oklch(0.93 0.02 0)", color: "oklch(0.45 0.02 0)" };
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11.5, fontWeight:600, fontFamily:"Inter, sans-serif", letterSpacing:"0.03em", background:s.bg, color:s.color }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ user_name:"", first_name:"", last_name:"", gender:1, city:"", telephone:"", role:"coordinator" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const data = await apiFetch("/users/add", { method:"POST", body: form });
      setResult(data);
      onCreated?.();
    } catch (err) {
      setError(err.responseData?.error || err.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width:"100%", height:40, borderRadius:10, border:"1px solid var(--border)", padding:"0 12px", fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)", background:"var(--surface)", boxSizing:"border-box" };
  const labelStyle = { fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase", display:"block", marginBottom:5 };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"oklch(0.25 0.025 50 / 0.35)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"var(--surface)", borderRadius:22, boxShadow:"0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", padding:32, border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:24, fontWeight:500, color:"var(--ink)", margin:0 }}>Add Staff Member</h2>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ink)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {result ? (
          <div>
            <div style={{ padding:"16px 20px", borderRadius:14, background:"oklch(0.93 0.06 145)", border:"1px solid oklch(0.85 0.09 145)", marginBottom:20 }}>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, color:"oklch(0.38 0.16 145)", marginBottom:6 }}>User created successfully</div>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"oklch(0.38 0.16 145)" }}>
                <strong>Username:</strong> {result.user_name}<br/>
                <strong>Temporary password:</strong> <code style={{ background:"oklch(0.88 0.07 145)", padding:"2px 6px", borderRadius:6 }}>{result.temporary_password}</code>
              </div>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"oklch(0.45 0.12 145)", marginTop:8 }}>
                Share these credentials with the staff member. They should change their password on first login.
              </div>
            </div>
            <button onClick={onClose} style={{ width:"100%", height:42, borderRadius:12, border:"none", background:"var(--primary)", color:"white", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input style={inputStyle} value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input style={inputStyle} value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Username</label>
              <input style={inputStyle} value={form.user_name} onChange={e => set("user_name", e.target.value)} required autoComplete="off" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={form.city} onChange={e => set("city", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={form.telephone} onChange={e => set("telephone", e.target.value)} required />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={{ ...inputStyle }} value={form.role} onChange={e => set("role", e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select style={{ ...inputStyle }} value={form.gender} onChange={e => set("gender", Number(e.target.value))}>
                  <option value={1}>Male</option>
                  <option value={2}>Female</option>
                </select>
              </div>
            </div>
            {error && <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"oklch(0.45 0.18 30)", marginBottom:14, padding:"10px 14px", borderRadius:10, background:"oklch(0.95 0.04 30)" }}>{error}</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button type="submit" disabled={saving} style={{ flex:1, height:42, borderRadius:12, border:"none", background:"var(--primary)", color:"white", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", opacity:saving ? 0.7 : 1 }}>
                {saving ? "Creating…" : "Create user"}
              </button>
              <button type="button" onClick={onClose} style={{ height:42, padding:"0 18px", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function RoleSelect({ user, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState(user.roles?.[0] || "customer");

  const handleChange = async (newRole) => {
    setRole(newRole);
    setSaving(true);
    try {
      await apiFetch(`/users/${user.user_name}/role`, { method:"PATCH", body:{ role: newRole } });
      onChanged?.();
    } catch {
      setRole(user.roles?.[0] || "customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={role}
      disabled={saving}
      onChange={e => handleChange(e.target.value)}
      style={{ height:32, borderRadius:8, border:"1px solid var(--border)", padding:"0 8px", fontFamily:"Inter, sans-serif", fontSize:12.5, color:"var(--ink)", background:"var(--surface)", opacity:saving ? 0.6 : 1, cursor:"pointer" }}
    >
      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </select>
  );
}

export default function UserManagementPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiFetch("/users/all")
      .then(data => { setUsers(Array.isArray(data) ? data : []); setError(null); })
      .catch(err  => setError(err.message || "Failed to load users"))
      .finally(()  => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.user_name.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 28px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:32, fontWeight:500, color:"var(--ink)", margin:0, letterSpacing:"-0.01em" }}>User Management</h1>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--muted)", margin:"6px 0 0" }}>
            {loading ? "Loading…" : `${users.length} users`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display:"flex", alignItems:"center", gap:8, height:42, padding:"0 20px", borderRadius:12, border:"none", background:"var(--primary)", color:"white", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", boxShadow:"0 6px 18px -8px var(--primary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add staff member
        </button>
      </div>

      <div style={{ marginBottom:20 }}>
        <input
          placeholder="Search by name or username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:320, height:40, borderRadius:12, border:"1px solid var(--border)", padding:"0 14px", fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--ink)", background:"var(--surface)" }}
        />
      </div>

      {error && (
        <div style={{ padding:"14px 18px", borderRadius:12, background:"oklch(0.95 0.04 30)", color:"oklch(0.45 0.18 30)", fontFamily:"Inter, sans-serif", fontSize:14, marginBottom:20 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--muted)", padding:"40px 0", textAlign:"center" }}>Loading users…</div>
      ) : (
        <div style={{ background:"var(--surface)", borderRadius:16, border:"1px solid var(--border)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"color-mix(in oklch, var(--ink) 2%, var(--surface))" }}>
                {["Name", "Username", "City", "Phone", "Role", "Joined", "Change role"].map(h => (
                  <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.user_name} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in oklch, var(--ink) 2%, var(--surface))"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding:"13px 16px", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, color:"var(--ink)", whiteSpace:"nowrap" }}>
                    {u.first_name} {u.last_name}
                  </td>
                  <td style={{ padding:"13px 16px", fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>{u.user_name}</td>
                  <td style={{ padding:"13px 16px", fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--ink)" }}>{u.city || "—"}</td>
                  <td style={{ padding:"13px 16px", fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--ink)" }}>{u.telephone || "—"}</td>
                  <td style={{ padding:"13px 16px" }}>
                    {(u.roles || []).map(r => <RoleBadge key={r} role={r} />)}
                  </td>
                  <td style={{ padding:"13px 16px", fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--muted)" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" }) : "—"}
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <RoleSelect user={u} onChanged={fetchUsers} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding:"40px 16px", textAlign:"center", fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--muted)", fontStyle:"italic" }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={fetchUsers} />}
    </div>
  );
}
