import React, { useState, useMemo } from "react";
import { apiFetch } from "../api";

const SPECIES = [
  { code: "dog",    label: "Dog",    emoji: "🐕" },
  { code: "cat",    label: "Cat",    emoji: "🐱" },
  { code: "rabbit", label: "Rabbit", emoji: "🐰" },
  { code: "parrot", label: "Parrot", emoji: "🦜" },
];

const BREEDS = {
  dog:    [{ id: 1, name: "Labrador Retriever" }, { id: 2, name: "German Shepherd" }, { id: 3, name: "Border Collie" }],
  cat:    [{ id: 4, name: "Bengal" }, { id: 5, name: "Siamese" }, { id: 6, name: "Persian" }],
  rabbit: [{ id: 7, name: "Holland Lop" }],
  parrot: [{ id: 8, name: "African Grey" }],
};

const FIELD_STYLE = {
  width: "100%", height: 40, padding: "0 12px", borderRadius: 10,
  border: "1.5px solid var(--border)", background: "var(--surface)",
  fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink)",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--primary)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddPatientModal({ onClose, onCreated, owners = [] }) {
  const [ownerSearch,       setOwnerSearch]       = useState("");
  const [selectedOwner,     setSelectedOwner]     = useState(null);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [form, setForm] = useState({
    name: "", pet_type_code: "", breed_id: "", birth_date: "", birth_date_is_estimated: false,
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    const list = q
      ? owners.filter(o =>
          `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
          o.user_name.toLowerCase().includes(q)
        )
      : owners;
    return list.slice(0, 8);
  }, [owners, ownerSearch]);

  const breeds = BREEDS[form.pet_type_code] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOwner) { setError("Please select a pet owner."); return; }
    if (!form.pet_type_code) { setError("Please select a species."); return; }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/pets/add", {
        method: "POST",
        body: {
          owner_user_name:         selectedOwner.user_name,
          name:                    form.name,
          pet_type_code:           form.pet_type_code,
          breed_id:                form.breed_id ? parseInt(form.breed_id) : null,
          birth_date:              form.birth_date || null,
          birth_date_is_estimated: form.birth_date_is_estimated,
        },
      });
      setSuccess(true);
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.25 0.025 50 / 0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: 22, boxShadow: "0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", padding: 32, border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Clinic › Animals</div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 500, color: "var(--ink)", margin: "6px 0 0", letterSpacing: "-0.01em" }}>New Patient</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {success ? (
          /* Success state */
          <div>
            <div style={{ padding: "16px 20px", borderRadius: 14, background: "color-mix(in oklch, oklch(0.75 0.13 150) 14%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.75 0.13 150) 30%, transparent)", marginBottom: 20 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "oklch(0.35 0.12 150)" }}>Patient added!</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "oklch(0.4 0.1 150)", marginTop: 4 }}>
                <strong>{form.name}</strong> has been added to {selectedOwner.first_name} {selectedOwner.last_name}'s profile.
              </div>
            </div>
            <button onClick={onClose} style={{ width: "100%", height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 22px -10px var(--primary)" }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Owner selector */}
            <Field label="Pet Owner" required>
              <div style={{ position: "relative" }}>
                {selectedOwner ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, padding: "0 12px", borderRadius: 10, border: "1.5px solid var(--primary)", background: "color-mix(in oklch, var(--primary) 8%, var(--surface))" }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                      {selectedOwner.first_name} {selectedOwner.last_name}
                      <span style={{ color: "var(--muted)", fontWeight: 400 }}> · @{selectedOwner.user_name}</span>
                    </span>
                    <button type="button" onClick={() => { setSelectedOwner(null); setOwnerSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={ownerSearch}
                      onChange={e => { setOwnerSearch(e.target.value); setShowOwnerDropdown(true); }}
                      onFocus={() => setShowOwnerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowOwnerDropdown(false), 150)}
                      placeholder="Search by name or username…"
                      style={FIELD_STYLE}
                    />
                    {showOwnerDropdown && filteredOwners.length > 0 && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px -8px oklch(0.3 0.08 40 / 0.2)", zIndex: 10, overflow: "hidden" }}>
                        {filteredOwners.map(o => (
                          <div
                            key={o.id}
                            onMouseDown={() => { setSelectedOwner(o); setOwnerSearch(""); setShowOwnerDropdown(false); }}
                            style={{ padding: "10px 14px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 80ms" }}
                            onMouseEnter={e => e.currentTarget.style.background = "color-mix(in oklch, var(--primary) 6%, transparent)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span><strong>{o.first_name} {o.last_name}</strong></span>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>@{o.user_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showOwnerDropdown && filteredOwners.length === 0 && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", zIndex: 10 }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>No owners found — create the owner first.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Field>

            {/* Pet name */}
            <Field label="Pet name" required>
              <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Buddy" style={FIELD_STYLE} />
            </Field>

            {/* Species */}
            <Field label="Species" required>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SPECIES.map(s => (
                  <label key={s.code} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", height: 40, padding: "0 14px", borderRadius: 10, border: `1.5px solid ${form.pet_type_code === s.code ? "var(--primary)" : "var(--border)"}`, background: form.pet_type_code === s.code ? "color-mix(in oklch, var(--primary) 10%, var(--surface))" : "var(--surface)", transition: "all 120ms ease" }}>
                    <input type="radio" name="species" value={s.code} checked={form.pet_type_code === s.code} onChange={() => { set("pet_type_code", s.code); set("breed_id", ""); }} style={{ display: "none" }} />
                    <span style={{ fontSize: 18 }}>{s.emoji}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500, color: form.pet_type_code === s.code ? "var(--primary)" : "var(--ink)" }}>{s.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            {/* Breed — only when species is selected */}
            {form.pet_type_code && (
              <Field label="Breed">
                <select value={form.breed_id} onChange={e => set("breed_id", e.target.value)} style={{ ...FIELD_STYLE, cursor: "pointer" }}>
                  <option value="">Mixed / Unknown</option>
                  {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
            )}

            {/* Birth date + estimated toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "end" }}>
              <Field label="Date of birth">
                <input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} style={FIELD_STYLE} />
              </Field>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, cursor: "pointer", userSelect: "none" }}
                   onClick={() => set("birth_date_is_estimated", !form.birth_date_is_estimated)}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.birth_date_is_estimated ? "var(--primary)" : "var(--border)"}`, background: form.birth_date_is_estimated ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 120ms ease" }}>
                  {form.birth_date_is_estimated && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                  )}
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)" }}>Estimated</span>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 30)", border: "1px solid oklch(0.88 0.06 30)", color: "oklch(0.45 0.16 30)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={saving} style={{ flex: 1, height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 8px 22px -10px var(--primary)" }}>
                {saving ? "Saving…" : "Add Patient"}
              </button>
              <button type="button" onClick={onClose} style={{ height: 42, padding: "0 18px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
